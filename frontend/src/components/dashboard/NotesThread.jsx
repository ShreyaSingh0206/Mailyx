import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { fullDate, initials, noteAuthor } from "../../lib/format";
import { Spinner } from "../ui/Icons";

/** Shared conversation between assistant and client about one email. */
export default function NotesThread({ notes = [], clientName, viewerRole, onAdd, hideComposer = false, emptyText }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd(text.trim());
      setText("");
    } catch {
      // the parent already showed the error; keep the text so nothing is lost
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {notes.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyText || "No notes yet."}</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n, i) => {
            const mine = n.role === viewerRole;
            const name = noteAuthor(n, { clientName, viewerRole });
            return (
              <li key={n._id || i} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-medium text-neutral-300 ring-1 ring-neutral-800">
                  {initials(mine ? user?.name : name)}
                </span>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-amber-400/10 text-amber-50 ring-1 ring-inset ring-amber-400/20" : "bg-neutral-900 text-neutral-200"}`}>
                  <p className="whitespace-pre-wrap">{n.text}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {name} wrote this on {fullDate(n.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!hideComposer && (
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <label className="sr-only" htmlFor="note-input">Add a note</label>
          <input
            id="note-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder="Add a note"
            className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600"
          />
          <button disabled={!text.trim() || busy} className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">
            {busy && <Spinner className="h-3.5 w-3.5" />}
            Add note
          </button>
        </form>
      )}
    </div>
  );
}