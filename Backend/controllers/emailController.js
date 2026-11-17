import Email from "../Models/Email.js";
import { scopeFor, isId, escapeRegex } from "../utils/scope.js";
import { handle, fail } from "../utils/handle.js";
import { CLASSES, LABELS, runAnalysis, analyzePending } from "../services/analysisRunner.js";
import { draftReply, askAboutEmail, TONES } from "../services/emailAssist.js";

const STATUSES = ["open", "handled", "replied"];
const STATUS_FILTERS = [...STATUSES, "done"]; // "done" = handled or replied

/** Clients may only draft/send for emails that are theirs to answer; assistants can always. */
const clientCanReply = (email, user) =>
  user.role !== "client" || (email.classification === "client_reply" && email.status === "open");
const denyClient = (res, email) =>
  fail(res, 403, email.status !== "open" ? "This email is already closed" : "Your assistant is handling this email");
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ---------------------------------------------------------------- helpers
/** Strip assistant-only fields before anything is sent to a client user. */
const present = (doc, user) => {
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  if (user.role === "client") {
    delete o.aiReasoning;
    delete o.aiClassification;
    delete o.aiProvider;
    // a client sees drafts written for them and any reply that was sent, but not the assistant's unsent drafts
    if (!(o.status === "replied" || o.classification === "client_reply")) delete o.draft;
  }
  return o;
};

/** Loads ONE email the current user is allowed to see (or null). */
const findOwned = (req) =>
  Email.findOne({ _id: req.params.id, ...scopeFor(req.user) }).populate("client", "name email emailAccount");

const notFound = (res) => fail(res, 404, "Email not found");

const pushNote = (email, user, text) =>
  email.notes.push({ author: user._id, role: user.role, text, createdAt: new Date() });

// ---------------------------------------------------------------- assistant: list
export const listEmails = handle(async (req, res) => {
  const { client, classification, label, status, q, unread } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);

  const filter = { ...scopeFor(req.user) };

  if (client) {
    if (!isId(client)) return fail(res, 400, "Invalid client id");
    filter.client = client;
  }
  if (classification) {
    if (!CLASSES.includes(classification)) return fail(res, 400, "Invalid classification");
    filter.classification = classification;
  }
  if (label) {
    if (!LABELS.includes(label)) return fail(res, 400, "Invalid label");
    filter.labels = label;
  }
  if (status) {
    if (!STATUS_FILTERS.includes(status)) return fail(res, 400, "Invalid status");
    filter.status = status === "done" ? { $in: ["handled", "replied"] } : status;
  }
  if (unread === "true") filter.isRead = false;

  if (typeof q === "string" && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim().slice(0, 100)), "i");
    filter.$or = [{ subject: rx }, { summary: rx }, { body: rx }, { "from.name": rx }, { "from.email": rx }];
  }

  const [emails, total] = await Promise.all([
    Email.find(filter)
      .select("-body -notes -draft")
      .sort({ receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("client", "name emailAccount")
      .lean(),
    Email.countDocuments(filter),
  ]);

  res.json({ success: true, emails, total, page, pages: Math.ceil(total / limit) });
});

// ---------------------------------------------------------------- client: list
const CLIENT_TABS = {
  needs: { classification: "client_reply", status: "open" },      // waiting for the client
  assistant: { classification: "assistant_reply", status: "open" }, // the assistant is on it
  handled: { status: { $in: ["handled", "replied"] } },            // finished by either of them
  all: {},
};

export const listMyEmails = handle(async (req, res) => {
  const tab = req.query.tab || "needs";
  const tabFilter = CLIENT_TABS[tab];
  if (!tabFilter) return fail(res, 400, "Invalid tab");

  const emails = await Email.find({ ...scopeFor(req.user), ...tabFilter })
    .select("-body -draft -notes -aiReasoning -aiClassification -aiProvider")
    .sort({ receivedAt: -1 })
    .limit(100)
    .lean();

  res.json({ success: true, tab, emails });
});

