import { dueInfo, nextDue, timeAgo } from "../../lib/format";
import { ClassPill, LabelChip, Pill, StatusPill } from "../ui/Badges";

export default function EmailListItem({ email, active, onClick, variant = "assistant", showClient = false }) {
  const unread = !email.isRead;
  const open = email.status === "open";
  const due = open ? dueInfo(nextDue(email.actionItems)) : null;

  const preview =
    email.aiStatus === "done" ? email.summary : email.aiStatus === "failed" ? "AI analysis failed. Open the email to try again." : "Waiting for AI analysis";

  return (
    <li>
      <button
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        className={`relative block w-full border-b border-neutral-900 px-4 py-3.5 text-left lg:px-5 ${active ? "bg-neutral-900" : "hover:bg-neutral-950"}`}
      >
        {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-amber-400" />}

        <div className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" role="img" aria-label="Unread" />}
            <span className={`truncate text-sm ${unread ? "font-semibold text-neutral-50" : "text-neutral-300"}`}>{email.from?.name}</span>
          </span>
          <time className="shrink-0 text-xs text-neutral-500" dateTime={new Date(email.receivedAt).toISOString()}>
            {timeAgo(email.receivedAt)}
          </time>
        </div>

        <p className={`mt-0.5 truncate text-sm ${unread ? "text-neutral-100" : "text-neutral-400"}`}>{email.subject}</p>
        <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${email.aiStatus === "done" ? "text-neutral-500" : "italic text-neutral-600"}`}>{preview}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {email.classification && <ClassPill value={email.classification} viewer={variant} />}
          {email.takeoverRequested && email.status === "open" && <Pill tone="amber">{variant === "client" ? "You handed this over" : "Client asked you to take over"}</Pill>}
          <StatusPill status={email.status} />
          {showClient && email.client?.name && <Pill>{email.client.name}</Pill>}
          {due && <Pill tone={due.tone}>{due.label}</Pill>}
          {(email.labels || []).slice(0, 2).map((l) => (
            <LabelChip key={l} label={l} />
          ))}
        </div>
      </button>
    </li>
  );
}