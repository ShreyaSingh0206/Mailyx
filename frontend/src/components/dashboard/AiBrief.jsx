import { timeAgo } from "../../lib/format";
import { providerName } from "../../lib/meta";
import { Icon, Spinner } from "../ui/Icons";
import { Pill } from "../ui/Badges";
import ActionItems from "./ActionItems";

/**
 * The AI's reading of the email: summary, why it was classified, and action items.
 * viewer="assistant" shows the reasoning, provider and re-run button; viewer="client" only the essentials.
 */
export default function AiBrief({ email, viewer = "assistant", busy = false, onAnalyze, children }) {
  const isAssistant = viewer === "assistant";

  return (
    <section aria-labelledby="brief-h" className="rounded-lg border border-neutral-800 border-l-2 border-l-amber-400 bg-neutral-950">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h3 id="brief-h" className="flex items-center gap-2 font-display text-lg font-bold">
          <Icon name="spark" className="h-4 w-4 text-amber-400" />
          {isAssistant ? "AI brief" : "Summary"}
        </h3>
        {isAssistant && email.aiStatus === "done" && <Pill>{providerName(email.aiProvider)}</Pill>}
      </div>

      <div className="space-y-4 px-5 pb-4 pt-3">
        {email.aiStatus === "done" ? (
          <>
            <p className="text-base leading-relaxed text-neutral-100">{email.summary}</p>
            {isAssistant && email.aiReasoning && (
              <p className="text-sm leading-relaxed text-neutral-400">
                <span className="font-medium text-neutral-300">Why this classification: </span>
                {email.aiReasoning}
              </p>
            )}
            <div>
              <h4 className="mb-2 text-sm font-medium text-neutral-300">Action items</h4>
              <ActionItems items={email.actionItems} closed={email.status !== "open"} />
            </div>
          </>
        ) : email.aiStatus === "failed" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-rose-300">{isAssistant ? "The AI couldn’t analyze this email. Try again in a moment." : "Your assistant is still preparing a summary."}</p>
            {isAssistant && <RunButton busy={busy} onClick={() => onAnalyze(false)} label="Try again" />}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2" aria-hidden="true">
              <div className="h-3 w-11/12 animate-pulse rounded bg-neutral-900" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-neutral-900" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-400">{isAssistant ? "This email hasn’t been analyzed yet." : "Your assistant is still preparing a summary."}</p>
              {isAssistant && <RunButton busy={busy} onClick={() => onAnalyze(false)} label="Analyze with AI" />}
            </div>
          </div>
        )}
      </div>

      {children}

      {isAssistant && email.aiStatus === "done" && (
        <div className="flex items-center justify-between border-t border-neutral-900 px-5 py-2.5 text-xs text-neutral-500">
          <span>Analyzed {timeAgo(email.aiProcessedAt)} ago</span>
          <button onClick={() => onAnalyze(true)} disabled={busy} className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-amber-300 disabled:opacity-50">
            {busy ? <Spinner className="h-3 w-3" /> : <Icon name="refresh" className="h-3 w-3" />}
            Run the AI again
          </button>
        </div>
      )}
    </section>
  );
}

function RunButton({ busy, onClick, label }) {
  return (
    <button onClick={onClick} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-3 py-1.5 text-sm font-semibold text-black hover:bg-amber-300 disabled:opacity-60">
      {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="spark" className="h-3.5 w-3.5" />}
      {busy ? "Analyzing…" : label}
    </button>
  );
}