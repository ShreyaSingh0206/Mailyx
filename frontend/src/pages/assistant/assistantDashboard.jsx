import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import * as svc from "../../services/emailService";
import { errMsg } from "../../lib/format";
import useDebounce from "../../hooks/useDebounce";
import useToasts from "../../hooks/useToasts";
import Toasts from "../../components/ui/Toasts";
import { Icon } from "../../components/ui/Icons";
import AssistantSidebar from "../../components/dashboard/AssistantSidebar";
import InboxPane from "../../components/dashboard/InboxPane";
import AssistantEmailDetail from "../../components/dashboard/AssistantEmailDetail";
import AddClientModal from "../../components/dashboard/AddClientModal";

const TAB_PARAMS = {
  assistant: { classification: "assistant_reply" },
  client: { classification: "client_reply" },
  none: { classification: "no_reply" },
  all: {},
};
const defaultStatus = (tab) => (tab === "assistant" || tab === "client" ? "open" : "any");

export default function AssistantDashboard() {
  const { user, logout } = useAuth();
  const { toasts, notify, dismiss } = useToasts();

  // filters
  const [clientId, setClientId] = useState(null);
  const [tab, setTab] = useState("assistant");
  const [status, setStatus] = useState("open");
  const [label, setLabel] = useState("");
  const [unread, setUnread] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);

  // data
  const [clients, setClients] = useState([]);
  const [counts, setCounts] = useState(null);
  const [emails, setEmails] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  // selection
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // actions
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const listReq = useRef(0);
  const detailReq = useRef(0);

  const baseParams = useMemo(() => {
    const p = { ...TAB_PARAMS[tab], limit: 25 };
    if (status !== "any") p.status = status;
    if (clientId) p.client = clientId;
    if (label) p.label = label;
    if (unread) p.unread = "true";
    if (debouncedQ.trim()) p.q = debouncedQ.trim();
    return p;
  }, [tab, status, clientId, label, unread, debouncedQ]);

  const loadClients = useCallback(async () => {
    try {
      setClients(await svc.getClients());
    } catch (e) {
      notify(errMsg(e), "error");
    }
  }, [notify]);

  const loadCounts = useCallback(async () => {
    try {
      setCounts(await svc.getCounts());
    } catch {
      /* polling failures are not worth a toast */
    }
  }, []);

  const fetchList = useCallback(
    async (pageNum, { silent = false } = {}) => {
      const id = ++listReq.current;
      if (!silent) setListLoading(true);
      try {
        const data = await svc.listEmails({ ...baseParams, page: pageNum });
        if (id !== listReq.current) return; // a newer request took over
        setEmails((prev) => (pageNum === 1 ? data.emails : [...prev, ...data.emails]));
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
        setListError("");
      } catch (e) {
        if (id === listReq.current) setListError(errMsg(e));
      } finally {
        if (id === listReq.current) setListLoading(false);
      }
    },
    [baseParams]
  );

  // always-fresh handles for timers and callbacks
  const fetchListRef = useRef(fetchList);
  const pageRef = useRef(page);
  useEffect(() => {
    fetchListRef.current = fetchList;
    pageRef.current = page;
  });

  useEffect(() => {
    loadClients();
    loadCounts();
  }, [loadClients, loadCounts]);

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  // poll: fast while the AI is working, slow otherwise
  const aiBusy = (counts?.aiPending || 0) > 0;
  useEffect(() => {
    const timer = setInterval(
      () => {
        loadCounts();
        if (aiBusy && pageRef.current === 1) fetchListRef.current(1, { silent: true });
      },
      aiBusy ? 5000 : 20000
    );
    return () => clearInterval(timer);
  }, [aiBusy, loadCounts]);

  // when the AI finishes, refresh everything once
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !aiBusy) {
      fetchListRef.current(1, { silent: true });
      loadClients();
    }
    wasBusy.current = aiBusy;
  }, [aiBusy, loadClients]);

  const openEmail = useCallback(
    async (id) => {
      const rid = ++detailReq.current;
      setSelectedId(id);
      setDetail(null);
      setDetailLoading(true);
      try {
        const email = await svc.getEmail(id);
        if (rid !== detailReq.current) return;
        setDetail(email);
        setEmails((prev) => prev.map((e) => (e._id === id ? { ...e, isRead: true } : e)));
        loadCounts();
      } catch (e) {
        if (rid === detailReq.current) {
          notify(errMsg(e), "error");
          setSelectedId(null);
        }
      } finally {
        if (rid === detailReq.current) setDetailLoading(false);
      }
    },
    [loadCounts, notify]
  );

  const handleUpdated = useCallback(
    (email) => {
      setDetail(email);
      setEmails((prev) => prev.map((e) => (e._id === email._id ? { ...e, ...email } : e)));
      loadCounts();
      loadClients();
      if (pageRef.current === 1) fetchListRef.current(1, { silent: true });
    },
    [loadCounts, loadClients]
  );

  const handleTab = (t) => {
    setTab(t);
    setStatus(defaultStatus(t));
  };

  const handleSync = async () => {
    if (!clientId) return;
    setSyncing(true);
    try {
      const { created } = await svc.syncClient(clientId);
      notify(`${created} new emails arrived. The AI is reading them now.`);
      await Promise.all([loadCounts(), loadClients()]);
      fetchList(1, { silent: true });
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    try {
      const res = await svc.analyzePending(true);
      if (res.skipped) notify("Analysis is already running. Results will appear shortly.");
      else if (res.failed) notify(`${res.done} analyzed, ${res.failed} still failing. Try again in a minute.`, "error");
      else notify(`${res.done} email${res.done === 1 ? "" : "s"} analyzed.`);
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setAnalyzing(false);
      loadCounts();
      loadClients();
      fetchList(1, { silent: true });
    }
  };

  const activeClient = clients.find((c) => c._id === clientId) || null;

  return (
    <div className="app-shell fixed inset-0 flex overflow-hidden bg-black text-neutral-100">
      <AssistantSidebar className="hidden lg:flex" user={user} clients={clients} activeClientId={clientId} onSelect={setClientId} onAddClient={() => setAddOpen(true)} onLogout={logout} />

      <InboxPane
        className={selectedId ? "hidden md:flex" : "flex"}
        clients={clients}
        activeClient={activeClient}
        onSelectClient={setClientId}
        tab={tab}
        onTab={handleTab}
        counts={counts}
        status={status}
        onStatus={setStatus}
        label={label}
        onLabel={setLabel}
        unread={unread}
        onUnread={setUnread}
        q={q}
        onQ={setQ}
        emails={emails}
        listLoading={listLoading}
        listError={listError}
        total={total}
        hasMore={page < pages}
        onLoadMore={() => fetchList(page + 1)}
        selectedId={selectedId}
        onSelect={openEmail}
        onSync={handleSync}
        syncing={syncing}
        analyzing={analyzing}
        onAnalyze={handleAnalyzeAll}
        onLogout={logout}
        onAddClient={() => setAddOpen(true)}
      />

      <main className={`relative min-h-0 min-w-0 flex-1 ${selectedId ? "block" : "hidden md:block"}`}>
        {selectedId ? (
          <AssistantEmailDetail email={detail} loading={detailLoading} onBack={() => setSelectedId(null)} onUpdated={handleUpdated} notify={notify} />
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/30">
                <Icon name="spark" className="h-6 w-6" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-bold">
                {counts?.assistantQueue ? `${counts.assistantQueue} email${counts.assistantQueue === 1 ? " is" : "s are"} waiting for you` : "You’re all caught up"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">Pick an email to read the AI’s summary, check who should reply, and edit the draft before it goes out.</p>
            </div>
          </div>
        )}
      </main>

      <AddClientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onLinked={(c) => {
          setAddOpen(false);
          notify(`${c.name} is now your client. Sync their mailbox to bring in emails.`);
          loadClients();
          setClientId(c._id);
        }}
      />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}