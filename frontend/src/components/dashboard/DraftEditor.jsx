import { useEffect, useState } from "react";
import * as svc from "../../services/emailService";
import { errMsg } from "../../lib/format";
import { TONES, providerName } from "../../lib/meta";
import { Icon, Spinner } from "../ui/Icons";

const PLACEHOLDER = /\[[^\]]+\]/;

/**
 * Draft, edit and send a reply. Used by the assistant and, for emails that are the client's to answer, by the client.
 * Once a reply is sent it is shown by <SentReply/> instead, so this renders nothing.
 */
export default function DraftEditor({ email, viewer = "assistant", onUpdated, notify }) {
  const defaults = (e) => ({ subject: e.draft?.subject || `Re: ${e.subject}`, body: e.draft?.body || "" });

  const [subject, setSubject] = useState(defaults(email).subject);
  const [body, setBody] = useState(defaults(email).body);
  const [tone, setTone] = useState("professional");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState("");
  const [confirming, setConfirming] = useState(false);

  // reload the editor when we switch emails or a new draft arrives from the server
  const syncKey = `${email._id}:${email.draft?.updatedAt}`;
  const [seenKey, setSeenKey] = useState(syncKey);
  if (seenKey !== syncKey) {
    setSeenKey(syncKey);
    setSubject(defaults(email).subject);
    setBody(defaults(email).body);
    setConfirming(false);
  }

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 6000);
    return () => clearTimeout(t);
  }, [confirming]);

  if (email.status === "replied") return null;

  const run = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res.email) onUpdated(res.email);
      if (okMsg) notify(okMsg(res));
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy("");
      setConfirming(false);
    }
  };

  const isClient = viewer === "client";
  const hasPlaceholders = PLACEHOLDER.test(body);
  const writer = email.draft?.source === "ai" ? `Written by ${providerName(email.aiProvider)}, review before sending` : email.draft?.source ? `Edited by ${email.draft.source === viewer ? "you" : email.draft.source}` : "";
  const status = email.draft?.body ? writer : "No draft yet";
  const dirty = body !== (email.draft?.body || "") || subject !== (email.draft?.subject || `Re: ${email.subject}`);

  const send = () => {
    if (hasPlaceholders && !confirming) return setConfirming(true); // only ask when the draft is clearly unfinished
    run("send", () => svc.sendReply(email._id, { subject, body }), () => "Reply sent.");
  };

  return (
    <section aria-labelledby="draft-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="draft-h" className="font-display text-lg font-bold">{isClient ? "Your reply" : "Reply draft"}</h3>
        <span className="text-xs text-neutral-500">{status}</span>
      </div>

      {!isClient && email.classification === "client_reply" && <p className="mt-1 text-sm text-neutral-500">This one is for your client to answer, but you can reply on their behalf.</p>}
      {!isClient && email.classification === "no_reply" && <p className="mt-1 text-sm text-neutral-500">The AI thinks no reply is needed here.</p>}

      <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950">
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-900 p-3">
          <label className="sr-only" htmlFor="tone">Tone</label>
          <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)} className="rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-sm capitalize text-neutral-300">
            {TONES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="instr">Instructions for the AI</label>
          <input id="instr" value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={300} placeholder={isClient ? "Optional: tell the AI what to say, e.g. politely decline" : "Optional: tell the AI what to say, e.g. suggest Friday morning"} className="min-w-40 flex-1 rounded-md border border-neutral-800 bg-black px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600" />
          <button
            onClick={() => run("gen", () => svc.generateDraft(email._id, { tone, instructions }), (r) => `Draft ready, written by ${providerName(r.provider)}.`)}
            disabled={!!busy}
            className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-3 py-1.5 text-sm font-semibold text-black hover:bg-amber-300 disabled:opacity-60"
          >
            {busy === "gen" ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="spark" className="h-3.5 w-3.5" />}
            {email.draft?.body ? "Write it again" : "Write a draft"}
          </button>
        </div>

        <div className="space-y-3 p-4">
          <label className="sr-only" htmlFor="d-subject">Subject</label>
          <input id="d-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-sm font-medium text-neutral-100" />
          <label className="sr-only" htmlFor="d-body">Reply</label>
          <textarea id="d-body" value={body} onChange={(e) => setBody(e.target.value)} rows={9} maxLength={5000} placeholder="Write a reply, or let the AI draft one." className="w-full resize-y rounded-md border border-neutral-800 bg-black px-3 py-2 text-sm leading-relaxed text-neutral-100 placeholder:text-neutral-600" />
          {hasPlaceholders && <p className="text-xs text-amber-300">{confirming ? "The draft still has [placeholders] in square brackets. Choose “Send anyway” to send it as it is." : "The draft has [placeholders] in square brackets. Fill them in before sending."}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-900 p-3">
          <button onClick={() => run("save", () => svc.saveDraft(email._id, { subject, body }), () => "Draft saved.")} disabled={!!busy || !body.trim() || !dirty} className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">
            {busy === "save" && <Spinner className="h-3.5 w-3.5" />}
            Save draft
          </button>
          <button onClick={send} disabled={!!busy || !body.trim()} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40 ${confirming ? "bg-amber-300 ring-2 ring-amber-400/50" : "bg-emerald-400 hover:bg-emerald-300"}`}>
            {busy === "send" ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="send" className="h-3.5 w-3.5" />}
            {confirming ? "Send anyway" : "Send reply"}
          </button>
        </div>
      </div>
    </section>
  );
}