import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// C7 Phase 1: shared FX layer
import "@/components/c7/c7-animations.css";
import "@/components/c7/c7-fx.css";
// C7 Premium: shared 3D luxury theme primitives (.c7p-*)
import "@/styles/c7premium.css";
import AudioManager from "@/lib/AudioManager";
import { PRESENTATION_ONLY } from "@/lib/presentationMode";
import { BrandedPageLoader } from "@/components/c7/BrandedLoader";
import ReferralCapture from "@/components/ReferralCapture";
import V2PortraitLock from "@/pages/v2/V2PortraitLock";
import V2SoundToggle from "@/pages/v2/V2SoundToggle";
import C7Splash from "@/components/c7/C7Splash";
import TapFX from "@/components/c7/TapFX";
import C7EnergyAura from "@/components/c7/C7EnergyAura";
import C7EarnBurst from "@/components/c7/C7EarnBurst";
import C7EarnWatch from "@/components/c7/C7EarnWatch";
import C7Hud from "@/components/c7/C7Hud";
import C7ReturnSummary from "@/components/c7/C7ReturnSummary";
import C7UpdateNudge from "@/components/c7/C7UpdateNudge";
import IgGlam from "@/components/ig/IgGlam";
import { ThemeProvider } from "@/providers/ThemeProvider";

// Eager load main pages (no blank screen)

