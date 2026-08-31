import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminPinGate from "@/components/admin/AdminPinGate";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminGameRounds from "@/components/admin/AdminGameRounds";
import AdminIgaming from "@/components/admin/AdminIgaming";
import AdminActivity from "@/components/admin/AdminActivity";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminBlog from "@/components/admin/AdminBlog";
import AdminSecurity from "@/components/admin/AdminSecurity";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminPromotions from "@/components/admin/AdminPromotions";
import AdminGeo from "@/components/admin/AdminGeo";
import AdminTreasuryTab from "@/components/casino/AdminTreasuryTab";
import AdminReserveOps from "@/components/admin/AdminReserveOps";
import AdminOperatorProfit from "@/components/admin/AdminOperatorProfit";
import AdminReconciliation from "@/components/admin/AdminReconciliation";
import AdminRealMoneyOps from "@/components/admin/AdminRealMoneyOps";
import AdminWithdrawalGate from "@/components/admin/AdminWithdrawalGate";
import AdminC74Contribution from "@/components/admin/AdminC74Contribution";
import AdminTreasurySwap from "@/components/admin/AdminTreasurySwap";
import AdminHdWallet from "@/components/admin/AdminHdWallet";
import AdminNotifications from "@/components/admin/AdminNotifications";
import AdminWithdrawalsQueue from "@/components/admin/AdminWithdrawalsQueue";
import AdminManualDeposits from "@/components/admin/AdminManualDeposits";
import AdminUpiSuppliers from "@/components/admin/AdminUpiSuppliers";
import AdminEwalletAgents from "@/components/admin/AdminEwalletAgents";
import AdminAgentWallets from "@/components/admin/AdminAgentWallets";
import AdminCryptoFlow from "@/components/admin/AdminCryptoFlow";
import AdminUpiFlow from "@/components/admin/AdminUpiFlow";
import AdminPaymentGateways from "@/components/admin/AdminPaymentGateways";
import AdminGameProviders from "@/components/admin/AdminGameProviders";
import AdminPaymentsHub from "@/components/admin/AdminPaymentsHub";
import AdminCryptoDeposits from "@/components/admin/AdminCryptoDeposits";
import AdminKyc from "@/components/admin/AdminKyc";
import AdminGoLive from "@/components/admin/AdminGoLive";
import AdminResponsibleGambling from "@/components/admin/AdminResponsibleGambling";
import AdminLiability from "@/components/admin/AdminLiability";
import AdminSetupWizard from "@/components/admin/AdminSetupWizard";
import AdminRegistrationsFeed from "@/components/admin/AdminRegistrationsFeed";
import AdminJourney from "@/components/admin/AdminJourney";
import AdminOnboardingTab from "@/components/admin/AdminOnboardingTab";
import AdminHealthCheck from "@/components/admin/AdminHealthCheck";
import AdminAudit from "@/components/admin/AdminAudit";
import AdminPerformance from "@/components/admin/AdminPerformance";
import AdminIntegrity from "@/components/admin/AdminIntegrity";
import AdminContainment from "@/components/admin/AdminContainment";
import AdminTelegramChannels from "@/components/admin/AdminTelegramChannels";
import AdminBankDetails from "@/components/admin/AdminBankDetails";
import AdminWelcomeMessage from "@/components/admin/AdminWelcomeMessage";
import AdminFirstDeposit from "@/components/admin/AdminFirstDeposit";
import AdminInviteBonus from "@/components/admin/AdminInviteBonus";
import AdminSiteMessage from "@/components/admin/AdminSiteMessage";
import AdminCurrencyLang from "@/components/admin/AdminCurrencyLang";
import AdminWebColors from "@/components/admin/AdminWebColors";
import AdminUserRanking from "@/components/admin/AdminUserRanking";
import AdminProviderConfig from "@/components/admin/AdminProviderConfig";
import AdminC74 from "@/components/admin/AdminC74";
import AdminC74Earnings from "@/components/admin/AdminC74Earnings";
import AdminGamesManager from "@/components/admin/AdminGamesManager";
import AdminGameArt from "@/components/admin/AdminGameArt";
import AdminAiStudio from "@/components/admin/AdminAiStudio";
import AdminRtpMonitor from "@/components/admin/AdminRtpMonitor";
import LedgerVaultToken from "@/components/admin/LedgerVaultToken";
import AdminEvents from "@/components/admin/AdminEvents";
import AdminMissions from "@/components/admin/AdminMissions";
import AdminBanners from "@/components/admin/AdminBanners";
import AdminSupport from "@/components/admin/AdminSupport";
import AdminHub from "@/components/admin/AdminHub";
import { LogOut, Menu, Crown } from "lucide-react";
import "@/styles/admin-dark.css";