// ---------------------------------------------------------------- counts (for badges / polling)
export const getCounts = handle(async (req, res) => {
  const scope = scopeFor(req.user);

  if (req.user.role === "client") {
    const [needs, withAssistant] = await Promise.all([
      Email.countDocuments({ ...scope, classification: "client_reply", status: "open" }),
      Email.countDocuments({ ...scope, classification: "assistant_reply", status: "open" }),
    ]);
    return res.json({ success: true, counts: { needs, withAssistant } });
  }

  const [assistantQueue, clientQueue, takeovers, unread, aiPending, aiFailed] = await Promise.all([
    Email.countDocuments({ ...scope, classification: "assistant_reply", status: "open" }),
    Email.countDocuments({ ...scope, classification: "client_reply", status: "open" }),
    Email.countDocuments({ ...scope, takeoverRequested: true, status: "open" }),
    Email.countDocuments({ ...scope, isRead: false }),
    Email.countDocuments({ ...scope, aiStatus: "pending" }),
    Email.countDocuments({ ...scope, aiStatus: "failed" }),
  ]);
  res.json({ success: true, counts: { assistantQueue, clientQueue, takeovers, unread, aiPending, aiFailed } });
});

// ---------------------------------------------------------------- detail
export const getEmail = handle(async (req, res) => {
  const email = await findOwned(req).populate("notes.author", "name role");
  if (!email) return notFound(res);

  if (!email.isRead) {
    await Email.updateOne({ _id: email._id }, { isRead: true });
    email.isRead = true;
  }
  res.json({ success: true, email: present(email, req.user) });
});

// ---------------------------------------------------------------- AI: analyze
export const analyzeOne = handle(async (req, res) => {
  const email = await findOwned(req);
  if (!email) return notFound(res);

  const force = req.query.force === "true";
  const cached = email.aiStatus === "done" && !force;
  if (!cached) await runAnalysis(email, { force });

  res.json({ success: true, cached, email: present(email, req.user) });
});

export const analyzePendingNow = handle(async (req, res) => {
  const retryFailed = req.query.retryFailed === "true";
  const result = await analyzePending({ assistantId: req.user._id, retryFailed });
  res.json({ success: true, ...result });
});

// ---------------------------------------------------------------- assistant: classification
export const updateClassification = handle(async (req, res) => {
  const { classification, labels } = req.body || {};
  if (classification === undefined && labels === undefined) return fail(res, 400, "Nothing to update");

  const email = await findOwned(req);
  if (!email) return notFound(res);

  if (classification !== undefined) {
    if (!CLASSES.includes(classification)) return fail(res, 400, "Invalid classification");
    email.classification = classification;
    // back to the AI's own answer = not a correction
    email.classificationSource = classification === email.aiClassification ? "ai" : "assistant";
    email.takeoverRequested = false; // assistant has acted on any take-over request
  }

  if (labels !== undefined) {
    if (!Array.isArray(labels) || !labels.every((l) => LABELS.includes(l))) return fail(res, 400, "Invalid labels");
    email.labels = [...new Set(labels)];
  }

  await email.save();
  res.json({ success: true, email: present(email, req.user) });
});

// ---------------------------------------------------------------- assistant: drafts
export const saveDraft = handle(async (req, res) => {
  const body = str(req.body?.body, 5000);
  if (!body) return fail(res, 400, "Draft body is required");

  const email = await findOwned(req);
  if (!email) return notFound(res);
  if (!clientCanReply(email, req.user)) return denyClient(res, email);

  email.draft = {
    subject: str(req.body?.subject, 200) || `Re: ${email.subject}`,
    body,
    source: req.user.role,
    updatedAt: new Date(),
  };
  await email.save();
  res.json({ success: true, email: present(email, req.user) });
});

