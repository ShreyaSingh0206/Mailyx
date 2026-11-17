const MIN = 60e3;
const HOUR = 36e5;
const DAY = 864e5;

export function timeAgo(date, now = Date.now()) {
  const d = now - new Date(date).getTime();
  if (d < MIN) return "now";
  if (d < HOUR) return `${Math.floor(d / MIN)}m`;
  if (d < DAY) return `${Math.floor(d / HOUR)}h`;
  if (d < 7 * DAY) return `${Math.floor(d / DAY)}d`;
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export const fullDate = (date) =>
  new Date(date).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const startOfDay = (d) => new Date(d).setHours(0, 0, 0, 0);

/** Human deadline label + colour tone for an action item. */
export function dueInfo(due, now = Date.now()) {
  if (!due) return null;
  const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
  if (days < 0) return { label: `Overdue by ${-days}d`, tone: "rose" };
  if (days === 0) return { label: "Due today", tone: "amber" };
  if (days === 1) return { label: "Due tomorrow", tone: "amber" };
  return { label: `Due in ${days}d`, tone: "neutral" };
}

/** Earliest deadline among action items that are not done yet. */
export function nextDue(items = []) {
  const dates = items.filter((a) => a.dueDate && !a.done).map((a) => new Date(a.dueDate).getTime());
  return dates.length ? Math.min(...dates) : null;
}

export const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

export const errMsg = (err) => err?.response?.data?.message || (err?.request ? "Can\x27t reach the server. Check that the backend is running." : err?.message) || "Something went wrong";

export function noteAuthor(note, { clientName, viewerRole }) {
  if (note.role === viewerRole) return "You";
  if (note.author?.name) return note.author.name;
  return note.role === "client" ? clientName || "Client" : "Your assistant";
}

/** "You replied", "Your assistant marked this as handled" ... for finished emails (null while still open). */
export function doneInfo(email, viewer) {
  if (email.status === "open") return null;
  const other = viewer === "assistant" ? "Your client" : "Your assistant";
  if (email.status === "replied") {
    const by = email.repliedByRole || "assistant"; // older data has no role: replies used to be the assistant's
    return { text: `${by === viewer ? "You" : other} replied`, at: email.repliedAt || email.handledAt };
  }
  const by = email.handledByRole;
  return { text: by ? `${by === viewer ? "You" : other} marked this as handled` : "Marked as handled", at: email.handledAt };
}