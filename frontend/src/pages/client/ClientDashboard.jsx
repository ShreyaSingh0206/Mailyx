import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import * as svc from "../../services/emailService";
import { errMsg, initials } from "../../lib/format";
import useToasts from "../../hooks/useToasts";
import Toasts from "../../components/ui/Toasts";
import { Icon } from "../../components/ui/Icons";
import EmailListItem from "../../components/dashboard/EmailListItem";
import ClientEmailDetail from "../../components/dashboard/ClientEmailDetail";

// Short labels so all four tabs always fit.
const TABS = [
  { id: "needs", label: "For you", title: "Emails waiting for your reply", countKey: "needs", badge: "bg-amber-400 text-black" },
  { id: "assistant", label: "With assistant", title: "Emails your assistant is handling", countKey: "withAssistant", badge: "bg-neutral-700 text-neutral-100" },
  { id: "handled", label: "Handled", title: "Emails that are done, handled by you or your assistant" },
  { id: "all", label: "All", title: "Every email" },
];

const EMPTY = {
  needs: ["You’re all caught up", "Nothing needs your personal attention right now. Your assistant is handling the rest."],
  assistant: ["Nothing with your assistant", "Emails your assistant is handling for you will show up here."],
  handled: ["Nothing handled yet", "Emails that you or your assistant finish will be kept here."],
  all: ["No emails yet", "Emails will appear here once your assistant syncs your mailbox."],
};

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const { toasts, notify, dismiss } = useToasts();

  const [tab, setTab] = useState("needs");
  const [emails, setEmails] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const listReq = useRef(0);
  const detailReq = useRef(0);

  const loadCounts = useCallback(async () => {
    try {
      setCounts(await svc.getCounts());
    } catch {
      /* ignore polling errors */
    }
  }, []);

  const loadList = useCallback(
    async ({ silent = false } = {}) => {
      const id = ++listReq.current;
      if (!silent) setLoading(true);
      try {
        const data = await svc.listMyEmails(tab);
        if (id !== listReq.current) return;
        setEmails(data.emails);
        setError("");
      } catch (e) {
        if (id === listReq.current) setError(errMsg(e));
      } finally {
        if (id === listReq.current) setLoading(false);
      }
    },
    [tab]
  );

  const loadListRef = useRef(loadList);
  useEffect(() => {
    loadListRef.current = loadList;
  });

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadCounts();
    const t = setInterval(() => {
      loadCounts();
      loadListRef.current({ silent: true });
    }, 20000);
    return () => clearInterval(t);
  }, [loadCounts]);

  const openEmail = async (id) => {
    const rid = ++detailReq.current;
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const email = await svc.getEmail(id);
      if (rid !== detailReq.current) return;
      setDetail(email);
      setEmails((prev) => prev.map((e) => (e._id === id ? { ...e, isRead: true } : e)));
    } catch (e) {
      if (rid === detailReq.current) {
        notify(errMsg(e), "error");
        setSelectedId(null);
      }
    } finally {
      if (rid === detailReq.current) setDetailLoading(false);
    }
  };

  const handleUpdated = (email) => {
    setDetail(email);
    loadCounts();
    loadListRef.current({ silent: true });
  };

  const [emptyTitle, emptyText] = EMPTY[tab];

  return (
    <div className="app-shell fixed inset-0 flex flex-col overflow-hidden bg-black text-neutral-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400 text-black">
            <Icon name="mail" className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Mailyx</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-medium">{user?.name}</span>
            <span className="block text-xs text-neutral-500">Client</span>
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400 text-xs font-semibold text-black">{initials(user?.name)}</span>
          <button onClick={logout} aria-label="Log out" title="Log out" className="rounded-md p-2 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-100">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className={`min-h-0 w-full shrink-0 flex-col border-r border-neutral-800 md:w-[24rem] lg:w-[26rem] ${selectedId ? "hidden md:flex" : "flex"}`} aria-label="Your emails">
          <div className="px-4 pb-3 pt-5 lg:px-5">
            <h1 className="font-display text-2xl font-bold tracking-tight">Your emails</h1>
            <p className="text-sm text-neutral-500">Your assistant handles routine mail. Open one to read the summary, reply or hand it over.</p>
          </div>

          <div role="tablist" aria-label="Email groups" className="flex justify-between overflow-x-auto border-b border-neutral-800 px-2 lg:px-3">
            {TABS.map((t) => {
              const active = tab === t.id;
              const n = t.countKey ? counts?.[t.countKey] : 0;
              return (
                <button key={t.id} role="tab" title={t.title} aria-selected={active} onClick={() => setTab(t.id)} className={`relative shrink-0 px-2.5 py-2.5 text-sm font-medium ${active ? "text-neutral-50" : "text-neutral-500 hover:text-neutral-300"}`}>
                  {t.label}
                  {n > 0 && <span className={`ml-1.5 rounded-full px-1.5 text-xs font-semibold ${t.badge}`}>{n}</span>}
                  {active && <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-amber-400" />}
                </button>
              );
            })}
          </div>

          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {error ? (
              <div className="px-6 py-12 text-center">
                <p className="font-display text-lg font-bold">Couldn’t load your emails</p>
                <p className="mt-1 text-sm text-rose-300">{error}</p>
              </div>
            ) : loading && emails.length === 0 ? (
              <ul aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="space-y-2 border-b border-neutral-900 px-5 py-4">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-900" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-900" />
                  </li>
                ))}
              </ul>
            ) : emails.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-display text-lg font-bold">{emptyTitle}</p>
                <p className="mx-auto mt-1 max-w-64 text-sm text-neutral-400">{emptyText}</p>
              </div>
            ) : (
              <ul>
                {emails.map((e) => (
                  <EmailListItem key={e._id} email={e} variant="client" active={e._id === selectedId} onClick={() => openEmail(e._id)} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <main className={`relative min-h-0 min-w-0 flex-1 ${selectedId ? "block" : "hidden md:block"}`}>
          {selectedId ? (
            <ClientEmailDetail key={selectedId} email={detail} loading={detailLoading} onBack={() => setSelectedId(null)} onUpdated={handleUpdated} notify={notify} />
          ) : (
            <div className="grid h-full place-items-center px-8 text-center">
              <div className="max-w-sm">
                <h2 className="font-display text-2xl font-bold">
                  {counts?.needs ? `${counts.needs} email${counts.needs === 1 ? " needs" : "s need"} your reply` : "Nothing needs you right now"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">Open an email to read the summary. You can reply with an AI-written draft, send your assistant a note, or hand it over to them.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}