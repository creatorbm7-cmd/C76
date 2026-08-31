import {
  LayoutDashboard, Gamepad2, HeartPulse, Coins, Wallet, Building2, Repeat,
  TrendingUp, Users, ShieldCheck, WalletCards, Activity, ClipboardList, Route,
  ClipboardCheck, Trophy, HeartHandshake, Sparkles, Target, CalendarDays, Image,
  BarChart3, Gift, Bell, Headphones, Radio, CreditCard, Landmark, Send, Globe,
  Fingerprint, ShieldAlert, BadgeCheck, Rocket, Lock, Settings, MessageSquare,
  Megaphone, Mail, Languages, Palette, Plug, Newspaper, Crown, X, ChevronDown,
  Banknote, Gauge, GitCompareArrows,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { AdminTab } from "@/pages/Admin";
import { useIsMobile } from "@/hooks/use-mobile";

// A nav entry is either an in-page tab (id) or a link to a standalone route (href).
type SectionItem =
  | { id: AdminTab; label: string; icon: any; href?: undefined }
  | { href: string; label: string; icon: any; id?: undefined };
type Section = { label: string; tone: string; defaultOpen?: boolean; items: SectionItem[] };

// C74 Admin Control Center — eight canonical sections (audit Phase 2). Every tab
// that Admin.tsx renders is surfaced here under exactly one home; nothing is
// hidden/orphaned anymore. Reorganisation only — no component, route, RPC or
// money path changed. tone = jewel accent used for the section's label + icons.
const SECTIONS: Section[] = [
  { label: "Overview", tone: "gold", defaultOpen: true, items: [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "rounds", label: "Game Monitoring", icon: Gamepad2 },
    { id: "health", label: "System Health", icon: HeartPulse },
  ]},
  { label: "Finance", tone: "emerald", defaultOpen: true, items: [
    { id: "deposits_hub", label: "Deposits", icon: Coins },
    { id: "withdrawals", label: "Withdrawals", icon: Wallet },
    { id: "treasury_hub", label: "Treasury", icon: Building2 },
    { id: "reserve_ops", label: "C74 Reserve Ops", icon: ShieldCheck },
    { id: "operator_profit", label: "Operator Profit", icon: Banknote },
    { id: "reconciliation", label: "Reconciliation", icon: GitCompareArrows },
    { id: "real_money_ops", label: "Real-Money Ops", icon: Banknote },
    { id: "withdrawal_gate", label: "Withdrawal Gate", icon: ShieldCheck },
    { id: "treasury_swap", label: "C74 Treasury Swap", icon: Repeat },
    { id: "c74_earnings", label: "Revenue / Profit", icon: TrendingUp },
  ]},
  { label: "Users", tone: "sapphire", defaultOpen: true, items: [
    { id: "users", label: "Users", icon: Users },
    { id: "kyc", label: "KYC Verification", icon: ShieldCheck },
    { id: "agents_hub", label: "Agents", icon: WalletCards },
    { id: "activity", label: "User Activity", icon: Activity },
    { id: "registrations", label: "Registrations", icon: ClipboardList },
    { id: "journey", label: "User Journey", icon: Route },
    { id: "onboarding", label: "Onboarding", icon: ClipboardCheck },
    { id: "web_ranking", label: "User Ranking", icon: Trophy },
    { id: "responsible", label: "Responsible Gaming", icon: HeartHandshake },
  ]},
  { label: "C74 Ecosystem", tone: "amethyst", items: [
    { id: "c74", label: "C74 Rewards", icon: Sparkles },
    { id: "c74_contribution", label: "Contribution Score", icon: Gauge },
    { id: "token_dashboard", label: "Token Dashboard", icon: Coins },
    { id: "missions", label: "Missions", icon: Target },
    { id: "events", label: "Events", icon: CalendarDays },
  ]},
  { label: "Games", tone: "ruby", items: [
    { id: "games_hub", label: "Games Manager", icon: Gamepad2 },
    { id: "analytics_hub", label: "Analytics & RTP", icon: BarChart3 },
    { id: "promotions", label: "Promotions", icon: Gift },
  ]},
  { label: "Operations", tone: "gold", items: [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "support", label: "Customer Service", icon: Headphones },
    { id: "payment_gateways", label: "Payment Gateways", icon: CreditCard },
    { id: "telegram", label: "Telegram Channels", icon: Send },
    { id: "geo", label: "Geo / Regions", icon: Globe },
  ]},
  { label: "Security", tone: "ruby", items: [
    { id: "audit_hub", label: "Audit & Sessions", icon: Fingerprint },
    { id: "containment", label: "Risk / Containment", icon: ShieldAlert },
    { id: "integrity", label: "Integrity", icon: BadgeCheck },
    { id: "golive", label: "Go-Live", icon: Rocket },
    { href: "/admin/api-keys", label: "API Keys", icon: Lock },
  ]},
  { label: "System", tone: "sapphire", items: [
    { id: "settings", label: "System Config", icon: Settings },
    { id: "web_bank", label: "Bank Details", icon: Landmark },
    { id: "web_banners", label: "Banners", icon: Image },
    { id: "web_welcome", label: "Welcome Message", icon: MessageSquare },
    { id: "web_message", label: "Site Message", icon: Megaphone },
    { id: "web_first_deposit", label: "First Deposit", icon: Sparkles },
    { id: "web_invite", label: "Invite Bonus", icon: Mail },
    { id: "web_currency", label: "Currency & Language", icon: Languages },
    { id: "web_colors", label: "Web Colors", icon: Palette },
    { id: "web_provider", label: "Provider API Config", icon: Plug },
    { id: "blog", label: "Blog", icon: Newspaper },
  ]},
];

