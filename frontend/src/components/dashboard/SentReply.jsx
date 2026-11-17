import { useEffect, useRef } from "react";
import { doneInfo, fullDate } from "../../lib/format";
import { Icon } from "../ui/Icons";

/** The reply that was sent, shown under the original email like a conversation thread. */
export default function SentReply({ email, viewer }) {
  const ref = useRef(null);
  const info = doneInfo(email, viewer);

  // right after sending, bring the reply into view
  useEffect(() => {
    const sentAt = new Date(email.repliedAt || 0).getTime();
    if (Date.now() - sentAt < 15000) ref.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [email.repliedAt]);

  if (email.status !== "replied" || !email.draft?.body) return null;

  return (
    <section ref={ref} aria-labelledby="sent-h" className="rounded-lg border border-emerald-400/25 border-l-2 border-l-emerald-400 bg-emerald-400/5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 pt-4">
        <h3 id="sent-h" className="flex items-center gap-2 font-display text-lg font-bold">
          <Icon name="check" className="h-4 w-4 text-emerald-400" />
          Reply sent
        </h3>
        {info && (
          <span className="text-sm text-emerald-200/80">
            {info.text}
            {info.at ? ` on ${fullDate(info.at)}` : ""}
          </span>
        )}
      </div>
      <div className="px-5 pb-4 pt-3">
        <p className="text-sm font-medium text-neutral-100">{email.draft.subject}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{email.draft.body}</p>
        <p className="mt-3 text-xs text-neutral-500">Sent in demo mode. No real email left the system.</p>
      </div>
    </section>
  );
}