export const generateDraft = handle(async (req, res) => {
  const tone = TONES.includes(req.body?.tone) ? req.body.tone : "professional";
  const instructions = str(req.body?.instructions, 300);

  const email = await findOwned(req);
  if (!email) return notFound(res);
  if (!clientCanReply(email, req.user)) return denyClient(res, email);

  const { data, provider } = await draftReply(email, email.client?.name || "the client", { tone, instructions });
  const body = str(data?.body, 5000);
  if (!body) return fail(res, 502, "The AI returned an empty draft. Please try again.");

  email.draft = {
    subject: str(data?.subject, 200) || `Re: ${email.subject}`,
    body,
    source: "ai",
    updatedAt: new Date(),
  };
  await email.save();
  res.json({ success: true, provider, email: present(email, req.user) });
});

// Simulated send: no real mail leaves the system. Assistants and clients can both send.
export const sendReply = handle(async (req, res) => {
  const email = await findOwned(req);
  if (!email) return notFound(res);
  if (email.status === "replied") return fail(res, 409, "A reply was already sent for this email");
  if (!clientCanReply(email, req.user)) return denyClient(res, email);

  // allow "save + send" in one call
  if (req.body?.body !== undefined) {
    const body = str(req.body.body, 5000);
    if (!body) return fail(res, 400, "Reply body is empty");
    email.draft = {
      subject: str(req.body.subject, 200) || `Re: ${email.subject}`,
      body,
      source: req.user.role,
      updatedAt: new Date(),
    };
  }
  if (!email.draft?.body) return fail(res, 400, "Write or generate a draft before sending");

  email.status = "replied";
  email.repliedByRole = req.user.role;
  email.repliedAt = new Date();
  email.handledAt = email.repliedAt;
  email.takeoverRequested = false;
  await email.save();
  res.json({ success: true, email: present(email, req.user) });
});

// ---------------------------------------------------------------- assistant: ask AI
export const askAI = handle(async (req, res) => {
  const question = str(req.body?.question, 500);
  if (question.length < 3) return fail(res, 400, "Please enter a question");

  const email = await findOwned(req);
  if (!email) return notFound(res);

  const { data, provider } = await askAboutEmail(email, email.client?.name || "the client", question);
  const answer = str(data?.answer, 2000);
  if (!answer) return fail(res, 502, "The AI returned no answer. Please try again.");

  res.json({ success: true, answer, provider });
});

// ---------------------------------------------------------------- both roles: workflow
export const markHandled = handle(async (req, res) => {
  const handled = req.body?.handled !== false; // default true; false = reopen
  const note = str(req.body?.note, 1000);

  const email = await findOwned(req);
  if (!email) return notFound(res);

  if (email.status === "replied") return fail(res, 409, "A reply was already sent for this email");

  if (handled) {
    email.status = "handled";
    email.handledAt = new Date();
    email.handledByRole = req.user.role;
    email.isRead = true;
  } else {
    email.status = "open";
    email.handledAt = undefined;
    email.handledByRole = undefined;
  }
  if (note) pushNote(email, req.user, note);

  await email.save();
  res.json({ success: true, email: present(email, req.user) });
});

// client only: "I want my assistant to take this one over"
export const requestTakeover = handle(async (req, res) => {
  const note = str(req.body?.note, 500);

  const email = await findOwned(req);
  if (!email) return notFound(res);
  if (email.status !== "open") return fail(res, 409, "This email is already closed");

  email.classification = "assistant_reply";
  email.classificationSource = "client";
  email.takeoverRequested = true;
  if (note) pushNote(email, req.user, note);

  await email.save();
  res.json({ success: true, email: present(email, req.user) });
});

export const addNote = handle(async (req, res) => {
  const text = str(req.body?.text, 1000);
  if (!text) return fail(res, 400, "Note text is required");

  const email = await findOwned(req);
  if (!email) return notFound(res);

  pushNote(email, req.user, text);
  await email.save();
  res.status(201).json({ success: true, notes: email.notes });
});