// Jewel accent per section tone (label + icon-tile glow).
const TONE: Record<string, string> = {
  gold: "#f0c94a", emerald: "#2ee08a", sapphire: "#54a6f2", amethyst: "#b98cf0", ruby: "#ff6b7d",
};

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  open?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ activeTab, onTabChange, open, onClose }: AdminSidebarProps) {
  const isMobile = useIsMobile();
  // User-toggled collapse state; falls back to defaultOpen / contains-active.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const handleNavClick = (tab: AdminTab) => {
    onTabChange(tab);
    if (isMobile && onClose) onClose();
  };

  const sectionOpen = (s: Section) => {
    if (s.label in toggled) return toggled[s.label];
    if (s.items.some((i) => i.id === activeTab)) return true;
    return !!s.defaultOpen;
  };

  const renderItem = (item: SectionItem, tone: string) => {
    const Icon = item.icon;
    const accent = TONE[tone] || "#f0c94a";
    if (item.href) {
      return (
        <Link
          key={item.href}
          to={item.href}
          onClick={() => { if (isMobile && onClose) onClose(); }}
          className="ac-item"
          style={{ ["--accent" as any]: accent }}>
          <span className="ac-ic"><Icon className="h-[15px] w-[15px]" /></span>
          <span className="ac-lbl">{item.label}</span>
        </Link>
      );
    }
    const active = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={`ac-item${active ? " on" : ""}`}
        style={{ ["--accent" as any]: accent }}>
        <span className="ac-ic"><Icon className="h-[15px] w-[15px]" /></span>
        <span className="ac-lbl">{item.label}</span>
        {active && <span className="ac-dot" />}
      </button>
    );
  };

  const sidebarContent = (
    <aside className="ac-side w-64 md:w-[268px] flex-shrink-0 flex flex-col h-full overflow-y-auto relative">
      <style>{AC_CSS}</style>

      {/* Brand header */}
      <div className="ac-head">
        <div className="ac-brand">
          <div className="ac-crest"><Crown className="h-[18px] w-[18px]" strokeWidth={2.4} /></div>
          <div className="ac-brand-tx">
            <div className="ac-brand-name">C74 CONTROL</div>
            <div className="ac-brand-sub">Treasury Command Center</div>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} className="ac-close" aria-label="Close menu"><X className="h-5 w-5" /></button>
        )}
      </div>

      {/* Quick-link jewels */}
      <div className="ac-quick">
        <Link to="/admin/live" className="ac-q ac-q-gold">
          <Radio className="h-4 w-4" /><span>Live Control</span>
          <span className="ac-q-tag"><i className="ac-pulse" />LIVE</span>
        </Link>
        <Link to="/admin/originals" className="ac-q ac-q-emerald">
          <Sparkles className="h-4 w-4" /><span>Originals & Assets</span>
        </Link>
      </div>

      {/* Sections */}
      <nav className="ac-nav">
        {SECTIONS.map((section) => {
          const isOpen = sectionOpen(section);
          const accent = TONE[section.tone] || "#f0c94a";
          return (
            <div key={section.label} className="ac-sec">
              <button
                className="ac-sec-h"
                style={{ ["--accent" as any]: accent }}
                onClick={() => setToggled((t) => ({ ...t, [section.label]: !isOpen }))}
                aria-expanded={isOpen}>
                <span className="ac-sec-dot" />
                <span className="ac-sec-lbl">{section.label}</span>
                <span className="ac-sec-n">{section.items.length}</span>
                <ChevronDown className={`h-3.5 w-3.5 ac-chev${isOpen ? " open" : ""}`} />
              </button>
              {isOpen && (
                <div className="ac-sec-items">
                  {section.items.map((it) => renderItem(it, section.tone))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="ac-foot">
        <span className="ac-pulse" />
        <span>C74 · Control Center · Production</span>
      </div>
    </aside>
  );

  if (!isMobile) return sidebarContent;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}

// Premium emerald-glass + gold rail. Scoped entirely to .ac-side so it can be a
// dark jewel navigation rail against the light admin content canvas.
const AC_CSS = `
.ac-side{
  --gold:#f0c94a; --gold-hi:#fff3c8; --gold-deep:#c68a2e;
  --ink:#eafff4; --dim:#a9d8c0; --mut:#6f9e86; --line:rgba(240,201,74,.22);
  color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif;
  background:
    radial-gradient(120% 40% at 50% 0%, rgba(240,201,74,.08), transparent 60%),
    linear-gradient(180deg,#0a2c1c 0%,#071f13 46%,#04130c 100%);
  border-right:1px solid var(--line);
  box-shadow:1px 0 0 rgba(240,201,74,.14), 18px 0 40px -30px #000;
}
.ac-side::-webkit-scrollbar{width:5px}
.ac-side::-webkit-scrollbar-track{background:transparent}
.ac-side::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(240,201,74,.5),rgba(198,138,46,.4));border-radius:999px}

/* Brand header */
.ac-head{position:sticky;top:0;z-index:20;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;
  background:linear-gradient(180deg,rgba(8,32,20,.96),rgba(8,32,20,.7));-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--line)}
.ac-brand{display:flex;align-items:center;gap:11px;min-width:0}
.ac-crest{width:36px;height:36px;flex:0 0 auto;border-radius:11px;display:grid;place-items:center;color:#1a1206;
  background:linear-gradient(160deg,var(--gold-hi),var(--gold) 55%,var(--gold-deep));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 6px 16px -6px rgba(240,201,74,.7)}
.ac-brand-name{font-size:14px;font-weight:900;letter-spacing:.4px;line-height:1;
  background:linear-gradient(180deg,var(--gold-hi),var(--gold) 60%,var(--gold-deep));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.ac-brand-sub{font-size:9px;text-transform:uppercase;letter-spacing:.18em;color:var(--mut);margin-top:3px;font-weight:700}
.ac-close{color:var(--dim);padding:4px;border:none;background:none;cursor:pointer}
.ac-close:hover{color:var(--gold)}

/* Quick jewels */
.ac-quick{display:flex;flex-direction:column;gap:8px;padding:14px 12px 4px}
.ac-q{display:flex;align-items:center;gap:9px;padding:11px 13px;border-radius:13px;font-size:12.5px;font-weight:800;text-decoration:none;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1),filter .14s}
.ac-q:hover{transform:translateY(-1px);filter:brightness(1.06)}
.ac-q-gold{color:#1a1206;background:linear-gradient(160deg,var(--gold-hi),var(--gold) 58%,var(--gold-deep));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 8px 20px -8px rgba(240,201,74,.6)}
.ac-q-emerald{color:#eafff4;background:linear-gradient(160deg,rgba(46,224,138,.2),rgba(7,31,19,.7));
  border:1px solid rgba(46,224,138,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.ac-q-tag{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:8.5px;letter-spacing:.12em;font-weight:900}
.ac-pulse{width:7px;height:7px;border-radius:50%;background:#2ee08a;box-shadow:0 0 8px #2ee08a;display:inline-block}
@media (prefers-reduced-motion:no-preference){.ac-pulse{animation:acp 1.8s ease-in-out infinite}@keyframes acp{50%{opacity:.4;transform:scale(1.25)}}}

/* Nav sections */
.ac-nav{flex:1;padding:8px 10px 6px;display:flex;flex-direction:column;gap:4px}
.ac-sec{padding:2px 0}
.ac-sec-h{width:100%;display:flex;align-items:center;gap:8px;padding:7px 8px;border:none;background:none;cursor:pointer;
  font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.ac-sec-dot{width:6px;height:6px;border-radius:2px;background:var(--accent);box-shadow:0 0 8px -1px var(--accent);transform:rotate(45deg)}
.ac-sec-lbl{white-space:nowrap}
.ac-sec-n{margin-left:auto;font-size:9px;font-weight:800;color:var(--mut);letter-spacing:normal;
  background:rgba(255,255,255,.05);padding:1px 7px;border-radius:999px}
.ac-chev{color:var(--mut);transition:transform .2s}
.ac-chev.open{transform:rotate(180deg)}
.ac-sec-items{display:flex;flex-direction:column;gap:2px;padding:3px 0 6px}

/* Nav item */
.ac-item{width:100%;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:11px;border:none;cursor:pointer;
  background:transparent;color:var(--dim);font-family:inherit;font-size:12.5px;font-weight:700;text-align:left;text-decoration:none;
  transition:transform .13s cubic-bezier(.34,1.56,.64,1),background .13s,color .13s}
.ac-item:hover{transform:translateX(3px);color:var(--ink);background:linear-gradient(90deg,rgba(46,224,138,.1),rgba(46,224,138,.02))}
.ac-ic{width:26px;height:26px;flex:0 0 auto;border-radius:8px;display:grid;place-items:center;color:var(--accent);
  background:radial-gradient(120% 120% at 50% 20%,rgba(255,255,255,.08),rgba(4,19,12,.4));
  border:1px solid rgba(240,201,74,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.ac-lbl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-dot{width:6px;height:6px;border-radius:50%;background:#1a1206;flex:0 0 auto}
/* active = gold cabinet */
.ac-item.on{color:#1a1206;font-weight:900;
  background:linear-gradient(160deg,var(--gold-hi),var(--gold) 56%,var(--gold-deep));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 8px 20px -8px rgba(240,201,74,.6),0 0 0 1px rgba(240,201,74,.5)}
.ac-item.on:hover{transform:translateX(0);filter:brightness(1.03)}
.ac-item.on .ac-ic{color:var(--gold-deep);background:rgba(26,18,6,.16);border-color:rgba(26,18,6,.2);box-shadow:none}

/* Footer */
.ac-foot{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid rgba(240,201,74,.12)}
.ac-foot span:last-child{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:var(--mut);font-weight:800}
`;
