import { useEffect, useState } from "react";
import * as svc from "../../services/emailService";
import { errMsg } from "../../lib/format";
import { Spinner } from "../ui/Icons";

export default function AddClientModal({ open, onClose, onLinked }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { client } = await svc.linkClient(email);
      setEmail("");
      onLinked(client);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="add-h" className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6">
        <h2 id="add-h" className="font-display text-xl font-bold">Add a client</h2>
        <p className="mt-1 text-sm text-neutral-400">Enter the email your client used to sign up with the Client role. They’ll get their own dashboard for the emails you pass to them.</p>

        <label htmlFor="client-email" className="mt-5 block text-sm font-medium text-neutral-300">Client’s email</label>
        <input id="client-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@company.com" className="mt-1.5 w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600" />
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900">Cancel</button>
          <button disabled={busy || !email.trim()} className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300 disabled:opacity-50">
            {busy && <Spinner className="h-3.5 w-3.5" />}
            Add client
          </button>
        </div>
      </form>
    </div>
  );
}