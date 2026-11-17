const BAR = { success: "bg-emerald-400", error: "bg-rose-400" };

export default function Toasts({ toasts, dismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 shadow-xl shadow-black">
          <span className={`w-1 shrink-0 ${BAR[t.tone] || BAR.success}`} />
          <p className="flex-1 px-3 py-2.5 text-sm text-neutral-200">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="px-3 text-neutral-500 hover:text-neutral-200" aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}