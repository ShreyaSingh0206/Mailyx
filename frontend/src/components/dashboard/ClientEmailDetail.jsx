import { useState } from "react";
import * as svc from "../../services/emailService";
import { doneInfo, errMsg, fullDate } from "../../lib/format";
import { Icon, Spinner } from "../ui/Icons";
import { ClassPill, LabelChip, StatusPill } from "../ui/Badges";
import AiBrief from "./AiBrief";
import DraftEditor from "./DraftEditor";
import NotesThread from "./NotesThread";
import SentReply from "./SentReply";
import { DetailSkeleton } from "./AssistantEmailDetail";

export default function ClientEmailDetail({ email, loading, onBack, onUpdated, notify }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");

  if (loading || !email) return <DetailSkeleton onBack={onBack} />;

  const act = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res.email) onUpdated(res.email);
      if (okMsg) notify(okMsg);
      setNote("");
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy("");
    }
  };

  const text = note.trim();
  const open = email.status === "open";
  const handled = email.status === "handled";
  const replied = email.status === "replied";
  const mineToAnswer = open && email.classification === "client_reply";
  const withAssistant = open && email.classification === "assistant_reply";
  const done = doneInfo(email, "client");

  const sendNote = () =>
    act("note", async () => {
      await svc.addNote(email._id, text);
      return { email: await svc.getEmail(email._id) };
    }, "Note sent to your assistant.");

  const btn = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50";

  return (
    <article className="relative h-full overflow-y-auto overscroll-contain">
      <div className="sticky top-0 z-10 border-b border-neutral-800 bg-black/90 px-4 py-2.5 backdrop-blur md:hidden">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-neutral-300">
          <Icon name="back" />
          Back to your emails
        </button>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-7 px-5 py-6 lg:px-8">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <ClassPill value={email.classification} viewer="client" />
            <StatusPill status={email.status} />
            {(email.labels || []).map((l) => (
              <LabelChip key={l} label={l} />
            ))}
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight lg:text-3xl">{email.subject}</h2>
          <p className="mt-2 text-sm text-neutral-400">
            From <span className="text-neutral-200">{email.from?.name}</span> ({email.from?.email}), received {fullDate(email.receivedAt)}
          </p>
          {handled && done && (
            <p className="mt-2 text-sm text-emerald-300">
              {done.text}
              {done.at ? ` on ${fullDate(done.at)}` : ""}
            </p>
          )}
        </header>

        {withAssistant && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4">
            <p className="font-medium text-amber-300">Your assistant is handling this</p>
            <p className="mt-1 text-sm text-neutral-300">{email.takeoverRequested ? "You asked them to take it over. " : ""}They will reply on your behalf. You can leave them a note below.</p>
          </div>
        )}

        <AiBrief email={email} viewer="client" />

        <section aria-labelledby="orig-h" className="space-y-4">
          <h3 id="orig-h" className="font-display text-lg font-bold">Original email</h3>
          <div className="whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-950 p-5 text-sm leading-relaxed text-neutral-300">{email.body}</div>
          <SentReply email={email} viewer="client" />
        </section>

        {mineToAnswer && <DraftEditor email={email} viewer="client" onUpdated={onUpdated} notify={notify} />}

        <section aria-labelledby="decide-h">
          <h3 id="decide-h" className="font-display text-lg font-bold">{mineToAnswer ? "Or tell your assistant what to do" : "Message your assistant"}</h3>
          <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
            <label htmlFor="decision" className="sr-only">Your decision or note for your assistant</label>
            <textarea id="decision" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder={mineToAnswer ? "e.g. “Approved, go ahead.” or “Please handle this one.”" : "Write a note for your assistant"} className="w-full resize-y rounded-md border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600" />

            <div className="mt-3 flex flex-wrap gap-2">
              {handled && (
                <button onClick={() => act("reopen", () => svc.markHandled(email._id, { handled: false, note: text }), "Email reopened.")} disabled={!!busy} className={`${btn} border border-neutral-700 text-neutral-200 hover:bg-neutral-900`}>
                  {busy === "reopen" ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="refresh" className="h-3.5 w-3.5" />}
                  Reopen
                </button>
              )}
              {open && (mineToAnswer || email.classification === "no_reply") && (
                <button onClick={() => act("handled", () => svc.markHandled(email._id, { handled: true, note: text }), "Marked as handled.")} disabled={!!busy} className={`${btn} bg-emerald-400 font-semibold text-black hover:bg-emerald-300`}>
                  {busy === "handled" ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="check" className="h-3.5 w-3.5" />}
                  Mark as handled
                </button>
              )}
              {mineToAnswer && (
                <button onClick={() => act("takeover", () => svc.requestTakeover(email._id, text), "Your assistant will take this over.")} disabled={!!busy} className={`${btn} border border-amber-400/50 font-semibold text-amber-300 hover:bg-amber-400/10`}>
                  {busy === "takeover" && <Spinner className="h-3.5 w-3.5" />}
                  Ask my assistant to take over
                </button>
              )}
              <button onClick={sendNote} disabled={!!busy || !text} className={`${btn} ${mineToAnswer || handled || open ? "text-neutral-300 hover:bg-neutral-900" : "border border-neutral-700 text-neutral-200 hover:bg-neutral-900"} disabled:opacity-40`}>
                {busy === "note" && <Spinner className="h-3.5 w-3.5" />}
                {mineToAnswer ? "Just send a note" : "Send note"}
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="notes-h">
          <h3 id="notes-h" className="mb-3 font-display text-lg font-bold">Conversation with your assistant</h3>
          <NotesThread notes={email.notes} viewerRole="client" hideComposer emptyText={replied ? "No notes on this email." : "No messages yet. Notes you send above appear here."} />
        </section>
      </div>
    </article>
  );
}