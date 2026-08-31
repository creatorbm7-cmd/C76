import lobby from "@/assets/dtx/hero-lobby.jpg";
import crash from "@/assets/dtx/hero-crash.jpg";
import mines from "@/assets/dtx/hero-mines.jpg";
import dice from "@/assets/dtx/hero-dice.jpg";
import wallet from "@/assets/dtx/hero-wallet.jpg";
import trading from "@/assets/dtx/hero-trading.jpg";
import vip from "@/assets/dtx/hero-vip.jpg";
import rewards from "@/assets/dtx/hero-rewards.jpg";

export type DtxThemeKey =
  | "lobby" | "crash" | "mines" | "dice" | "wallet"
  | "trading" | "vip" | "rewards" | "leaderboard";

export interface DtxTheme {
  key: DtxThemeKey;
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string; // tailwind text class for accent
}

export const DTX_THEMES: Record<DtxThemeKey, DtxTheme> = {
  lobby: {
    key: "lobby", image: lobby,
    eyebrow: "C7 Winners · Season Casinos",
    title: "Bet faster. Win brighter.",
    subtitle: "Real-time, provably fair, server-authoritative gameplay — premium next-generation crypto gaming.",
    accent: "text-dtx-mint",
  },
  crash: {
    key: "crash", image: crash,
    eyebrow: "Live now",
    title: "Crash",
    subtitle: "Ride the multiplier. Cash out before the rocket falls.",
    accent: "text-dtx-mint-bright",
  },
  mines: {
    key: "mines", image: mines,
    eyebrow: "High volatility",
    title: "Mines",
    subtitle: "Unlock the vault. Every tile a fortune — every step a risk.",
    accent: "text-dtx-mint",
  },
  dice: {
    key: "dice", image: dice,
    eyebrow: "Classic",
    title: "Dice",
    subtitle: "Pure provable fairness. Roll under, roll over — own the edge.",
    accent: "text-dtx-mint-bright",
  },
  wallet: {
    key: "wallet", image: wallet,
    eyebrow: "Treasury",
    title: "Your private vault.",
    subtitle: "Multi-chain deposits, instant withdrawals, encrypted at rest.",
    accent: "text-dtx-gold",
  },
  trading: {
    key: "trading", image: trading,
    eyebrow: "Markets",
    title: "Trading floor.",
    subtitle: "Leveraged positions, real-time PnL, fintech-grade execution.",
    accent: "text-dtx-mint",
  },
  vip: {
    key: "vip", image: vip,
    eyebrow: "By invitation",
    title: "VIP Lounge.",
    subtitle: "Private rakeback, dedicated host, signature rewards.",
    accent: "text-dtx-gold",
  },
  rewards: {
    key: "rewards", image: rewards,
    eyebrow: "Loyalty",
    title: "Rewards & Rakeback.",
    subtitle: "Daily, weekly, monthly — every wager counts toward gold tier.",
    accent: "text-dtx-gold",
  },
  leaderboard: {
    key: "leaderboard", image: rewards,
    eyebrow: "Compete",
    title: "Leaderboard.",
    subtitle: "Top wagerers and biggest wins — updated in real time.",
    accent: "text-dtx-gold",
  },
};
