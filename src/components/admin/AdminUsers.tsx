import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useCountUp } from "./adminV8Kit";
import { supabase } from "@/integrations/supabase/client";

// Lazy 3D users-network scene — only loads on AdminUsers, no impact on other pages
const UsersScene = lazy(() => import("./UsersScene"));
import {
  Search, Eye, CreditCard, Ban, Gift, UserX, UserCheck,
  RotateCcw, UserPlus, Megaphone, ArrowUpDown, ArrowUp, ArrowDown,
  Users as UsersIcon, Wallet, ShieldCheck, ShieldAlert, Download,
  Sparkles, Crown, Flame, Zap, TrendingUp, Radio,
} from "lucide-react";
import AdminBroadcastDialog from "./AdminBroadcastDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 20;
// Every read below is capped. Search, sort, the stat strip and the CSV export
// all run over the whole `users` array in the browser, so the page cannot ask
// for fewer rows than it shows without those going server-side too — that
// needs a profiles+wallets view this client cannot create. Until it exists the
// cap keeps the dashboard from pulling an unbounded table, and the banner says
// so instead of silently showing a partial list as if it were everything.
const ROW_CAP = 1000;
const KYC_OPTIONS = ["pending", "verified", "rejected"];

const STATUS_PILL: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40 shadow-[0_0_12px_rgba(255,201,53,0.25)]",
  suspended: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
  banned:    "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]",
};
const KYC_PILL: Record<string, string> = {
  pending:  "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  verified: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
};

type SortKey = "email" | "balance" | "total_wagered" | "joined" | "total_bets";
type FilterKey = "all" | "active" | "suspended" | "banned" | "kyc_pending";

const STATUS_FILTERS: { key: FilterKey; label: string; tone: string; icon: any }[] = [
  { key: "all",         label: "All Users",   tone: "amber",   icon: UsersIcon },
  { key: "active",      label: "Active",      tone: "emerald", icon: Radio },
  { key: "suspended",   label: "Suspended",   tone: "amber",   icon: ShieldAlert },
  { key: "banned",      label: "Banned",      tone: "rose",    icon: Ban },
  { key: "kyc_pending", label: "KYC Pending", tone: "cyan",    icon: ShieldCheck },
];

