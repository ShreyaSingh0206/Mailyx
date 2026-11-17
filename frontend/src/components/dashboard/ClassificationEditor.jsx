import { CLASSES, LABELS, LABEL_META, classLong, classShort, classTone } from "../../lib/meta";

const ACTIVE = {
  amber: "bg-amber-400 text-black",
  white: "bg-neutral-100 text-black",
  green: "bg-emerald-400 text-black",
};

/** Lets the assistant correct the AI. Shows who made the current decision. */
export default function ClassificationEditor({ email, busy, onChange }) {
  const ai = classLong(email.aiClassification, "assistant");
  const source =
    email.classificationSource === "assistant"
      ? `The AI suggested “${ai || "nothing"}”. You changed it.`
      : email.classificationSource === "client"
        ? "Your client moved this email to you."
        : "Set by the AI. Change it if it got this wrong.";

  return (
    <div className="border-t border-neutral-900 px-5 py-4">
      <h4 className="mb-2 text-sm font-medium text-neutral-300">Who should reply</h4>
      <div role="group" aria-label="Who should reply" className="inline-flex flex-wrap gap-1 rounded-lg bg-neutral-900 p-1">
        {CLASSES.map((key) => {
          const on = email.classification === key;
          return (
            <button
              key={key}
              aria-pressed={on}
              disabled={busy}
              onClick={() => !on && onChange({ classification: key })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${on ? ACTIVE[classTone(key, "assistant")] : "text-neutral-400 hover:text-neutral-100"}`}
            >
              {classShort(key, "assistant")}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-neutral-500">{source}</p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Labels">
        {LABELS.map((l) => {
          const on = email.labels?.includes(l);
          return (
            <button
              key={l}
              aria-pressed={on}
              disabled={busy}
              onClick={() => onChange({ labels: on ? email.labels.filter((x) => x !== l) : [...(email.labels || []), l] })}
              className={`rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-60 ${on ? "border-amber-400/50 bg-amber-400/10 text-amber-200" : "border-neutral-800 text-neutral-500 hover:text-neutral-200"}`}
            >
              {LABEL_META[l]}
            </button>
          );
        })}
      </div>
    </div>
  );
}