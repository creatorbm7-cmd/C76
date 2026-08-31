export default function ConnectionPill({ status }: { status: "connecting" | "connected" | "offline" }) {
  const map = {
    connected: { label: "LIVE", color: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-400/30" },
    connecting: { label: "SYNCING", color: "bg-amber-400", text: "text-amber-300", ring: "ring-amber-400/30" },
    offline: { label: "OFFLINE", color: "bg-red-400", text: "text-red-300", ring: "ring-red-400/30" },
  }[status];
  return (
    <div className={`inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 ring-1 ${map.ring} backdrop-blur-md`}>
      <span className={`inline-flex h-2 w-2 rounded-full ${map.color}`} />
      <span className={`text-[10px] font-bold tracking-[0.2em] ${map.text}`}>{map.label}</span>
    </div>
  );
}
