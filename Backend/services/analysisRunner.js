import Email from "../Models/Email.js";
import { analyzeEmail } from "./emailAI.js";

export const CLASSES = ["assistant_reply", "client_reply", "no_reply"];
export const LABELS = ["important", "meeting", "waiting", "follow_up"];

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Never trust LLM output: whitelist enums, cap lengths, validate dates. */
export function sanitize(raw) {
  const classification = CLASSES.includes(raw?.classification) ? raw.classification : "assistant_reply";
  const labels = [...new Set((Array.isArray(raw?.labels) ? raw.labels : []).filter((l) => LABELS.includes(l)))];

  const actionItems = (Array.isArray(raw?.actionItems) ? raw.actionItems : [])
    .slice(0, 10)
    .map((a) => {
      const text = str(a?.text, 200);
      if (!text) return null;
      const d = a?.dueDate ? new Date(a.dueDate) : null;
      return { text, ...(d && !isNaN(d) ? { dueDate: d } : {}) };
    })
    .filter(Boolean);

  const draftBody = str(raw?.draft?.body, 5000);
  const draft =
    classification !== "no_reply" && draftBody
      ? { subject: str(raw.draft.subject, 200), body: draftBody }
      : null;

  return {
    classification,
    reasoning: str(raw?.reasoning, 300),
    labels,
    summary: str(raw?.summary, 500),
    actionItems,
    draft,
  };
}

/**
 * Run the AI pipeline on one email document and save the result.
 * `email.client` must be populated (we need the client's name).
 * Respects human corrections: if the assistant/client already changed the
 * classification, a re-run updates the AI's opinion but not their decision.
 */
export async function runAnalysis(email, { force = false } = {}) {
  if (email.aiStatus === "done" && !force) return email;

  let result;
  try {
    result = await analyzeEmail(email, email.client?.name || "the client");
  } catch (err) {
    email.aiStatus = "failed";
    await email.save();
    throw err;
  }

  const r = sanitize(result.data);
  const overridden = Boolean(email.classification) && email.classificationSource !== "ai";

  email.aiClassification = r.classification;
  email.aiReasoning = r.reasoning;
  email.summary = r.summary;

  if (!overridden) {
    email.classification = r.classification;
    email.classificationSource = "ai";
    email.labels = r.labels;
  }

  // keep "done" ticks for action items that are unchanged
  const doneTexts = new Set((email.actionItems || []).filter((a) => a.done).map((a) => a.text));
  email.actionItems = r.actionItems.map((a) => ({ ...a, done: doneTexts.has(a.text) }));

  // never overwrite a draft the assistant edited by hand
  if (r.draft && email.draft?.source !== "assistant") {
    email.draft = { ...r.draft, source: "ai", updatedAt: new Date() };
  }

  email.aiStatus = "done";
  email.aiProvider = result.provider;
  email.aiProcessedAt = new Date();
  await email.save();
  return email;
}

const running = new Set(); // simple in-process lock per assistant

/** Analyze pending emails in small batches (low concurrency keeps free-tier APIs happy). */
export async function analyzePending({ assistantId, clientId, limit = 20, concurrency = 2, retryFailed = false }) {
  const key = String(assistantId);
  if (running.has(key)) return { skipped: true };
  running.add(key);

  const totals = { processed: 0, done: 0, failed: 0 };
  const seen = []; // ids already attempted in this run, so a failing email is never retried in a loop
  try {
    for (let round = 0; round < 10; round++) {
      const filter = {
        assistant: assistantId,
        aiStatus: retryFailed ? { $in: ["pending", "failed"] } : "pending",
        _id: { $nin: seen },
      };
      if (clientId) filter.client = clientId;

      const emails = await Email.find(filter).sort({ receivedAt: -1 }).limit(limit).populate("client", "name");
      if (!emails.length) break;
      emails.forEach((e) => seen.push(e._id));

      let i = 0;
      const worker = async () => {
        while (i < emails.length) {
          const email = emails[i++];
          totals.processed++;
          try {
            await runAnalysis(email);
            totals.done++;
          } catch (err) {
            totals.failed++;
            console.warn(`[analyze] ${email._id} failed: ${String(err.message).slice(0, 200)}`);
          }
        }
      };
      await Promise.all(Array.from({ length: concurrency }, worker));
    }
  } finally {
    running.delete(key);
  }
  return totals;
}