// Lazy load others
const PromotionsPage = lazy(() => import("@/pages/dtx/DtxPromotionsPage"));
const SettingsPage = lazy(() => import("@/pages/dtx/DtxSettingsPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const TransactionsPage = lazy(() => import("@/pages/TransactionsPage"));
const AdminApiKeys = lazy(() => import("@/pages/AdminApiKeys"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const Terms         = lazy(() => import("@/pages/Terms"));
// Custom in-house mini-games (Crash / Mines / Plinko / Roulette / Blackjack /
// Slots / WinGo) retired — the catalog is 2J's 73 aggregator games + the C74
// Originals slot host only. Their routes now redirect into the 2J lobby.
const DepositHub = lazy(() => import("@/pages/DepositHub"));
const DemoDepositPage = lazy(() => import("@/pages/DemoDepositPage"));
const CryptoDepositPage = lazy(() => import("@/pages/CryptoDepositPage"));
const RazorpayDepositPage = lazy(() => import("@/pages/RazorpayDepositPage"));
const WithdrawPage = lazy(() => import("@/pages/WithdrawPage"));
const AgentPage = lazy(() => import("@/pages/dtx/AgentPage"));
const V3Lobby = lazy(() => import("@/pages/v3/V3Lobby"));
const V2Wallet = lazy(() => import("@/pages/v2/V2Wallet"));
const V2Vip = lazy(() => import("@/pages/v2/V2Vip"));
const V2GameDetail = lazy(() => import("@/pages/v2/V2GameDetail"));
const V2Analytics = lazy(() => import("@/pages/v2/V2Analytics"));
const V2Wheel = lazy(() => import("@/pages/v2/V2Wheel"));
const V2Refer = lazy(() => import("@/pages/v2/V2Refer"));
const V2Events = lazy(() => import("@/pages/v2/V2Events"));
const V2Profile = lazy(() => import("@/pages/v2/V2Profile"));
const V2Casino = lazy(() => import("@/pages/v2/V2Casino"));
const V2Rewards = lazy(() => import("@/pages/v2/V2Rewards"));
const C74SlotHost = lazy(() => import("@/pages/C74SlotHost"));
const GullakPage = lazy(() => import("@/pages/dtx/DtxGullakPage"));
const MissionsPage = lazy(() => import("@/pages/dtx/DtxMissionsPage"));
// /c74 redirects to the C74 Token Center (the old DtxC74HubPage was removed).
const TokenCenter = lazy(() => import("@/pages/c74/TokenCenter"));
const PlayMining = lazy(() => import("@/pages/c74/PlayMining"));
const C74Reputation = lazy(() => import("@/pages/c74/C74Reputation"));
const C74Claim = lazy(() => import("@/pages/c74/C74Claim"));
const KycPage = lazy(() => import("@/pages/KycPage"));
const TelegramConnect = lazy(() => import("@/pages/TelegramConnect"));
const IgHome = lazy(() => import("@/pages/ig/IgHome"));
const IgProfile = lazy(() => import("@/pages/ig/IgProfile"));
const IgExplore = lazy(() => import("@/pages/ig/IgExplore"));
const IgWallet = lazy(() => import("@/pages/ig/IgWallet"));
const IgReels = lazy(() => import("@/pages/ig/IgReels"));
const IgReelsFeed = lazy(() => import("@/pages/ig/IgReelsFeed"));
const IgOnboarding = lazy(() => import("@/pages/ig/IgOnboarding"));
const IgActivity = lazy(() => import("@/pages/ig/IgActivity"));
const IgNotifications = lazy(() => import("@/pages/ig/IgNotifications"));
const IgRewards = lazy(() => import("@/pages/ig/IgRewards"));
const IgContribution = lazy(() => import("@/pages/ig/IgContribution"));
const IgVip = lazy(() => import("@/pages/ig/IgVip"));
const IgAnalytics = lazy(() => import("@/pages/ig/IgAnalytics"));
const IgC74 = lazy(() => import("@/pages/ig/IgC74"));
const IgMining = lazy(() => import("@/pages/ig/IgMining"));
const IgEarn = lazy(() => import("@/pages/ig/IgEarn"));
const IgDeposit = lazy(() => import("@/pages/ig/IgDeposit"));
const IgWithdraw = lazy(() => import("@/pages/ig/IgWithdraw"));
const IgCryptoDeposit = lazy(() => import("@/pages/ig/IgCryptoDeposit"));
const IgDemoDeposit = lazy(() => import("@/pages/ig/IgDemoDeposit"));
const IgSettings = lazy(() => import("@/pages/ig/IgSettings"));
const IgInvite = lazy(() => import("@/pages/ig/IgInvite"));
const IgBonuses = lazy(() => import("@/pages/ig/IgBonuses"));
const IgMissions = lazy(() => import("@/pages/ig/IgMissions"));
const IgBank = lazy(() => import("@/pages/ig/IgBank"));
const IgLeaderboard = lazy(() => import("@/pages/ig/IgLeaderboard"));
const IgKyc = lazy(() => import("@/pages/ig/IgKyc"));
const IgResponsible = lazy(() => import("@/pages/ig/IgResponsible"));
const IgReputation = lazy(() => import("@/pages/ig/IgReputation"));
const IgSupport = lazy(() => import("@/pages/ig/IgSupport"));
const IgEvents = lazy(() => import("@/pages/ig/IgEvents"));
const ResponsibleGamblingPage = lazy(() => import("@/pages/ResponsibleGamblingPage"));
const CasinoLeaderboard = lazy(() => import("@/pages/CasinoLeaderboard"));
const CasinoLogin   = lazy(() => import("@/pages/CasinoLogin"));

// Admin panel pages (parallel routes)
const Admin = lazy(() => import("@/pages/Admin"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
import AdminGuard from "@/components/admin/AdminGuard";
const AdminLive = lazy(() => import("@/pages/AdminLive"));
const AdminHealth = lazy(() => import("@/pages/AdminHealth"));
const AdminOriginals = lazy(() => import("@/pages/AdminOriginals"));
const AdminResetPassword = lazy(() => import("@/pages/AdminResetPassword"));
const AdminTreasury = lazy(() => import("@/pages/AdminTreasury"));
const AdminControl = lazy(() => import("@/pages/AdminControl"));
// Users / Withdrawals / Deposits / Audit / Settings / Payments / Bonuses live as
// tabs inside the /admin console — the standalone duplicate pages were removed.

const Loader = () => <BrandedPageLoader />;

/**
 * TransitionLayer Ã¢ÂÂ keys on pathname so the wrapper re-mounts on every nav.
 * The mount fires the .c7-page-enter CSS animation. Inner Routes behaviour
 * is unchanged (React Router would unmount the matched route element either way).
 */
function TransitionLayer({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return (
    <div key={loc.pathname} className="c7-page-enter" style={{ minHeight: '100%' }}>
      {children}
    </div>
  );
}

/**
 * RouteReveal — the "Universal Transition Engine" cinematic layer. On every
 * navigation it plays a quick gold sweep + glow OVER the app. It is a separate
 * fixed, pointer-events:none overlay (a sibling of the routed pages), so its
 * transform never creates a containing block for the fixed bottom nav — the one
 * thing the page-wrapper animation must avoid. Pure CSS (transform/opacity),
 * 60fps, reduced-motion honored via the .c7-reveal CSS.
 */
function RouteReveal() {
  const loc = useLocation();
  const [tick, setTick] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; } // no sweep on first load
    setTick((t) => t + 1);
  }, [loc.pathname]);
  if (tick === 0) return null;
  return (
    <div className="c7-reveal" key={tick} aria-hidden="true">
      <span className="c7-reveal-glow" />
      <span className="c7-reveal-sheen" />
    </div>
  );
}

// Param-preserving redirect (React Router's <Navigate> can't interpolate params).
// Used to send legacy /v2/game/:id deep links to the canonical /v3/game/:id.
function RedirectParam({ to }: { to: (p: Record<string, string | undefined>) => string }) {
  const params = useParams();
  return <Navigate to={to(params)} replace />;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading"|"auth"|"noauth">("loading");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "auth" : "noauth");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setStatus(session ? "auth" : "noauth");
    });
    return () => subscription.unsubscribe();
  }, []);
  if (status === "loading") return <Loader />;
  if (status === "noauth") return <Navigate to="/login" replace />;
  return <>{children}</>;
}


