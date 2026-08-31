import { create } from "zustand";

export type BetMode = "manual" | "auto";
export type RiskLevel = "low" | "medium" | "high";

export interface Stake {
  id: string;
  amount: number;
  autoCashout: number;
  mode: BetMode;
  risk: RiskLevel;
  active: boolean;
}

interface DtxState {
  // wallet
  balance: number;
  setBalance: (n: number) => void;

  // multi-bet stakes
  stakes: Stake[];
  addStake: () => void;
  removeStake: (id: string) => void;
  updateStake: (id: string, patch: Partial<Stake>) => void;

  // ui
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // realtime
  connection: "connected" | "connecting" | "offline";
  setConnection: (c: DtxState["connection"]) => void;
}

const newStake = (i = 1): Stake => ({
  id: crypto.randomUUID(),
  amount: 1,
  autoCashout: 2,
  mode: "manual",
  risk: "medium",
  active: i === 1,
});

export const useDtxStore = create<DtxState>((set) => ({
  balance: 0,
  setBalance: (n) => set((s) => {
    const balance = Number.isFinite(n) ? n : 0;
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("dtx:balance-updated", { detail: { balance } }));
      }, 0);
    }
    if (s.balance === balance) return s;
    return { balance };
  }),

  stakes: [newStake(1)],
  addStake: () =>
    set((s) => (s.stakes.length >= 3 ? s : { stakes: [...s.stakes, newStake(s.stakes.length + 1)] })),
  removeStake: (id) =>
    set((s) => ({ stakes: s.stakes.length > 1 ? s.stakes.filter((x) => x.id !== id) : s.stakes })),
  updateStake: (id, patch) =>
    set((s) => ({ stakes: s.stakes.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  connection: "connecting",
  setConnection: (connection) => set({ connection }),
}));