// useCountUp is imported from ./adminV8Kit (shared count-up hook).

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userBets, setUserBets] = useState<any[]>([]);
  const [userTxs, setUserTxs] = useState<any[]>([]);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusReason, setBonusReason] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<any>(null);
  // Ban and suspend lock a real player out, so they go through a confirm step
  // like any other destructive action. Unban is restorative and stays instant.
  const [statusTarget, setStatusTarget] = useState<{ user: any; status: "suspended" | "banned" } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [walletsRes, profilesRes, depositsRes] = await Promise.all([
      supabase.from("casino_wallets").select("*").limit(ROW_CAP),
      supabase.from("profiles")
        .select("id, email, full_name, created_at, account_status, kyc_status")
        .order("created_at", { ascending: false })
        .limit(ROW_CAP),
      supabase.from("user_deposit_addresses").select("user_id, address, chain").limit(ROW_CAP),
    ]);

    // A failed read used to fall through as `|| []`, so an outage looked
    // identical to an empty casino. Say which read failed instead.
    const failed = [
      walletsRes.error && "wallets",
      profilesRes.error && "profiles",
      depositsRes.error && "deposit addresses",
    ].filter(Boolean) as string[];
    if (failed.length) {
      setLoadError(`Could not load ${failed.join(", ")}. Figures below are incomplete.`);
    }

    const wallets = walletsRes.data || [];
    const profiles = profilesRes.data || [];
    const depositAddrs = depositsRes.data || [];
    setTruncated(profiles.length >= ROW_CAP);

    // Bet counts used to come from `casino_bets.select("user_id")` — every bet
    // row ever recorded, fetched on each mount purely to length-count them per
    // user. Scope it to the profiles actually loaded, in chunks so the URL
    // cannot overflow. Still row-based; a grouped count needs the view.
    const betCounts: Record<string, number> = {};
    const ids = profiles.map(p => p.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data: betsData } = await supabase
        .from("casino_bets").select("user_id").in("user_id", ids.slice(i, i + 200));
      (betsData || []).forEach(b => { betCounts[b.user_id] = (betCounts[b.user_id] || 0) + 1; });
    }

    const addrMap: Record<string, string> = {};
    (depositAddrs || []).forEach(d => { if (!addrMap[d.user_id]) addrMap[d.user_id] = d.address; });

    const merged = profiles.map(p => {
      const w = wallets.find(wl => wl.user_id === p.id);
      return {
        id: p.id,
        email: p.email || "—",
        username: p.full_name || "—",
        balance: Number(w?.balance || 0),
        total_wagered: Number(w?.total_wagered || 0),
        total_won: Number(w?.total_won || 0),
        total_bets: betCounts[p.id] || 0,
        joined: p.created_at,
        account_status: (p as any).account_status || "active",
        kyc_status: (p as any).kyc_status || "pending",
        wallet_address: addrMap[p.id] || "—",
      };
    });
    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.account_status === "active").length,
    suspended: users.filter(u => u.account_status === "suspended").length,
    banned: users.filter(u => u.account_status === "banned").length,
    kycPending: users.filter(u => u.kyc_status === "pending").length,
    kycVerified: users.filter(u => u.kyc_status === "verified").length,
    totalBalance: users.reduce((s, u) => s + u.balance, 0),
    totalWagered: users.reduce((s, u) => s + u.total_wagered, 0),
    totalBets: users.reduce((s, u) => s + u.total_bets, 0),
    topBalance: users.reduce((max, u) => u.balance > max ? u.balance : max, 0),
  }), [users]);

  const filtered = useMemo(() => {
    let r = users;
    if (filter === "active") r = r.filter(u => u.account_status === "active");
    else if (filter === "suspended") r = r.filter(u => u.account_status === "suspended");
    else if (filter === "banned") r = r.filter(u => u.account_status === "banned");
    else if (filter === "kyc_pending") r = r.filter(u => u.kyc_status === "pending");
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(u =>
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.wallet_address.toLowerCase().includes(q)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [users, filter, search, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [filter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ArrowUpDown className="h-3 w-3 opacity-30 inline ml-1" /> :
    sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-amber-400 inline ml-1" /> :
    <ArrowDown className="h-3 w-3 text-amber-400 inline ml-1" />;

  const exportCSV = () => {
    const rows = [
      ["Email", "Username", "Balance", "Wagered", "Won", "Bets", "KYC", "Status", "Joined", "Wallet"],
      ...filtered.map(u => [
        u.email, u.username, u.balance.toFixed(2), u.total_wagered.toFixed(2),
        u.total_won.toFixed(2), u.total_bets, u.kyc_status, u.account_status,
        u.joined ? new Date(u.joined).toISOString() : "", u.wallet_address,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `users-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} users`);
  };

  const handleCreateUser = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Enter a valid email address"); return; }
    const startingBalance = newBalance ? parseFloat(newBalance) : 0;
    if (Number.isNaN(startingBalance) || startingBalance < 0) { toast.error("Starting balance must be non-negative"); return; }
    setCreateLoading(true);
    try {
      const pin = sessionStorage.getItem("dtx_admin_auth");
      const { data, error } = await supabase.functions.invoke("admin-casino", {
        body: { action: "create_user", email, full_name: newFullName.trim() || null, starting_balance: startingBalance },
        headers: pin ? { "x-admin-pin-session": pin } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Created ${email}${startingBalance > 0 ? ` with $${startingBalance.toFixed(2)}` : ""}`);
      setCreateOpen(false);
      setNewEmail(""); setNewFullName(""); setNewBalance("");
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed to create user"); }
    setCreateLoading(false);
  };

  const handleResetBalance = async () => {
    if (!resetTarget) return;
    // The `admin_reset_user_balance` RPC does not exist server-side; resetting a
    // real-money balance is a sensitive op that needs a proper audited backend.
    // Until that ships, surface a clear message instead of throwing a raw
    // "function does not exist" error.
    toast.info("Balance reset isn't available yet — needs an audited backend action.");
    setResetTarget(null);
  };

  const viewUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    setSelectedUser(user);
    const { data } = await supabase.from("casino_bets").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(30);
    setUserBets(data || []);
  };

  const viewTxHistory = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    setSelectedUser(user);
    const { data } = await supabase.from("casino_transactions").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(50);
    setUserTxs(data || []);
    setTxModalOpen(true);
  };

  const updateAccountStatus = async (userId: string, status: string) => {
    setActionLoading(true);
    const { error } = await supabase.from("profiles").update({ account_status: status } as any).eq("id", userId);
    if (error) toast.error("Failed to update status");
    else {
      toast.success(`User ${status}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, account_status: status } : u));
      if (selectedUser?.id === userId) setSelectedUser((prev: any) => ({ ...prev, account_status: status }));
    }
    setActionLoading(false);
  };

  const updateKyc = async (userId: string, kyc: string) => {
    const { error } = await supabase.from("profiles").update({ kyc_status: kyc } as any).eq("id", userId);
    if (error) toast.error("Failed to update KYC");
    else {
      toast.success(`KYC set to ${kyc}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, kyc_status: kyc } : u));
    }
  };

  const handleEditBalance = async (type: "credit" | "debit") => {
    if (!selectedUser || !editAmount) return;
    setActionLoading(true);
    try {
      const amt = parseFloat(editAmount);
      const action = type === "credit" ? "credit_balance" : "debit_balance";
      const { data, error } = await supabase.functions.invoke("admin-casino", {
        body: { action, target_user_id: selectedUser.id, amount: amt, note: editReason },
        headers: sessionStorage.getItem("dtx_admin_auth") ? { "x-admin-pin-session": sessionStorage.getItem("dtx_admin_auth") as string } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Balance ${type}ed: $${amt}`);
      setEditAmount(""); setEditReason("");
      load();
    } catch (e: any) { toast.error(e.message); }
    setActionLoading(false);
  };

  const handleBonus = async () => {
    if (!selectedUser || !bonusAmount) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-casino", {
        body: { action: "credit_balance", target_user_id: selectedUser.id, amount: parseFloat(bonusAmount), note: `Bonus: ${bonusReason}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Bonus of $${bonusAmount} credited`);
      setBonusAmount(""); setBonusReason("");
      load();
    } catch (e: any) { toast.error(e.message); }
    setActionLoading(false);
  };

  // ═══════════════════ RENDER ═══════════════════
  return (
    <div className="relative">
      {/* V8 PREMIUM GLOBAL STYLES */}
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0;} 100%{background-position:200% 0;} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(245,158,11,0.4);} 50%{box-shadow:0 0 40px rgba(245,158,11,0.6);} }
        @keyframes float-up { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.5;transform:scale(1.3);} }
        @keyframes scan { 0%{transform:translateX(-100%);} 100%{transform:translateX(100%);} }
        .v8-card { animation: float-up 0.4s ease-out backwards; }
        .v8-tilt { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s; transform-style: preserve-3d; }
        .v8-tilt:hover { transform: perspective(800px) rotateX(2deg) rotateY(-2deg) translateY(-2px); }
        .v8-gradient-border { position: relative; }
        .v8-gradient-border::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
          background: linear-gradient(135deg, rgba(245,158,11,0.4), rgba(244,63,94,0.2), rgba(255, 201, 53,0.3));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
        }
        .v8-mesh-bg {
          background-image:
            radial-gradient(at 20% 10%, rgba(245,158,11,0.08) 0px, transparent 50%),
            radial-gradient(at 80% 30%, rgba(244,63,94,0.06) 0px, transparent 50%),
            radial-gradient(at 50% 80%, rgba(255, 201, 53,0.05) 0px, transparent 50%),
            radial-gradient(at 90% 90%, rgba(56,189,248,0.06) 0px, transparent 50%);
        }
        .v8-glow-pill { animation: pulse-glow 2.5s ease-in-out infinite; }
        .v8-pulse-dot { animation: pulse-dot 1.8s ease-in-out infinite; }
        .v8-scan::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(245,158,11,0.06), transparent);
          animation: scan 3s ease-in-out infinite; pointer-events: none;
        }
        .v8-mono-num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; letter-spacing: -0.02em; }
        .v8-row { transition: transform 0.15s, background 0.2s; }
        .v8-row:hover { transform: translateX(2px); background: rgba(245,158,11,0.04) !important; }
        .v8-action-btn { transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1); }
        .v8-action-btn:hover { transform: translateY(-1px) scale(1.08); }
      `}</style>

      {/* MESH GRADIENT BG */}
      <div className="absolute inset-0 v8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-5">
        {loadError && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
            {loadError}
          </div>
        )}
        {truncated && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            Showing the {ROW_CAP.toLocaleString()} newest accounts. Totals, search and the CSV
            export cover these rows only — not the full user base.
          </div>
        )}

        {/* ═══ 3D HERO — USER COMMAND CENTER ═══ */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 v8-gradient-border"
             style={{
               background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(244,63,94,0.06), rgba(255,255,255,0.45))",
               boxShadow: "0 12px 40px -12px rgba(245,158,11,0.25), inset 0 1px 0 rgba(15,23,42,0.04)",
             }}>

          {/* 3D background scene — lazy-loaded, transparent */}
          <div className="absolute inset-0 opacity-95 pointer-events-none">
            <Suspense fallback={<div className="w-full h-full" />}>
              <UsersScene height={220} nodeCount={36} />
            </Suspense>
          </div>

          {/* dark vignette so text stays legible */}
          <div className="absolute inset-0 pointer-events-none"
               style={{
                 background:
                   "radial-gradient(ellipse at 30% 50%, transparent 0%, rgba(255,255,255,0.35) 60%, rgba(255,255,255,0.65) 100%)",
               }} />

          {/* content overlay */}
          <div className="relative z-10 p-5 flex items-center justify-between flex-wrap gap-3 min-h-[220px]">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-1">
                <div className="relative">
                  <Crown className="h-5 w-5 text-amber-300"
                         style={{ filter: "drop-shadow(0 0 10px rgba(245,158,11,0.8)) drop-shadow(0 0 18px rgba(245,158,11,0.4))" }} />
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/70 font-bold">
                  Admin · Command Center
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none"
                  style={{
                    background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #f43f5e 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: "0 0 28px rgba(245,158,11,0.3)",
                    filter: "drop-shadow(0 2px 8px rgba(15,23,42,0.6))",
                  }}>
                USERS NETWORK
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 ring-emerald-500/40 text-[10px] font-bold text-emerald-300 tracking-wider backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 v8-pulse-dot" />
                  V8 · 3D LIVE
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 ring-amber-500/35 text-[10px] font-bold text-amber-200 tracking-wider backdrop-blur">
                  <UsersIcon className="h-3 w-3" />
                  <span className="v8-mono-num">{stats.total}</span> ACCOUNTS
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 ring-rose-500/35 text-[10px] font-bold text-rose-200 tracking-wider backdrop-blur">
                  <Flame className="h-3 w-3" />
                  TOP <span className="v8-mono-num">${stats.topBalance.toFixed(0)}</span>
                </span>
              </div>

              <p className="text-[11px] text-white/55 mt-3 tracking-wide leading-relaxed max-w-sm">
                Live player network · <span className="text-emerald-300 font-bold">{stats.active}</span> online ·{" "}
                <span className="text-amber-300 font-bold v8-mono-num">${stats.totalBalance.toFixed(0)}</span> total balance ·{" "}
                <span className="text-rose-300 font-bold v8-mono-num">${stats.totalWagered.toFixed(0)}</span> wagered
              </p>
            </div>

            {/* action buttons — kept on right, glass-style so the 3D shows through */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={exportCSV}
                className="v8-action-btn px-3 py-2 rounded-lg text-xs font-semibold text-white/90 bg-black/30 backdrop-blur border border-white/15 hover:border-white/30 hover:bg-black/45 flex items-center gap-1.5 shadow-lg">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button onClick={() => setBroadcastOpen(true)}
                className="v8-action-btn px-3 py-2 rounded-lg text-xs font-semibold text-orange-200 bg-orange-500/15 backdrop-blur border border-orange-500/40 hover:bg-orange-500/25 flex items-center gap-1.5 shadow-lg"
                style={{ boxShadow: "0 4px 16px -4px rgba(249,115,22,0.35)" }}>
                <Megaphone className="h-3.5 w-3.5" /> Broadcast
              </button>
              <button onClick={() => setCreateOpen(true)}
                className="v8-action-btn px-3.5 py-2 rounded-lg text-xs font-bold text-black flex items-center gap-1.5"
                style={{
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  boxShadow: "0 4px 22px -4px rgba(245,158,11,0.7), inset 0 1px 0 rgba(15,23,42,0.4)",
                }}>
                <UserPlus className="h-3.5 w-3.5" /> NEW USER
              </button>
            </div>
          </div>
        </div>

        {/* ═══ V8 KPI CARDS — 3D TILT ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PremiumStatCard
            icon={<UsersIcon className="h-4 w-4" />}
            label="Total Users"
            value={stats.total}
            sub={`${stats.active} active now`}
            tone="amber"
            delay={0}
          />
          <PremiumStatCard
            icon={<Wallet className="h-4 w-4" />}
            label="Total Balance"
            value={stats.totalBalance}
            prefix="$"
            decimals={0}
            sub={`$${stats.totalWagered.toFixed(0)} wagered`}
            tone="emerald"
            delay={80}
          />
          <PremiumStatCard
            icon={<Flame className="h-4 w-4" />}
            label="Total Bets"
            value={stats.totalBets}
            sub={`Avg ${stats.total > 0 ? Math.round(stats.totalBets/stats.total) : 0}/user`}
            tone="rose"
            delay={160}
          />
          <PremiumStatCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="KYC Status"
            value={stats.kycVerified}
            sub={`${stats.kycPending} pending review`}
            tone="cyan"
            delay={240}
            valueExtra={<span className="text-sm text-white/40 ml-1">/{stats.total}</span>}
          />
        </div>

        {/* ═══ SEARCH + FILTER ROW ═══ */}
        <div className="flex flex-col gap-3">
          <div className="relative max-w-xl">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-amber-400/70" />
              <span className="h-3 w-px bg-white/10" />
            </div>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by email, name, or wallet…"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(15,23,42,0.06)",
                backdropFilter: "blur(8px)",
                boxShadow: "inset 0 0 20px rgba(15,23,42,0.4)",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white px-2 py-1 text-xs">✕</button>
            )}
          </div>

          {/* Premium filter pills with glow on active */}
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map(f => {
              const Icon = f.icon;
              const count = f.key === "all" ? users.length :
                f.key === "kyc_pending" ? stats.kycPending :
                users.filter(u => u.account_status === f.key).length;
              const active = filter === f.key;
              const glowMap: Record<string, string> = {
                amber: "0 0 24px rgba(245,158,11,0.5)",
                emerald: "0 0 24px rgba(255, 201, 53,0.5)",
                rose: "0 0 24px rgba(244,63,94,0.5)",
                cyan: "0 0 24px rgba(56,189,248,0.5)",
              };
              const bgMap: Record<string, string> = {
                amber: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.08))",
                emerald: "linear-gradient(135deg, rgba(255, 201, 53,0.25), rgba(255, 201, 53,0.08))",
                rose: "linear-gradient(135deg, rgba(244,63,94,0.25), rgba(244,63,94,0.08))",
                cyan: "linear-gradient(135deg, rgba(56,189,248,0.25), rgba(56,189,248,0.08))",
              };
              const textMap: Record<string, string> = {
                amber: "text-amber-300",
                emerald: "text-emerald-300",
                rose: "text-rose-300",
                cyan: "text-cyan-300",
              };
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`v8-action-btn px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all ${active ? textMap[f.tone] : "text-white/40 hover:text-white/70"}`}
                  style={{
                    background: active ? bgMap[f.tone] : "rgba(15,23,42,0.025)",
                    border: active ? `1px solid rgba(15,23,42,0.15)` : "1px solid rgba(15,23,42,0.05)",
                    boxShadow: active ? glowMap[f.tone] : "none",
                  }}
                >
                  <Icon className="h-3 w-3" />
                  {f.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] v8-mono-num ${active ? "bg-black/30" : "bg-white/[0.04]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AdminBroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />

        {/* Create user dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md" style={{ background: "linear-gradient(180deg, #ffffff, #ffffff)", borderColor: "rgba(245,158,11,0.2)" }}>
            <DialogHeader>
              <DialogTitle className="text-white text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" /> Create New User
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Field label="Email *" value={newEmail} onChange={setNewEmail} placeholder="player@example.com" type="email" />
              <Field label="Full name (optional)" value={newFullName} onChange={setNewFullName} placeholder="Jane Doe" />
              <Field label="Starting balance USDT" value={newBalance} onChange={setNewBalance} placeholder="0.00" type="number" />
              <p className="text-[10px] text-white/30 leading-relaxed">
                Account created with email auto-confirmed. Profile, wallet, role rows fire via DB triggers.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={createLoading} className="text-xs h-8">Cancel</Button>
              <Button size="sm" onClick={handleCreateUser} disabled={createLoading || !newEmail}
                className="text-xs h-8 font-bold text-black"
                style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}>
                {createLoading ? "Creating…" : "🎰 Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══ PREMIUM USERS TABLE ═══ */}
        <div className="rounded-2xl border overflow-hidden v8-gradient-border relative"
             style={{ background: "rgba(255,255,255,0.6)", borderColor: "rgba(15,23,42,0.06)", backdropFilter: "blur(20px)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[920px]">
              <thead>
                <tr className="text-white/50 border-b" style={{ borderColor: "rgba(15,23,42,0.06)", background: "rgba(255,255,255,0.3)" }}>
                  <Th onClick={() => toggleSort("email")} className="text-left">Player <SortIcon k="email" /></Th>
                  <Th className="text-left">Wallet</Th>
                  <Th onClick={() => toggleSort("balance")} className="text-right">Balance <SortIcon k="balance" /></Th>
                  <Th onClick={() => toggleSort("total_wagered")} className="text-right">Wagered <SortIcon k="total_wagered" /></Th>
                  <Th onClick={() => toggleSort("total_bets")} className="text-right">Bets <SortIcon k="total_bets" /></Th>
                  <Th className="text-center">KYC</Th>
                  <Th className="text-center">Status</Th>
                  <Th onClick={() => toggleSort("joined")} className="text-right">Joined <SortIcon k="joined" /></Th>
                  <Th className="text-center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-16 text-center text-white/30 text-xs">
                    <div className="inline-flex items-center gap-2">
                      <Zap className="h-3 w-3 text-amber-400 v8-pulse-dot" /> Loading user data…
                    </div>
                  </td></tr>
                ) : pageUsers.length === 0 ? (
                  <tr><td colSpan={9} className="p-16 text-center text-white/30 text-xs">
                    No users match the current filter
                  </td></tr>
                ) : pageUsers.map((u, i) => {
                  const isHighRoller = u.total_wagered > 1000;
                  return (
                    <tr key={u.id} className="v8-row border-b" style={{ borderColor: "rgba(15,23,42,0.03)", background: i % 2 === 0 ? "transparent" : "rgba(15,23,42,0.008)" }}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar email={u.email} status={u.account_status} />
                          <div className="min-w-0">
                            <div className="text-white/90 truncate max-w-[160px] flex items-center gap-1">
                              {u.email}
                              {isHighRoller && <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" />}
                            </div>
                            {u.username !== "—" && <div className="text-[10px] text-white/30 truncate max-w-[160px]">{u.username}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-white/40 font-mono text-[10px]">
                        {u.wallet_address !== "—" ? `${u.wallet_address.slice(0, 6)}…${u.wallet_address.slice(-4)}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="font-bold text-amber-300 v8-mono-num"
                             style={{ textShadow: u.balance > 100 ? "0 0 8px rgba(245,158,11,0.4)" : "none" }}>
                          ${u.balance.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-white/60 v8-mono-num">${u.total_wagered.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-white/60 v8-mono-num">{u.total_bets}</td>
                      <td className="px-3 py-3 text-center">
                        <Select value={u.kyc_status} onValueChange={v => updateKyc(u.id, v)}>
                          <SelectTrigger className={`h-6 w-24 text-[10px] border-0 mx-auto ${KYC_PILL[u.kyc_status] || ""}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {KYC_OPTIONS.map(k => <SelectItem key={k} value={k} className="text-xs capitalize">{k}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_PILL[u.account_status] || ""}`}>
                          {u.account_status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-white/40 text-[10px]">{u.joined ? new Date(u.joined).toLocaleDateString() : "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-0.5">
                          <IconBtn onClick={() => viewUser(u.id)} title="View bets" tone="white"><Eye className="h-3.5 w-3.5" /></IconBtn>
                          <IconBtn onClick={() => viewTxHistory(u.id)} title="Transactions" tone="orange"><CreditCard className="h-3.5 w-3.5" /></IconBtn>
                          {u.account_status === "active" ? (
                            <>
                              <IconBtn onClick={() => setStatusTarget({ user: u, status: "suspended" })} title="Suspend" tone="amber"><UserX className="h-3.5 w-3.5" /></IconBtn>
                              <IconBtn onClick={() => setStatusTarget({ user: u, status: "banned" })} title="Ban" tone="rose"><Ban className="h-3.5 w-3.5" /></IconBtn>
                            </>
                          ) : (
                            <IconBtn onClick={() => updateAccountStatus(u.id, "active")} title="Unban" tone="emerald"><UserCheck className="h-3.5 w-3.5" /></IconBtn>
                          )}
                          <IconBtn onClick={() => setResetTarget(u)} title="Reset Balance" tone="orange"><RotateCcw className="h-3.5 w-3.5" /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: "rgba(15,23,42,0.04)", background: "rgba(255,255,255,0.2)" }}>
              <span className="text-[10px] text-white/40 v8-mono-num">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-1">
                <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                  className="px-2 py-1 rounded text-[10px] text-white/40 hover:text-white/70 disabled:opacity-20">‹</button>
                {Array.from({ length: Math.min(pageCount, 7) }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                      page === i
                        ? "text-black"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                    }`}
                    style={page === i ? { background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "0 0 12px rgba(245,158,11,0.4)" } : {}}>
                    {i + 1}
                  </button>
                ))}
                <button disabled={page >= pageCount - 1} onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                  className="px-2 py-1 rounded text-[10px] text-white/40 hover:text-white/70 disabled:opacity-20">›</button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ USER DETAIL PANEL — PREMIUM ═══ */}
        {selectedUser && !txModalOpen && (
          <div className="rounded-2xl border p-5 space-y-4 v8-gradient-border relative overflow-hidden v8-card"
               style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))", borderColor: "rgba(245,158,11,0.3)", boxShadow: "0 8px 40px -8px rgba(245,158,11,0.25)" }}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
                 style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent 70%)", transform: "translate(30%, -30%)" }} />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar email={selectedUser.email} status={selectedUser.account_status} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate flex items-center gap-2">
                    {selectedUser.email}
                    {selectedUser.total_wagered > 1000 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[9px] font-bold ring-1 ring-amber-500/40">
                        <Crown className="h-2.5 w-2.5" /> HIGH ROLLER
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-white/30 font-mono truncate max-w-md">{selectedUser.id}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${STATUS_PILL[selectedUser.account_status]}`}>{selectedUser.account_status}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${KYC_PILL[selectedUser.kyc_status]}`}>KYC: {selectedUser.kyc_status}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedUser.account_status === "active" ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setStatusTarget({ user: selectedUser, status: "suspended" })} className="text-[10px] h-7 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"><UserX className="h-3 w-3 mr-1" />Suspend</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatusTarget({ user: selectedUser, status: "banned" })} className="text-[10px] h-7 border-rose-500/30 text-rose-300 hover:bg-rose-500/10"><Ban className="h-3 w-3 mr-1" />Ban</Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => updateAccountStatus(selectedUser.id, "active")} className="text-[10px] h-7 bg-emerald-600 hover:bg-emerald-500 text-white"><UserCheck className="h-3 w-3 mr-1" />Unban</Button>
                )}
                <button onClick={() => setSelectedUser(null)} className="text-white/30 hover:text-white text-xs px-2">✕</button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative z-10">
              {[
                { label: "Balance", value: `$${selectedUser.balance.toFixed(2)}`, color: "#fbbf24", glow: true },
                { label: "Wagered", value: `$${selectedUser.total_wagered.toFixed(2)}`, color: "#ffffff" },
                { label: "Won", value: `$${selectedUser.total_won.toFixed(2)}`, color: "#ffd76b" },
                { label: "Bets", value: selectedUser.total_bets, color: "#a3a3a3" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center border" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.2))", borderColor: "rgba(15,23,42,0.05)" }}>
                  <div className="text-[9px] text-white/30 uppercase tracking-widest">{s.label}</div>
                  <div className="text-sm font-black mt-1 v8-mono-num" style={{ color: s.color, textShadow: s.glow ? "0 0 12px rgba(245,158,11,0.4)" : "none" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Crypto deposit wallet (per-user HD address) */}
            <div className="rounded-xl p-3 border relative z-10" style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))", borderColor: "rgba(16,185,129,0.25)" }}>
              <h4 className="text-[10px] text-white/50 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Wallet className="h-3 w-3 text-emerald-400" /> Crypto Deposit Address {selectedUser.wallet_address !== "—" && <span className="text-emerald-300/70 normal-case tracking-normal">· TRC20</span>}
              </h4>
              {selectedUser.wallet_address !== "—" ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 text-[11px] break-all font-mono text-emerald-200 bg-black/25 rounded-lg px-2.5 py-2 border border-emerald-500/20">{selectedUser.wallet_address}</code>
                  <Button size="sm" variant="outline" className="text-[10px] h-8 flex-shrink-0 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => { try { navigator.clipboard.writeText(selectedUser.wallet_address); toast.success("Address copied"); } catch { /* noop */ } }}>Copy</Button>
                </div>
              ) : (
                <div className="text-[11px] text-white/45 leading-relaxed">
                  No address yet — derives automatically on the user's first crypto-deposit visit, once the HD Wallet seed is set (Finance → HD Wallet).
                </div>
              )}
            </div>

            {/* Balance edit + bonus side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
              <div className="space-y-2 rounded-xl p-3 border" style={{ background: "rgba(255,255,255,0.25)", borderColor: "rgba(15,23,42,0.05)" }}>
                <h4 className="text-[10px] text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3 text-amber-400" /> Adjust Balance
                </h4>
                <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="Amount" className="text-xs h-8" style={{ background: "rgba(255,255,255,0.4)", borderColor: "rgba(15,23,42,0.06)" }} />
                <Input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Reason / audit note" className="text-xs h-8" style={{ background: "rgba(255,255,255,0.4)", borderColor: "rgba(15,23,42,0.06)" }} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEditBalance("credit")} disabled={actionLoading} className="text-[10px] h-7 bg-emerald-600 hover:bg-emerald-500 text-white flex-1 font-bold">+ Credit</Button>
                  <Button size="sm" onClick={() => handleEditBalance("debit")} disabled={actionLoading} variant="outline" className="text-[10px] h-7 border-rose-500/30 text-rose-300 hover:bg-rose-500/10 flex-1 font-bold">– Debit</Button>
                </div>
              </div>
              <div className="space-y-2 rounded-xl p-3 border" style={{ background: "rgba(255,255,255,0.25)", borderColor: "rgba(245,158,11,0.15)" }}>
                <h4 className="text-[10px] text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                  <Gift className="h-3 w-3 text-amber-400" /> Send Bonus
                </h4>
                <Input type="number" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} placeholder="Bonus amount" className="text-xs h-8" style={{ background: "rgba(255,255,255,0.4)", borderColor: "rgba(15,23,42,0.06)" }} />
                <Input value={bonusReason} onChange={e => setBonusReason(e.target.value)} placeholder="Campaign / reason" className="text-xs h-8" style={{ background: "rgba(255,255,255,0.4)", borderColor: "rgba(15,23,42,0.06)" }} />
                <Button size="sm" onClick={handleBonus} disabled={actionLoading} className="text-[10px] h-7 text-black font-bold w-full"
                  style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "0 4px 16px -4px rgba(245,158,11,0.5)" }}>
                  🎁 Send Bonus
                </Button>
              </div>
            </div>

            {/* Bet history */}
            <div className="relative z-10">
              <h4 className="text-[10px] text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-400" /> Recent Bet History
              </h4>
              <div className="max-h-56 overflow-y-auto rounded-xl border" style={{ borderColor: "rgba(15,23,42,0.04)", background: "rgba(255,255,255,0.2)" }}>
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
                    <tr className="text-white/40">
                      <th className="text-left p-2">Game</th><th className="text-right p-2">Bet</th>
                      <th className="text-right p-2">Multi</th><th className="text-right p-2">Payout</th>
                      <th className="text-center p-2">Result</th><th className="text-right p-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userBets.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-white/30">No bets yet</td></tr>
                    ) : userBets.map((b: any) => (
                      <tr key={b.id} className="border-t v8-row" style={{ borderColor: "rgba(15,23,42,0.03)" }}>
                        <td className="p-2 text-white/80 capitalize">{b.game_type}</td>
                        <td className="p-2 text-right text-white/70 v8-mono-num">{Number(b.bet_amount).toFixed(2)}</td>
                        <td className="p-2 text-right text-amber-300 v8-mono-num">{b.multiplier ? `${Number(b.multiplier).toFixed(2)}x` : "—"}</td>
                        <td className="p-2 text-right text-white/70 v8-mono-num">{Number(b.payout || 0).toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${b.is_win ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                            {b.is_win ? "WIN" : "LOSS"}
                          </span>
                        </td>
                        <td className="p-2 text-right text-white/30">{b.created_at ? new Date(b.created_at).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Modal */}
        <Dialog open={txModalOpen} onOpenChange={setTxModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" style={{ background: "linear-gradient(180deg, #ffffff, #ffffff)", borderColor: "rgba(245,158,11,0.2)" }}>
            <DialogHeader>
              <DialogTitle className="text-white text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-400" /> Transaction History — {selectedUser?.email}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead><tr className="text-white/40">
                  <th className="text-left p-2">Type</th><th className="text-right p-2">Amount</th>
                  <th className="text-right p-2">Before</th><th className="text-right p-2">After</th>
                  <th className="text-left p-2">Description</th><th className="text-right p-2">Date</th>
                </tr></thead>
                <tbody>
                  {userTxs.map((tx: any) => (
                    <tr key={tx.id} className="border-t" style={{ borderColor: "rgba(15,23,42,0.03)" }}>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                          tx.type === "win" ? "bg-emerald-500/15 text-emerald-300" :
                          tx.type === "bet" ? "bg-orange-500/15 text-orange-300" :
                          tx.type === "deposit" ? "bg-cyan-500/15 text-cyan-300" :
                          tx.type === "withdraw" ? "bg-rose-500/15 text-rose-300" :
                          "bg-white/5 text-white/50"
                        }`}>{tx.type}</span>
                      </td>
                      <td className={`p-2 text-right font-mono ${Number(tx.amount) > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {Number(tx.amount) > 0 ? "+" : ""}{Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="p-2 text-right text-white/40 v8-mono-num">{tx.balance_before != null ? Number(tx.balance_before).toFixed(2) : "—"}</td>
                      <td className="p-2 text-right text-white/60 v8-mono-num">{tx.balance_after != null ? Number(tx.balance_after).toFixed(2) : "—"}</td>
                      <td className="p-2 text-white/40">{tx.description || "—"}</td>
                      <td className="p-2 text-right text-white/30">{new Date(tx.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {userTxs.length === 0 && <tr><td colSpan={6} className="text-center text-white/30 py-6">No transactions</td></tr>}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {statusTarget?.status === "banned" ? "Ban this user?" : "Suspend this user?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                <span className="block">User: <b>{statusTarget?.user?.email}</b></span>
                <span className="block mt-1">Balance: <b className="text-amber-400">${Number(statusTarget?.user?.balance ?? 0).toFixed(2)}</b></span>
                <span className="block mt-2 text-xs text-white/50">
                  {statusTarget?.status === "banned"
                    ? "They lose access immediately. Reversible from this table with Unban."
                    : "They cannot play or withdraw until reinstated. Reversible from this table."}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (statusTarget) { updateAccountStatus(statusTarget.user.id, statusTarget.status); setStatusTarget(null); } }}
                disabled={actionLoading}
                className={statusTarget?.status === "banned" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"}>
                {actionLoading ? "Working…" : statusTarget?.status === "banned" ? "Ban user" : "Suspend user"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset balance to $0?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="block">User: <b>{resetTarget?.email}</b></span>
                <span className="block mt-1">Current balance: <b className="text-amber-400">${Number(resetTarget?.balance ?? 0).toFixed(2)}</b></span>
                <span className="block mt-2 text-xs text-white/50">Sets balance, total_deposited, total_won to 0. Logged in audit_logs.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetBalance} disabled={actionLoading} className="bg-amber-600 hover:bg-amber-700">
                {actionLoading ? "Resetting…" : "Reset balance"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// PREMIUM SUB-COMPONENTS
// ════════════════════════════════════════════

function PremiumStatCard({ icon, label, value, sub, tone, delay, prefix = "", decimals = 0, valueExtra }: any) {
  const animated = useCountUp(typeof value === "number" ? value : 0, 900);
  const colorMap: Record<string, { bg: string; ring: string; glow: string; text: string }> = {
    amber:   { bg: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.04))", ring: "rgba(245,158,11,0.3)", glow: "0 0 30px rgba(245,158,11,0.3)", text: "#fbbf24" },
    emerald: { bg: "linear-gradient(135deg, rgba(255, 201, 53,0.18), rgba(255, 201, 53,0.04))", ring: "rgba(255, 201, 53,0.3)", glow: "0 0 30px rgba(255, 201, 53,0.3)", text: "#ffd76b" },
    rose:    { bg: "linear-gradient(135deg, rgba(244,63,94,0.18), rgba(244,63,94,0.04))",   ring: "rgba(244,63,94,0.3)",  glow: "0 0 30px rgba(244,63,94,0.3)",  text: "#fb7185" },
    cyan:    { bg: "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(56,189,248,0.04))", ring: "rgba(56,189,248,0.3)", glow: "0 0 30px rgba(56,189,248,0.3)", text: "#38bdf8" },
  };
  const c = colorMap[tone] || colorMap.amber;
  return (
    <div className="v8-card v8-tilt rounded-2xl p-4 border relative overflow-hidden"
         style={{ background: c.bg, borderColor: c.ring, boxShadow: c.glow, animationDelay: `${delay}ms` }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-50"
           style={{ background: `radial-gradient(circle, ${c.ring} 0%, transparent 70%)`, transform: "translate(40%, -40%)" }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] uppercase tracking-[0.15em] text-white/60 font-bold">{label}</div>
          <div style={{ color: c.text }}>{icon}</div>
        </div>
        <div className="text-2xl md:text-3xl font-black v8-mono-num" style={{ color: c.text, textShadow: `0 0 16px ${c.ring}` }}>
          {prefix}{decimals === 0 ? Math.round(animated).toLocaleString() : animated.toFixed(decimals)}
          {valueExtra}
        </div>
        {sub && <div className="text-[10px] text-white/40 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function Avatar({ email, status, size = "sm" }: { email: string; status?: string; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? 40 : 28;
  const letter = (email || "?").charAt(0).toUpperCase();
  // Simple hash to color
  const hue = Array.from(email || "").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const statusColor = status === "active" ? "#ffc935" : status === "suspended" ? "#f59e0b" : status === "banned" ? "#f43f5e" : "#71717a";
  return (
    <div className="relative flex-shrink-0">
      <div className="rounded-full flex items-center justify-center font-bold text-white"
           style={{
             width: dim, height: dim,
             background: `linear-gradient(135deg, hsl(${hue},70%,45%), hsl(${(hue+40)%360},70%,35%))`,
             fontSize: size === "lg" ? 14 : 10,
             boxShadow: `0 0 12px hsl(${hue},70%,45%,0.4), inset 0 1px 0 rgba(15,23,42,0.2)`,
           }}>
        {letter}
      </div>
      {status && (
        <div className="absolute -bottom-0.5 -right-0.5 rounded-full"
             style={{
               width: size === "lg" ? 12 : 9, height: size === "lg" ? 12 : 9,
               background: statusColor,
               boxShadow: `0 0 6px ${statusColor}, 0 0 0 2px #ffffff`,
             }} />
      )}
    </div>
  );
}

function Th({ children, className = "", onClick }: any) {
  return (
    <th onClick={onClick} className={`px-3 py-3 text-[10px] uppercase tracking-wider font-bold ${className} ${onClick ? "cursor-pointer hover:text-amber-300 transition-colors select-none" : ""}`}>
      {children}
    </th>
  );
}

function IconBtn({ children, onClick, title, tone }: any) {
  const colorMap: Record<string, string> = {
    white:   "text-white/50 hover:text-white hover:bg-white/[0.08]",
    orange:  "text-orange-400/70 hover:text-orange-300 hover:bg-orange-500/10",
    amber:   "text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10",
    rose:    "text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10",
    emerald: "text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10",
  };
  return (
    <button onClick={onClick} title={title} className={`v8-action-btn p-1.5 rounded-md transition-all ${colorMap[tone] || colorMap.white}`}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold">{label}</label>
      <Input value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} type={type} className="h-9 text-xs" />
    </div>
  );
}