export default function App() {
  // Ambient music stays off by default; UI SFX are delivered by TapFX via
  // AudioManager (gated by the sfxEnabled preference + the sound toggle).
  useEffect(() => { AudioManager.init(); }, []);

  return (
    <Router>
      <ThemeProvider>
      <IgGlam />
      <C7Splash />
      <TapFX />
      <C7EnergyAura />
      <C7EarnBurst />
      <C7EarnWatch />
      <C7Hud />
      <C7ReturnSummary />
      <C7UpdateNudge />
      <ReferralCapture />
      <V2SoundToggle />
      <V2PortraitLock />
      <RouteReveal />
      <Suspense fallback={<Loader />}>
        <TransitionLayer>
          <Routes>
          {/* ── Core ── */}
          {/* V3 "Top Rich" lobby is the new sole user-facing home; the root and
              all lobby aliases land here. The V2 lobby stays routed at /v2 for
              rollback and because V3's feature links reuse the V2 sub-screens
              (casino/wallet/rewards/profile) unchanged. */}
          {/* APP SWAP → Instagram-light dashboard. Root + the /v3 lobby now land on
              the IG app (/ig). The classic dark lobby stays at /v3-classic for
              rollback. Deep pages keep their current styling until cascaded. */}
          {/* Landing = the Instagram-style reels frame (c7winners.com opens here).
              /ig still serves Home; the Home tab and legacy /v3 keep working. */}
          <Route path="/" element={<Navigate to="/ig/reels" replace />} />
          <Route path="/v3" element={<Navigate to="/ig" replace />} />
          <Route path="/v3-classic" element={<V3Lobby />} />
          {/* ── V3 canonical consumer routes — the single source of truth ──
              Home + the four primary tabs (Games/Rewards/Wallet/Profile) and
              their sub-screens all live under /v3/*. The page components are
              shared (still V2*-named internally); only the canonical URL is V3.
              Legacy /v1, /v2 and /v2/* paths redirect here for backward-compat
              and deep links, so old bookmarks keep working. */}
          <Route path="/v3/games" element={<Navigate to="/ig/explore" replace />} />
          <Route path="/v3/game/:id" element={<V2GameDetail />} />
          <Route path="/v3/wallet" element={<Navigate to="/ig/wallet" replace />} />
          <Route path="/v3/rewards" element={<Navigate to="/ig/rewards" replace />} />
          <Route path="/v3/rewards/wheel" element={<Navigate to="/ig/reels/wheel" replace />} />
          <Route path="/v3/rewards/refer" element={<V2Refer />} />
          <Route path="/v3/rewards/events" element={<Navigate to="/ig/events" replace />} />
          <Route path="/v3/profile" element={<Navigate to="/ig/profile" replace />} />
          <Route path="/v3/profile/vip" element={<Navigate to="/ig/vip" replace />} />
          <Route path="/v3/profile/analytics" element={<Navigate to="/ig/analytics" replace />} />

          {/* Legacy /v1 + /v2/* → V3 canonical (bookmarks / deep links) */}
          <Route path="/v1" element={<Navigate to="/v3" replace />} />
          <Route path="/v2" element={<Navigate to="/v3" replace />} />
          <Route path="/v2/casino" element={<Navigate to="/v3/games" replace />} />
          <Route path="/v2/game/:id" element={<RedirectParam to={(p) => `/v3/game/${p.id}`} />} />
          <Route path="/v2/wallet" element={<Navigate to="/v3/wallet" replace />} />
          <Route path="/v2/rewards" element={<Navigate to="/v3/rewards" replace />} />
          <Route path="/v2/rewards/wheel" element={<Navigate to="/v3/rewards/wheel" replace />} />
          <Route path="/v2/rewards/refer" element={<Navigate to="/v3/rewards/refer" replace />} />
          <Route path="/v2/rewards/events" element={<Navigate to="/v3/rewards/events" replace />} />
          <Route path="/v2/rewards/promotions" element={<Navigate to="/bonuses" replace />} />
          <Route path="/v2/profile" element={<Navigate to="/v3/profile" replace />} />
          <Route path="/v2/profile/vip" element={<Navigate to="/v3/profile/vip" replace />} />
          <Route path="/v2/profile/analytics" element={<Navigate to="/v3/profile/analytics" replace />} />
          <Route path="/v2/profile/history" element={<Navigate to="/transactions" replace />} />
          <Route path="/v2/vip" element={<Navigate to="/v3/profile/vip" replace />} />
          <Route path="/v2/analytics" element={<Navigate to="/v3/profile/analytics" replace />} />
          <Route path="/v2/wheel" element={<Navigate to="/v3/rewards/wheel" replace />} />
          <Route path="/v2/refer" element={<Navigate to="/v3/rewards/refer" replace />} />
          <Route path="/v2/events" element={<Navigate to="/v3/rewards/events" replace />} />
          <Route path="/v2/originals" element={<Navigate to="/v3/games" replace />} />
          <Route path="/v2/deposit" element={<Navigate to="/deposit" replace />} />
          <Route path="/v2/withdraw" element={<Navigate to="/withdraw" replace />} />
          <Route path="/login" element={<CasinoLogin />} />
          {/* IA cleanup: V1 profile/wallet/vip pages are duplicates of the V2
              canonical surfaces — redirect so there's one home per feature.
              Their components stay in the repo, unrouted, for rollback. */}
          <Route path="/me"            element={<Navigate to="/v3/profile" replace />} />
          <Route path="/wallet"        element={<Navigate to="/v3/wallet" replace />} />
          <Route path="/vip"           element={<Navigate to="/v3/profile/vip" replace />} />
          {/* Leaderboard has no V2 home yet — stays routed (URL-reachable),
              just no longer surfaced in the retired drawer. */}
          <Route path="/top"           element={<Navigate to="/ig/leaderboard" replace />} />
          <Route path="/agent"         element={<Navigate to="/ig/invite" replace />} />
          {/* Games live inside the Home dashboard — /live redirects there so the
              lobby is never duplicated on a separate page. */}
          <Route path="/live" element={<Navigate to="/v3" replace />} />
          <Route path="/kyc"           element={<Navigate to="/ig/kyc" replace />} />
          <Route path="/responsible"   element={<Navigate to="/ig/responsible" replace />} />
          <Route path="/settings"      element={<Navigate to="/ig/settings" replace />} />
          <Route path="/notifications" element={<Navigate to="/ig/notifications" replace />} />
          <Route path="/telegram"      element={<Navigate to="/ig/settings" replace />} />
          {/* Instagram-style dashboard preview (light theme). Own bottom nav. */}
          <Route path="/ig"            element={<IgHome />} />
          <Route path="/ig/profile"    element={<IgProfile />} />
          <Route path="/ig/explore"    element={<IgExplore />} />
          <Route path="/ig/game/:id"   element={<V2GameDetail />} />
          <Route path="/ig/wallet"     element={<IgWallet />} />
          <Route path="/ig/reels"      element={<IgReelsFeed />} />
          <Route path="/ig/reels/wheel" element={<IgReels />} />
          <Route path="/ig/onboarding" element={<IgOnboarding />} />
          <Route path="/ig/activity"   element={<IgActivity />} />
          <Route path="/ig/notifications" element={<IgNotifications />} />
          <Route path="/ig/rewards"    element={<IgRewards />} />
          <Route path="/ig/vip"        element={<IgVip />} />
          <Route path="/ig/analytics"  element={<IgAnalytics />} />
          <Route path="/ig/c74"        element={<IgC74 />} />
          <Route path="/ig/mining"     element={<IgMining />} />
          <Route path="/ig/earn"       element={<IgEarn />} />
          {/* Presentation-only guard: when VITE_PRESENTATION_ONLY, real-money
              surfaces funnel to the free-play faucet / wallet — no real crypto
              address or withdrawal is reachable. Payment rails unchanged. */}
          <Route path="/ig/deposit"    element={<AuthGuard>{PRESENTATION_ONLY ? <Navigate to="/ig/deposit/demo" replace /> : <IgDeposit />}</AuthGuard>} />
          <Route path="/ig/withdraw"   element={<AuthGuard>{PRESENTATION_ONLY ? <Navigate to="/ig/wallet" replace /> : <IgWithdraw />}</AuthGuard>} />
          <Route path="/ig/deposit/crypto" element={<AuthGuard>{PRESENTATION_ONLY ? <Navigate to="/ig/deposit/demo" replace /> : <IgCryptoDeposit />}</AuthGuard>} />
          <Route path="/ig/deposit/demo" element={<AuthGuard><IgDemoDeposit /></AuthGuard>} />
          <Route path="/ig/settings"   element={<AuthGuard><IgSettings /></AuthGuard>} />
          <Route path="/ig/invite"     element={<AuthGuard><IgInvite /></AuthGuard>} />
          <Route path="/ig/bonuses"    element={<AuthGuard><IgBonuses /></AuthGuard>} />
          <Route path="/ig/missions"   element={<AuthGuard><IgMissions /></AuthGuard>} />
          <Route path="/ig/bank"       element={<AuthGuard><IgBank /></AuthGuard>} />
          <Route path="/ig/leaderboard" element={<IgLeaderboard />} />
          <Route path="/ig/kyc"        element={<AuthGuard><IgKyc /></AuthGuard>} />
          <Route path="/ig/responsible" element={<AuthGuard><IgResponsible /></AuthGuard>} />
          <Route path="/ig/reputation" element={<AuthGuard><IgReputation /></AuthGuard>} />
          <Route path="/ig/contribution" element={<AuthGuard><IgContribution /></AuthGuard>} />
          <Route path="/ig/support"    element={<IgSupport />} />
          <Route path="/ig/events"     element={<IgEvents />} />
          <Route path="/ig/promotions" element={<Navigate to="/ig/bonuses" replace />} />
          <Route path="/profile/telegram" element={<Navigate to="/telegram" replace />} />
          <Route path="/support"       element={<Navigate to="/ig/support" replace />} />
          <Route path="/transactions"  element={<Navigate to="/ig/activity" replace />} />
          <Route path="/bonuses"       element={<Navigate to="/ig/bonuses" replace />} />

          {/* ── Games ── */}
          {/* Old games listing UI removed — the lobby's provider catalog is the library. */}
          <Route path="/games"         element={<Navigate to="/v3" replace />} />
          {/* In-house game launcher retired — only the 2J catalog ships. Any
              in-house /games/<slug> deep link funnels into the 2J lobby. */}
          <Route path="/games/:id"     element={<Navigate to="/v3" replace />} />
          {/* C74 Originals retired — catalog is 2J only. Old slot links → lobby. */}
          {/* C74 Originals / CodeCanyon HTML5 slots — hosted locally in the C74 frame.
              Enabled games live in src/games/c74originals/registry.ts; C74SlotHost
              shows a graceful "installing" state until the game files land in
              public/games-html/<slug>/. Free-play by default (real-money = Phase B). */}
          <Route path="/play/:slug"    element={<C74SlotHost />} />
          {/* IA cleanup: V1 wheel/events are duplicates of the V2 reward
              features — redirect to the canonical /v2/rewards/* homes. */}
          <Route path="/wheel"         element={<Navigate to="/v3/rewards/wheel" replace />} />
          <Route path="/gullak"        element={<Navigate to="/ig/bank" replace />} />
          <Route path="/bank"          element={<Navigate to="/gullak" replace />} />
          <Route path="/events"        element={<Navigate to="/v3/rewards/events" replace />} />
          <Route path="/missions"      element={<Navigate to="/ig/missions" replace />} />
          {/* C74 Token Center is the single canonical C74 surface; the old /c74
              hub is retired and redirects into it. */}
          <Route path="/c74"           element={<Navigate to="/c74/token" replace />} />
          {/* V3-namespaced alias for the C74 dashboard (canonical stays /c74/token). */}
          <Route path="/v3/c74"        element={<Navigate to="/c74/token" replace />} />
          <Route path="/c74/token"     element={<Navigate to="/ig/c74" replace />} />
          <Route path="/c74/mining"    element={<Navigate to="/ig/mining" replace />} />
          <Route path="/c74/reputation" element={<Navigate to="/ig/reputation" replace />} />
          {/* /c74/claim is TESTNET-only — routed for direct access but hidden from
              in-app navigation until mainnet launch. */}
          <Route path="/c74/claim"     element={<AuthGuard><C74Claim /></AuthGuard>} />
          <Route path="/rewards"       element={<Navigate to="/v3/rewards" replace />} />
          {/* Retired custom mini-games (WinGo + /casino/* crash/mines/plinko/
              slots/roulette/blackjack) → funnel into the 2J lobby. Only the 2J
              catalog + C74 Originals ship. */}
          <Route path="/wingo"         element={<Navigate to="/v3" replace />} />
          <Route path="/casino/*"      element={<Navigate to="/v3" replace />} />

          {/* ── Deposit / withdraw ── */}
          <Route path="/deposit"       element={<Navigate to="/ig/deposit" replace />} />
          <Route path="/deposit/demo"  element={<Navigate to="/ig/deposit/demo" replace />} />
          {/* Old manual "Deposit Request" page removed — funnel into the hub. */}
          <Route path="/deposit/request" element={<Navigate to="/ig/deposit" replace />} />
          {/* Old manual UPI (SBI QR + UTR) page removed — UPI now goes through the
              Razorpay gateway (which handles UPI natively). Old links redirect. */}
          <Route path="/deposit/upi"   element={<Navigate to="/ig/deposit" replace />} />
          <Route path="/deposit/crypto" element={<Navigate to="/ig/deposit/crypto" replace />} />
          <Route path="/deposit/razorpay" element={<Navigate to="/ig/deposit" replace />} />
          {/* IA P4: /deposit/paypal retired (not wired into the Deposit hub) → hub. */}
          <Route path="/deposit/paypal" element={<Navigate to="/ig/deposit" replace />} />
          <Route path="/withdraw"      element={<Navigate to="/ig/withdraw" replace />} />

          {/* ── Legal ── */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />

          {/* ── Redirect aliases → canonical (single source of truth) ── */}
          <Route path="/home"        element={<Navigate to="/v3" replace />} />
          <Route path="/uono"        element={<Navigate to="/" replace />} />
          <Route path="/premium"     element={<Navigate to="/" replace />} />
          <Route path="/casino"      element={<Navigate to="/v3" replace />} />
          <Route path="/tournaments" element={<Navigate to="/" replace />} />
          <Route path="/account"     element={<Navigate to="/v3/profile" replace />} />
          <Route path="/profile"     element={<Navigate to="/v3/profile" replace />} />
          <Route path="/refer"       element={<Navigate to="/agent" replace />} />
          <Route path="/stats"       element={<Navigate to="/top" replace />} />
          <Route path="/promotions"  element={<Navigate to="/bonuses" replace />} />
          {/* Legacy /dtx/* → clean canonical routes */}
          <Route path="/dtx"              element={<Navigate to="/" replace />} />
          <Route path="/dtx/games"        element={<Navigate to="/games" replace />} />
          <Route path="/dtx/games/:id"    element={<Navigate to="/games" replace />} />
          <Route path="/dtx/wheel"        element={<Navigate to="/v3/rewards/wheel" replace />} />
          <Route path="/dtx/wingo"        element={<Navigate to="/games" replace />} />
          <Route path="/dtx/promotions"   element={<Navigate to="/bonuses" replace />} />
          <Route path="/dtx/settings"     element={<Navigate to="/settings" replace />} />
          <Route path="/dtx/wallet"       element={<Navigate to="/v3/wallet" replace />} />
          <Route path="/dtx/deposit"      element={<Navigate to="/v3/wallet" replace />} />
          <Route path="/dtx/withdraw"     element={<Navigate to="/v3/wallet" replace />} />
          <Route path="/dtx/profile"      element={<Navigate to="/v3/profile" replace />} />
          <Route path="/dtx/vip"          element={<Navigate to="/v3/profile/vip" replace />} />
          <Route path="/dtx/leaderboard"  element={<Navigate to="/top" replace />} />
          <Route path="/dtx/refer"        element={<Navigate to="/agent" replace />} />
          <Route path="/dtx/agent"        element={<Navigate to="/agent" replace />} />

          {/* Admin Panel ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ parallel routes */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/api-keys" element={<AdminGuard><AdminApiKeys /></AdminGuard>} />
          <Route path="/admin/live" element={<AdminGuard><AdminLive /></AdminGuard>} />
          <Route path="/admin/originals" element={<AdminGuard><AdminOriginals /></AdminGuard>} />
          <Route path="/admin/health" element={<AdminGuard><AdminHealth /></AdminGuard>} />
          <Route path="/admin/treasury" element={<AdminGuard><AdminTreasury /></AdminGuard>} />
          <Route path="/admin/control" element={<AdminGuard><AdminControl /></AdminGuard>} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TransitionLayer>
      </Suspense>
      </ThemeProvider>
    </Router>
  );
}





