import { LABEL_META, classLong, classTone } from "../../lib/meta";
import { Icon } from "./Icons";

const TONE = {
  amber: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  green: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  white: "bg-white/5 text-neutral-200 ring-white/15",
  rose: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
  neutral: "bg-neutral-900 text-neutral-400 ring-neutral-800",
};

export function Pill({ tone = "neutral", className = "", children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function ClassPill({ value, viewer = "assistant" }) {
  const label = classLong(value, viewer);
  return label ? <Pill tone={classTone(value, viewer)}>{label}</Pill> : <Pill>Not classified yet</Pill>;
}

export function StatusPill({ status }) {
  if (status !== "handled" && status !== "replied") return null;
  return (
    <Pill tone="green">
      <Icon name="check" className="h-3 w-3" />
      {status === "handled" ? "Handled" : "Replied"}
    </Pill>
  );
}

export function LabelChip({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
      <span className={`h-1.5 w-1.5 rounded-full ${label === "important" ? "bg-amber-400" : "bg-neutral-600"}`} />
      {LABEL_META[label] || label}
    </span>
  );
}