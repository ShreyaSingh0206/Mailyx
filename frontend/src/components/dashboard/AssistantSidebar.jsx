import { initials } from "../../lib/format";
import { Icon } from "../ui/Icons";

const providerText = (c) => ({ gmail: "Gmail", outlook: "Outlook" })[c.emailAccount?.provider] || "Not connected";

function Row({ active, onClick, name, sub, count, children }) {
  return (
    <li>
      <button
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        className={`relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left ${active ? "bg-neutral-900" : "hover:bg-neutral-950"}`}
      >
        {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-amber-400" />}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-medium text-neutral-200 ring-1 ring-neutral-800">{children}</span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm ${active ? "font-semibold text-neutral-50" : "text-neutral-200"}`}>{name}</span>
          <span className="block truncate text-xs text-neutral-500">{sub}</span>
        </span>
        {count > 0 && (
          <span className="rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-black" title={`${count} waiting for you`}>
            {count}
          </span>
        )}
      </button>
    </li>
  );
}

export default function AssistantSidebar({ user, clients, activeClientId, onSelect, onAddClient, onLogout, className = "" }) {
  const total = clients.reduce((n, c) => n + (c.counts?.assistantReply || 0), 0);
  const connected = clients.filter((c) => c.emailAccount?.provider).length;

  return (
    <aside className={`w-64 shrink-0 flex-col border-r border-neutral-800 bg-black ${className}`}>
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400 text-black">
          <Icon name="mail" className="h-4 w-4" />
        </span>
        <span className="font-display text-xl font-bold tracking-tight">Mailyx</span>
      </div>

      <nav className="relative flex-1 overflow-y-auto overscroll-contain px-3" aria-label="Clients">
        <ul className="space-y-0.5">
          <Row active={activeClientId === null} onClick={() => onSelect(null)} name="All clients" sub={`${connected} of ${clients.length} mailboxes connected`} count={total}>
            <Icon name="users" className="h-4 w-4" />
          </Row>
          {clients.map((c) => (
            <Row key={c._id} active={activeClientId === c._id} onClick={() => onSelect(c._id)} name={c.name} sub={providerText(c)} count={c.counts?.assistantReply || 0}>
              {initials(c.name)}
            </Row>
          ))}
        </ul>

        <button onClick={onAddClient} className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-neutral-800 px-3 py-2 text-sm text-neutral-400 hover:border-amber-400/40 hover:text-amber-200">
          <Icon name="plus" className="h-4 w-4" />
          Add a client
        </button>
      </nav>

      <div className="flex items-center gap-3 border-t border-neutral-800 p-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-400 text-xs font-semibold text-black">{initials(user?.name)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user?.name}</span>
          <span className="block text-xs text-neutral-500">Personal assistant</span>
        </span>
        <button onClick={onLogout} aria-label="Log out" title="Log out" className="rounded-md p-2 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-100">
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}