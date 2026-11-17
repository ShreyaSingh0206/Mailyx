import { dueInfo } from "../../lib/format";
import { Pill } from "../ui/Badges";
import { Icon } from "../ui/Icons";

export default function ActionItems({ items = [], closed = false }) {
  if (!items.length) return <p className="text-sm text-neutral-500">No action items found in this email.</p>;

  return (
    <ul className="space-y-2">
      {items.map((a, i) => {
        const due = !a.done && !closed && dueInfo(a.dueDate);
        return (
          <li key={a._id || i} className="flex items-start gap-3 text-sm">
            <span
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                a.done ? "border-emerald-400 bg-emerald-400 text-black" : "border-neutral-600"
              }`}
            >
              {a.done && <Icon name="check" className="h-3 w-3" />}
            </span>
            <span className={`flex-1 ${a.done ? "text-neutral-500 line-through" : closed ? "text-neutral-400" : "text-neutral-200"}`}>{a.text}</span>
            {due && <Pill tone={due.tone}>{due.label}</Pill>}
          </li>
        );
      })}
    </ul>
  );
}