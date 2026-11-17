import { LABELS, LABEL_META } from "../../lib/meta";
import { Icon, Spinner } from "../ui/Icons";
import EmailListItem from "./EmailListItem";

// Short labels so all four tabs always fit. Names follow the assistant's point of view: "You" = emails you must reply to.
const TABS = [
  { id: "assistant", label: "You", title: "Emails you (the assistant) should reply to", countKey: "assistantQueue", badge: "bg-amber-400 text-black" },
  { id: "client", label: "Client", title: "Emails your client should reply to", countKey: "clientQueue", badge: "bg-neutral-700 text-neutral-100" },
  { id: "none", label: "No reply", title: "Emails that need no reply" },
  { id: "all", label: "All", title: "Every email" },
];

const WHAT = { assistant: "waiting for you", client: "waiting for the client", none: "that need no reply", all: "in total" };
const describe = (tab, status) => (status === "done" ? "handled or replied" : status === "any" ? "in total" : WHAT[tab]);

const SELECT = "rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-300";

function AiBanner({ counts, analyzing, onAnalyze }) {
  const pending = counts?.aiPending || 0;
  const failed = counts?.aiFailed || 0;
  if (!pending && !failed && !analyzing) return null;

  const text = analyzing
    ? "The AI is reading your emails. This can take a few minutes."
    : [pending && `${pending} email${pending > 1 ? "s" : ""} waiting for the AI`, failed && `${failed} failed`].filter(Boolean).join(", ");

  return (
    <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-400/25 bg-amber-400/5 px-3 py-2.5 lg:mx-5">
      <p className="flex items-center gap-2 text-sm text-amber-200">
        {analyzing && <Spinner className="h-3.5 w-3.5" />}
        {text}
      </p>
      <button onClick={onAnalyze} disabled={analyzing} className="shrink-0 rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-300 disabled:opacity-50">
        {analyzing ? "Working…" : pending ? "Analyze now" : "Retry"}
      </button>
    </div>
  );
}

export default function InboxPane(props) {
  const { className = "", clients, activeClient, onSelectClient, tab, onTab, counts, status, onStatus, label, onLabel, unread, onUnread, q, onQ } = props;
  const { emails, listLoading, listError, total, hasMore, onLoadMore, selectedId, onSelect, onSync, syncing, analyzing, onAnalyze, onLogout, onAddClient } = props;

  return (
    <section className={`min-h-0 w-full shrink-0 flex-col border-r border-neutral-800 md:w-[24rem] lg:w-[26rem] ${className}`} aria-label="Emails">
      <header className="px-4 pb-3 pt-5 lg:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight">{activeClient ? activeClient.name : "Inbox"}</h1>
            <p className="text-sm text-neutral-500">{listLoading && !emails.length ? "Loading emails…" : `${total} email${total === 1 ? "" : "s"} ${describe(tab, status)}`}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {activeClient && (
              <button onClick={onSync} disabled={syncing} className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">
                {syncing ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="refresh" className="h-3.5 w-3.5" />}
                {activeClient.emailAccount?.provider ? "Sync" : "Connect"}
              </button>
            )}
            <button onClick={onLogout} aria-label="Log out" className="rounded-md p-2 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-100 lg:hidden">
              <Icon name="logout" />
            </button>
          </div>
        </div>

        {/* below lg the sidebar is hidden, so clients become a chip row */}
        <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 lg:hidden" role="group" aria-label="Clients">
          {[{ _id: null, name: "All" }, ...clients].map((c) => (
            <button key={c._id ?? "all"} onClick={() => onSelectClient(c._id)} aria-pressed={(activeClient?._id ?? null) === c._id} className={`shrink-0 rounded-full border px-3 py-1 text-sm ${(activeClient?._id ?? null) === c._id ? "border-amber-400 bg-amber-400 font-semibold text-black" : "border-neutral-800 text-neutral-400"}`}>
              {c.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </header>

      <div role="tablist" aria-label="Who needs to reply" className="flex justify-between overflow-x-auto border-b border-neutral-800 px-2 lg:px-3">
        {TABS.map((t) => {
          const active = tab === t.id;
          const n = t.countKey ? counts?.[t.countKey] : 0;
          return (
            <button key={t.id} role="tab" title={t.title} aria-selected={active} onClick={() => onTab(t.id)} className={`relative shrink-0 px-2.5 py-2.5 text-sm font-medium ${active ? "text-neutral-50" : "text-neutral-500 hover:text-neutral-300"}`}>
              {t.label}
              {n > 0 && <span className={`ml-1.5 rounded-full px-1.5 text-xs font-semibold ${t.badge}`}>{n}</span>}
              {active && <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 px-4 py-3 lg:px-5">
        <label className="relative block">
          <span className="sr-only">Search emails</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input type="search" value={q} onChange={(e) => onQ(e.target.value)} placeholder="Search by sender, subject or summary" className="w-full rounded-md border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-sm text-neutral-100 placeholder:text-neutral-600" />
        </label>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="f-label">Label</label>
          <select id="f-label" value={label} onChange={(e) => onLabel(e.target.value)} className={SELECT}>
            <option value="">All labels</option>
            {LABELS.map((l) => (
              <option key={l} value={l}>{LABEL_META[l]}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="f-status">Status</label>
          <select id="f-status" value={status} onChange={(e) => onStatus(e.target.value)} className={SELECT}>
            <option value="open">Open</option>
            <option value="done">Handled</option>
            <option value="any">Any status</option>
          </select>
          <button aria-pressed={unread} onClick={() => onUnread(!unread)} className={`rounded-md border px-2.5 py-1.5 text-sm ${unread ? "border-amber-400/50 bg-amber-400/10 text-amber-200" : "border-neutral-800 text-neutral-400 hover:text-neutral-200"}`}>
            Unread only
          </button>
        </div>
      </div>

      <AiBanner counts={counts} analyzing={analyzing} onAnalyze={onAnalyze} />

      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-neutral-900">
        {listError ? (
          <div className="px-6 py-12 text-center">
            <p className="font-display text-lg font-bold">Couldn’t load emails</p>
            <p className="mt-1 text-sm text-rose-300">{listError}</p>
          </div>
        ) : listLoading && emails.length === 0 ? (
          <ul aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="space-y-2 border-b border-neutral-900 px-5 py-4">
                <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-900" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-900" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-900" />
              </li>
            ))}
          </ul>
        ) : emails.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-lg font-bold">{clients.length === 0 ? "No clients yet" : "Nothing in this view"}</p>
            <p className="mx-auto mt-1 max-w-64 text-sm text-neutral-400">
              {clients.length === 0 ? "Add a client who has signed up, then sync their mailbox to see emails here." : "Try another tab or filter, or sync a client’s mailbox for new emails."}
            </p>
            {clients.length === 0 && (
              <button onClick={onAddClient} className="mt-4 inline-flex items-center gap-2 rounded-md bg-amber-400 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-300">
                <Icon name="plus" className="h-4 w-4" />
                Add a client
              </button>
            )}
          </div>
        ) : (
          <>
            <ul>
              {emails.map((e) => (
                <EmailListItem key={e._id} email={e} active={e._id === selectedId} showClient={!activeClient} onClick={() => onSelect(e._id)} />
              ))}
            </ul>
            {hasMore && (
              <div className="p-4 text-center">
                <button onClick={onLoadMore} disabled={listLoading} className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">
                  {listLoading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}