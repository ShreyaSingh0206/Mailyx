import { useState } from "react";
import * as svc from "../../services/emailService";
import { errMsg } from "../../lib/format";
import { providerName } from "../../lib/meta";
import { Icon, Spinner } from "../ui/Icons";

const IDEAS = ["What do they want from us?", "Is there a deadline?", "Summarize the key numbers"];

/** Ask a free-form question about one email. Render with key={email._id} so history resets per email. */
export default function AskAI({ emailId, notify }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const ask = async (text) => {
    const question = text.trim();
    if (question.length < 3 || busy) return;
    setBusy(true);
    try {
      const res = await svc.askAI(emailId, question);
      setItems((prev) => [...prev, { q: question, a: res.answer, provider: res.provider }]);
      setQ("");
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="ask-h">
      <h3 id="ask-h" className="font-display text-lg font-bold">Ask the AI about this email</h3>

      {items.length > 0 && (
        <ul className="mt-3 space-y-3">
          {items.map((it, i) => (
            <li key={i} className="space-y-1.5">
              <p className="text-sm font-medium text-neutral-200">{it.q}</p>
              <div className="rounded-lg border border-neutral-800 border-l-2 border-l-amber-400 bg-neutral-950 px-4 py-3 text-sm leading-relaxed text-neutral-300">
                {it.a}
                <p className="mt-2 text-xs text-neutral-500">Answered by {providerName(it.provider)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="ask-input">Your question</label>
        <input id="ask-input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder="Type a question" className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600" />
        <button disabled={busy || q.trim().length < 3} className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-300 disabled:opacity-40">
          {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="spark" className="h-3.5 w-3.5" />}
          Ask
        </button>
      </form>

      {items.length === 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {IDEAS.map((s) => (
            <button key={s} onClick={() => ask(s)} disabled={busy} className="rounded-full border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400 hover:border-amber-400/40 hover:text-amber-200 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}