export type AdminTab = "overview" | "igaming" | "journey" | "users" | "registrations" | "onboarding" | "rounds" | "activity" | "treasury" | "reserve_ops" | "operator_profit" | "treasury_swap" | "withdrawals" | "payments_hub" | "manual_deposits" | "upi_suppliers" | "ewallet_agents" | "agent_wallets" | "crypto_flow" | "upi_flow" | "payment_gateways" | "game_providers" | "crypto_deposits" | "hd_wallet" | "kyc" | "golive" | "responsible" | "liability" | "c74" | "c74_contribution" | "c74_earnings" | "games" | "game_art" | "ai_studio" | "events" | "missions" | "blog" | "notifications" | "security" | "analytics" | "promotions" | "geo" | "settings" | "health" | "audit" | "performance" | "integrity" | "containment" | "telegram" | "rtp_monitor" | "token_dashboard" | "web_bank" | "web_welcome" | "web_first_deposit" | "web_invite" | "web_message" | "web_currency" | "web_colors" | "web_ranking" | "web_provider" | "web_banners" | "support" | "deposits_hub" | "treasury_hub" | "agents_hub" | "games_hub" | "analytics_hub" | "audit_hub";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Admin() {
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState(!!sessionStorage.getItem("dtx_admin_auth"));
  const [checking, setChecking] = useState(!sessionStorage.getItem("dtx_admin_auth"));
  const [tab, setTab] = useState<AdminTab>(
    location.pathname.endsWith("/treasury") ? "treasury" : "overview"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (location.pathname.endsWith("/treasury")) setTab("treasury");
  }, [location.pathname]);

  // Dark console theme scoped to /admin only — flip the app background while
  // /admin is mounted, restore it on unmount.
  useEffect(() => {
    document.body.classList.add("admin-dark-active");
    return () => document.body.classList.remove("admin-dark-active");
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("dtx_admin_auth");
    if (!stored || !UUID_RE.test(stored)) { setChecking(false); return; }
    (supabase.rpc as any)("validate_admin_pin_session", { p_token: stored })
      .then(({ data }: { data: boolean | null }) => {
        if (data === true) setAuthenticated(true);
        else sessionStorage.removeItem("dtx_admin_auth");
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("dtx_admin_auth");
    setAuthenticated(false);
  };

  if (checking) return null;
  if (!authenticated) {
    return <AdminPinGate onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="admin-dark flex min-h-screen relative" style={{ background: "var(--c7-bg)" }}>
      <AdminSetupWizard />
      <AdminSidebar activeTab={tab} onTabChange={setTab} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="ac-topbar h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <style>{AC_TOPBAR_CSS}</style>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="ac-menu md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="ac-crown"><Crown className="h-3.5 w-3.5" strokeWidth={2.5} /></span>
              <h1 className="ac-title">C74 <span>Control Center</span></h1>
              <span className="ac-live">
                <span className="ac-live-dot" />
                LIVE
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="ac-logout">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative" style={{ background: "transparent" }}>
          {tab === "overview" && <AdminOverview onNav={(t) => setTab(t as AdminTab)} />}

          {/* ── Phase 3 consolidation hubs — overlapping tabs merged into one canonical
                surface each; every sub-view is the original component, verbatim. ── */}
          {tab === "deposits_hub" && <AdminHub tabs={[
            { key: "crypto", label: "Crypto", render: () => <AdminCryptoDeposits /> },
            { key: "manual", label: "Manual", render: () => <AdminManualDeposits /> },
            { key: "cryptoflow", label: "Crypto Auto Flow", render: () => <AdminCryptoFlow /> },
            { key: "upi", label: "UPI Flow", render: () => <AdminUpiFlow /> },
            { key: "hub", label: "Payments Hub", render: () => <AdminPaymentsHub /> },
          ]} />}
          {tab === "treasury_hub" && <AdminHub tabs={[
            { key: "wallets", label: "Crypto Wallets", render: () => <AdminTreasuryTab /> },
            { key: "hd", label: "HD Wallet", render: () => <AdminHdWallet /> },
            { key: "liability", label: "Liability & Reconcile", render: () => <AdminLiability /> },
          ]} />}
          {tab === "agents_hub" && <AdminHub tabs={[
            { key: "ewallet", label: "e-Wallet Agents", render: () => <AdminEwalletAgents /> },
            { key: "subagents", label: "Sub-Agent Wallets", render: () => <AdminAgentWallets /> },
            { key: "upi", label: "UPI Suppliers", render: () => <AdminUpiSuppliers /> },
          ]} />}
          {tab === "games_hub" && <AdminHub tabs={[
            { key: "manager", label: "Games Manager", render: () => <AdminGamesManager /> },
            { key: "igaming", label: "C7 Games", render: () => <AdminIgaming /> },
            { key: "art", label: "Game Art Studio", render: () => <AdminGameArt /> },
            { key: "ai", label: "AI Studio", render: () => <AdminAiStudio /> },
            { key: "providers", label: "Game Providers", render: () => <AdminGameProviders /> },
          ]} />}
          {tab === "analytics_hub" && <AdminHub tabs={[
            { key: "analytics", label: "Game Analytics", render: () => <AdminAnalytics /> },
            { key: "rtp", label: "RTP Monitor", render: () => <AdminRtpMonitor /> },
            { key: "perf", label: "Performance", render: () => <AdminPerformance /> },
          ]} />}
          {tab === "audit_hub" && <AdminHub tabs={[
            { key: "sessions", label: "Audit & Sessions", render: () => <AdminSecurity /> },
            { key: "log", label: "Audit Log", render: () => <AdminAudit /> },
          ]} />}
          {tab === "journey" && <AdminJourney />}
          {tab === "users" && <AdminUsers />}
          {tab === "registrations" && <AdminRegistrationsFeed />}
          {tab === "onboarding" && <AdminOnboardingTab />}
          {tab === "rounds" && <AdminGameRounds />}
          {tab === "igaming" && <AdminIgaming />}
          {tab === "activity" && <AdminActivity />}
          {tab === "treasury" && <AdminTreasuryTab />}
          {tab === "reserve_ops" && <AdminReserveOps />}
          {tab === "operator_profit" && <AdminOperatorProfit />}
          {tab === "reconciliation" && <AdminReconciliation />}
          {tab === "real_money_ops" && <AdminRealMoneyOps />}
          {tab === "withdrawal_gate" && <AdminWithdrawalGate />}
          {tab === "c74_contribution" && <AdminC74Contribution />}
          {tab === "treasury_swap" && <AdminTreasurySwap />}
          {tab === "hd_wallet" && <AdminHdWallet />}
          {tab === "withdrawals" && <AdminWithdrawalsQueue />}
          {tab === "manual_deposits" && <AdminManualDeposits />}
          {tab === "upi_suppliers" && <AdminUpiSuppliers />}
          {tab === "ewallet_agents" && <AdminEwalletAgents />}
          {tab === "agent_wallets" && <AdminAgentWallets />}
          {tab === "crypto_flow" && <AdminCryptoFlow />}
          {tab === "upi_flow" && <AdminUpiFlow />}
          {tab === "payment_gateways" && <AdminPaymentGateways />}
          {tab === "game_providers" && <AdminGameProviders />}
          {tab === "payments_hub" && <AdminPaymentsHub />}
          {tab === "crypto_deposits" && <AdminCryptoDeposits />}
          {tab === "kyc" && <AdminKyc />}
          {tab === "golive" && <AdminGoLive />}
          {tab === "responsible" && <AdminResponsibleGambling />}
          {tab === "liability" && <AdminLiability />}
          {tab === "c74" && <AdminC74 />}
          {tab === "c74_earnings" && <AdminC74Earnings />}
          {tab === "games" && <AdminGamesManager />}
          {tab === "game_art" && <AdminGameArt />}
          {tab === "ai_studio" && <AdminAiStudio />}
          {tab === "events" && <AdminEvents />}
          {tab === "missions" && <AdminMissions />}
          {tab === "blog" && <AdminBlog />}
          {tab === "notifications" && <AdminNotifications />}
          {tab === "security" && <AdminSecurity />}
          {tab === "analytics" && <AdminAnalytics />}
          {tab === "rtp_monitor" && <AdminRtpMonitor />}
          {tab === "token_dashboard" && <LedgerVaultToken />}
          {tab === "promotions" && <AdminPromotions />}
          {tab === "geo" && <AdminGeo />}
          {tab === "settings" && <AdminSettings />}
          {tab === "health" && <AdminHealthCheck />}
          {tab === "audit" && <AdminAudit />}
          {tab === "performance" && <AdminPerformance />}
          {tab === "integrity" && <AdminIntegrity />}
          {tab === "containment" && <AdminContainment />}
          {tab === "telegram" && <AdminTelegramChannels />}
          {tab === "web_bank" && <AdminBankDetails />}
          {tab === "web_welcome" && <AdminWelcomeMessage />}
          {tab === "web_first_deposit" && <AdminFirstDeposit />}
          {tab === "web_invite" && <AdminInviteBonus />}
          {tab === "web_message" && <AdminSiteMessage />}
          {tab === "web_currency" && <AdminCurrencyLang />}
          {tab === "web_colors" && <AdminWebColors />}
          {tab === "web_ranking" && <AdminUserRanking />}
          {tab === "web_provider" && <AdminProviderConfig />}
          {tab === "web_banners" && <AdminBanners />}
          {tab === "support" && <AdminSupport />}
        </main>
      </div>
    </div>
  );
}

// Premium dark chrome for the console top bar — matches the AdminSidebar rail.
const AC_TOPBAR_CSS = `
.ac-topbar{
  background:linear-gradient(180deg,rgba(8,32,20,.96),rgba(8,32,20,.72));
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  border-bottom:1px solid rgba(240,201,74,.22);
  box-shadow:0 1px 0 rgba(240,201,74,.14),0 14px 30px -24px #000;
}
.ac-menu{padding:6px;border-radius:9px;border:none;background:none;color:#a9d8c0;cursor:pointer}
.ac-menu:hover{color:#f0c94a;background:rgba(240,201,74,.1)}
.ac-crown{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:#1a1206;
  background:linear-gradient(160deg,#fff3c8,#f0c94a 55%,#c68a2e);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 5px 14px -6px rgba(240,201,74,.7)}
.ac-title{font-size:14px;font-weight:900;letter-spacing:.3px;color:#f0c94a;margin:0;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 60%,#c68a2e);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.ac-title span{font-weight:700;color:#a9d8c0;-webkit-text-fill-color:#a9d8c0}
.ac-live{display:inline-flex;align-items:center;gap:6px;margin-left:6px;padding:3px 10px;border-radius:999px;
  font-size:9px;font-weight:900;letter-spacing:.12em;color:#2ee08a;
  background:rgba(46,224,138,.12);border:1px solid rgba(46,224,138,.4)}
.ac-live-dot{width:6px;height:6px;border-radius:50%;background:#2ee08a;box-shadow:0 0 8px #2ee08a}
@media (prefers-reduced-motion:no-preference){.ac-live-dot{animation:acld 1.8s ease-in-out infinite}@keyframes acld{50%{opacity:.35}}}
.ac-logout{display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:10px;cursor:pointer;
  font-size:12px;font-weight:800;color:#a9d8c0;background:none;border:1px solid transparent;transition:all .14s}
.ac-logout:hover{color:#ff8f9c;background:rgba(255,107,125,.1);border-color:rgba(255,107,125,.32)}
`;
