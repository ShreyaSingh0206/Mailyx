import { useState } from "react";
import * as svc from "../../services/emailService";
import { doneInfo, errMsg, fullDate } from "../../lib/format";
import { Icon } from "../ui/Icons";
import { ClassPill, LabelChip, StatusPill } from "../ui/Badges";
import AiBrief from "./AiBrief";
import AskAI from "./AskAI";
import ClassificationEditor from "./ClassificationEditor";
import DraftEditor from "./DraftEditor";
import NotesThread from "./NotesThread";
import SentReply from "./SentReply";

export function DetailSkeleton({ onBack }) {
  return (
    <div className="relative h-full overflow-y-auto overscroll-contain">
      <BackBar onBack={onBack} />
      <div className="mx-auto max-w-3xl space-y-4 px-5 py-8" aria-hidden="true">
        <div className="h-6 w-2/3 animate-pulse rounded bg-neutral-900" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-900" />
        <div className="h-40 animate-pulse rounded-lg bg-neutral-950" />
      </div>
    </div>
  );
}

function BackBar({ onBack }) {
  return (
    <div className="sticky top-0 z-10 border-b border-neutral-800 bg-black/90 px-4 py-2.5 backdrop-blur md:hidden">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-neutral-300">
        <Icon name="back" />
        Back to inbox
      </button>
    </div>
  );
}

export default function AssistantEmailDetail({ email, loading, onBack, onUpdated, notify }) {
  const [busy, setBusy] = useState("");

  if (loading || !email) return <DetailSkeleton onBack={onBack} />;

  const act = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res.email) onUpdated(res.email);
      if (okMsg) notify(okMsg);
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy("");
    }
  };

  const clientName = email.client?.name || "Client";
  const lastClientNote = [...(email.notes || [])].reverse().find((n) => n.role === "client");
  const closed = email.status !== "open";
  const done = doneInfo(email, "assistant");

  return (
    <article className="relative h-full overflow-y-auto overscroll-contain">
      <BackBar onBack={onBack} />

      <div className="mx-auto w-full max-w-3xl space-y-7 px-5 py-6 lg:px-8">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <ClassPill value={email.classification} viewer="assistant" />
            <StatusPill status={email.status} />
            {(email.labels || []).map((l) => (
              <LabelChip key={l} label={l} />
            ))}
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight lg:text-3xl">{email.subject}</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            From <span className="text-neutral-200">{email.from?.name}</span> ({email.from?.email}) to {clientName}, received {fullDate(email.receivedAt)}
          </p>
          {done && email.status === "handled" && (
            <p className="mt-2 text-sm text-emerald-300">
              {done.text}
              {done.at ? ` on ${fullDate(done.at)}` : ""}
            </p>
          )}
          {email.status !== "replied" && (
            <button
              // the button asks for the OPPOSITE of the current state: open -> handled, handled -> open
              onClick={() => act("handled", () => svc.markHandled(email._id, { handled: !closed }), closed ? "Email reopened." : "Marked as handled.")}
              disabled={!!busy}
              className={`mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${closed ? "border-neutral-700 text-neutral-200 hover:bg-neutral-900" : "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"}`}
            >
              <Icon name={closed ? "refresh" : "check"} className="h-3.5 w-3.5" />
              {closed ? "Reopen" : "Mark as handled"}
            </button>
          )}
        </header>

        {email.takeoverRequested && email.status === "open" && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4">
            <p className="font-medium text-amber-300">{clientName.split(" ")[0]} asked you to take this one over</p>
            {lastClientNote && <p className="mt-1 text-sm text-neutral-300">“{lastClientNote.text}”</p>}
          </div>
        )}

        <AiBrief email={email} busy={busy === "analyze"} onAnalyze={(force) => act("analyze", () => svc.analyzeEmail(email._id, force), force ? "Analysis updated." : "Analysis complete.")}>
          {email.aiStatus === "done" && <ClassificationEditor email={email} busy={busy === "class"} onChange={(body) => act("class", () => svc.updateClassification(email._id, body), body.classification ? "Classification updated." : null)} />}
        </AiBrief>

        <section aria-labelledby="orig-h" className="space-y-4">
          <h3 id="orig-h" className="font-display text-lg font-bold">Original email</h3>
          <div className="whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-950 p-5 text-sm leading-relaxed text-neutral-300">{email.body}</div>
          <SentReply email={email} viewer="assistant" />
        </section>

        <DraftEditor email={email} viewer="assistant" onUpdated={onUpdated} notify={notify} />

        <AskAI key={email._id} emailId={email._id} notify={notify} />

        <section aria-labelledby="notes-h">
          <h3 id="notes-h" className="mb-3 font-display text-lg font-bold">Notes with {clientName.split(" ")[0]}</h3>
          <NotesThread
            notes={email.notes}
            clientName={clientName}
            viewerRole="assistant"
            emptyText="No notes yet. Notes on this email are shared with your client."
            onAdd={async (text) => {
              try {
                await svc.addNote(email._id, text);
                onUpdated(await svc.getEmail(email._id));
              } catch (e) {
                notify(errMsg(e), "error");
                throw e;
              }
            }}
          />
        </section>
      </div>
    </article>
  );
}