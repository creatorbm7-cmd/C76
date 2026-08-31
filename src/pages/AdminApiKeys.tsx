/**
 * AdminApiKeys — UONO-styled API key vault for the owner.
 *
 * Gated to a specific user_id (Shabeer). Shows status of each
 * external service the platform integrates with, where each
 * credential lives, and links to manage it externally.
 *
 * Security model:
 *   - Never displays actual secret VALUES (would leak to anyone
 *     with the auth token).
 *   - Shows: service name, what it's used for, where it lives,
 *     status pill, last-known config notes, "Open dashboard" link.
 *   - Frontend keys (anon URL/key) are public anyway and shown in full.
 *
 * Reachable at: /admin/api-keys
 *
 * UONO aesthetic:
 *   - Deep slate background with neon accent gradient borders
 *   - Cyan/gold dual-tone glow on cards
 *   - Pill statuses with pulse animation for OK/missing
 *   - Tabular service grid, mobile-first stacking
 */

import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

// Only this user can view the vault. (Shabeer — bmcreator9@gmail.com)
const ALLOWED_UID = "905e9730-aed4-4a2a-85e2-dcdb5e0104ad";

type ServiceStatus = "configured" | "missing" | "partial" | "unknown";
type ServiceCategory = "frontend" | "backend" | "ci";

interface Service {
  id: string;
  name: string;
  icon: string;
  category: ServiceCategory;
  status: ServiceStatus;
  description: string;
  /** Where the credential lives. */
  storage: string;
  /** Optional shown-value for public credentials (URL, project ref, etc). */
  publicValue?: string;
  /** External link to manage / rotate. */
  manageUrl?: string;
  /** Optional note (e.g. last rotation, why important). */
  note?: string;
}

const SERVICES: Service[] = [
  // ── FRONTEND (public, ship in client bundle) ─────────────────────────
  {
    id: "supabase-url",
    name: "Supabase URL",
    icon: "🟢",
    category: "frontend",
    status: "configured",
    description: "Project API endpoint, public by design",
    storage: ".env: VITE_SUPABASE_URL",
    publicValue: "https://smcwrriaraptzjhqdktg.supabase.co",
    manageUrl: "https://supabase.com/dashboard/project/smcwrriaraptzjhqdktg/settings/api",
  },
  {
    id: "supabase-anon",
    name: "Supabase Anon Key",
    icon: "🔓",
    category: "frontend",
    status: "configured",
    description: "Public anon JWT, RLS-protected, ships in bundle",
    storage: ".env: VITE_SUPABASE_ANON_KEY",
    manageUrl: "https://supabase.com/dashboard/project/smcwrriaraptzjhqdktg/settings/api",
    note: "Rotation requires frontend rebuild + redeploy",
  },
  // ── BACKEND (server-side, never shipped to client) ───────────────────
  {
    id: "service-role",
    name: "Supabase Service Role",
    icon: "🛡️",
    category: "backend",
    status: "configured",
    description: "Bypasses RLS, used by edge functions only",
    storage: "Supabase Vault → secrets",
    manageUrl: "https://supabase.com/dashboard/project/smcwrriaraptzjhqdktg/settings/api",
    note: "Highest-risk credential — rotate if ever exposed",
  },
  {
    id: "pexels",
    name: "Pexels API",
    icon: "📸",
    category: "backend",
    status: "configured",
    description: "Stock video clips for /live + lobby hero",
    storage: "Supabase Vault → PEXELS_API_KEY",
    manageUrl: "https://www.pexels.com/api/key/",
    note: "Free tier: 200 req/hr, 20K/month",
  },
  {
    id: "resend",
    name: "Resend",
    icon: "📧",
    category: "backend",
    status: "configured",
    description: "Transactional email (signup confirm, OTP, reset)",
    storage: "Supabase Vault → RESEND_API_KEY",
    manageUrl: "https://resend.com/api-keys",
    note: "Used by send-email, send-otp-email edge functions",
  },
  {
    id: "anthropic",
    name: "Anthropic / OpenAI",
    icon: "🤖",
    category: "backend",
    status: "unknown",
    description: "AI features (support-triage, summarize-thread)",
    storage: "Supabase Vault → ANTHROPIC_API_KEY",
    manageUrl: "https://console.anthropic.com/settings/keys",
    note: "Required by support-triage, summarize-thread edge functions",
  },
  // ── CI / DEPLOY (server-side, never in client) ───────────────────────
  {
    id: "github-pat",
    name: "GitHub PAT",
    icon: "🚀",
    category: "ci",
    status: "configured",
    description: "Deploy to GitHub Pages via Actions",
    storage: "GitHub repo → Settings → Secrets",
    manageUrl: "https://github.com/settings/tokens",
    note: "Rotate session tokens that were shared with AI tools",
  },
  {
    id: "vercel",
    name: "Vercel",
    icon: "▲",
    category: "ci",
    status: "partial",
    description: "PR preview deployments",
    storage: "GitHub repo → Vercel integration",
    manageUrl: "https://vercel.com/dashboard",
    note: "Preview-only; production hosted on GitHub Pages",
  },
];

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  frontend: "Frontend Bundle (public)",
  backend: "Backend Vault (server-only)",
  ci: "CI / Deploy",
};

const STATUS_STYLES: Record<ServiceStatus, { label: string; color: string; pulse: boolean }> = {
  configured: { label: "CONFIGURED", color: "#00d68f", pulse: true },
  partial: { label: "PARTIAL", color: "#ffb800", pulse: false },
  missing: { label: "MISSING", color: "#ff3d5e", pulse: true },
  unknown: { label: "UNKNOWN", color: "#7884a0", pulse: false },
};

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function AdminApiKeys() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<ServiceCategory | "all">("all");

  // Live test results — overrides the static `status` field on each service
  const [testResults, setTestResults] = useState<Record<string, {
    status: ServiceStatus;
    detail?: string;
    latency_ms?: number;
  }>>({});
  const [testing, setTesting] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoaded(true);
    });
  }, []);

  // ── Run live probes against each service via edge function ──────
  const runTests = async () => {
    setTesting(true);
    setTestError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "test-api-connections",
        { body: {} },
      );
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "test failed");

      // Map edge-function response to UI state
      const next: typeof testResults = {};
      for (const [id, r] of Object.entries(data.results ?? {})) {
        const result = r as { status: unknown; detail?: string; latency_ms?: number };
        let uiStatus: ServiceStatus;
        if (result.status === "ok") uiStatus = "configured";
        else if (result.status === "missing") uiStatus = "missing";
        else if (result.status === "unreachable") uiStatus = "partial";
        else uiStatus = "partial"; // error object
        next[id] = {
          status: uiStatus,
          detail: typeof result.status === "object" && result.status !== null
            ? (result.status as { error?: string }).error
            : result.detail,
          latency_ms: result.latency_ms,
        };
      }
      setTestResults(next);
      setLastTestedAt(new Date().toLocaleTimeString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestError(msg);
    } finally {
      setTesting(false);
    }
  };

  if (!loaded) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#06080d",
        color: "#7884a0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        Loading vault…
      </div>
    );
  }

  // ── Access gate ────────────────────────────────────────────────────
  if (!session || session.user.id !== ALLOWED_UID) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#06080d",
        color: "#e8ebf2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Vault Locked</h1>
        <p style={{ marginTop: 8, color: "#7884a0", fontSize: 14, maxWidth: 340 }}>
          {session
            ? "Your account doesn't have admin access to the API key vault."
            : "Sign in as the owner to view the API key vault."}
        </p>
        <button
          onClick={() => navigate(session ? "/casino" : "/login")}
          style={{
            marginTop: 24,
            padding: "10px 22px",
            background: "linear-gradient(90deg, #ff2238 0%, #ffd66b 100%)",
            color: "#06080d",
            border: "none",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1.2,
            cursor: "pointer",
          }}
        >
          {session ? "BACK TO CASINO" : "SIGN IN"}
        </button>
      </div>
    );
  }

  const filtered = filter === "all"
    ? SERVICES
    : SERVICES.filter((s) => s.category === filter);

  const stats = {
    total: SERVICES.length,
    configured: SERVICES.filter((s) => s.status === "configured").length,
    missing: SERVICES.filter((s) => s.status === "missing" || s.status === "unknown").length,
  };

  return (
    <div style={pageStyle}>
      <style>{PAGE_CSS}</style>

      {/* ── HERO STRIP ───────────────────────────────────────────── */}
      <header style={heroStyle}>
        <button
          onClick={() => navigate("/v3")}
          aria-label="Back to casino"
          style={backBtnStyle}
        >
          ← Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={titleStyle}>🔐 API KEY VAULT</h1>
          <p style={subtitleStyle}>
            {lastTestedAt
              ? `Last tested: ${lastTestedAt}`
              : "UONO Admin · tap Test All to probe each service"}
          </p>
        </div>
        <button
          onClick={runTests}
          disabled={testing}
          style={{
            ...testAllBtnStyle,
            opacity: testing ? 0.6 : 1,
            cursor: testing ? "wait" : "pointer",
          }}
          aria-label="Run live tests on all services"
        >
          {testing ? "TESTING…" : "TEST ALL"}
        </button>
      </header>

      {/* ── STATS STRIP ──────────────────────────────────────────── */}
      <div style={statsContainerStyle}>
        <div style={statStyle}>
          <div style={statValueStyle}>{stats.configured}</div>
          <div style={statLabelStyle}>OK</div>
        </div>
        <div style={statStyle}>
          <div style={{ ...statValueStyle, color: "#ffb800" }}>{stats.missing}</div>
          <div style={statLabelStyle}>CHECK</div>
        </div>
        <div style={statStyle}>
          <div style={{ ...statValueStyle, color: "#7884a0" }}>{stats.total}</div>
          <div style={statLabelStyle}>TOTAL</div>
        </div>
      </div>

      {testError && (
        <div style={errorBannerStyle} role="alert">
          ⚠ {testError}
        </div>
      )}

      {/* ── FILTER TABS ──────────────────────────────────────────── */}
      <div style={tabsContainerStyle}>
        {(["all", "frontend", "backend", "ci"] as const).map((cat) => {
          const active = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                ...tabStyle,
                background: active
                  ? "linear-gradient(90deg, rgba(0,212,255,0.18), rgba(255,214,107,0.18))"
                  : "rgba(255,255,255,0.03)",
                borderColor: active ? "#ff2238" : "rgba(255,255,255,0.08)",
                color: active ? "#e8ebf2" : "#7884a0",
              }}
            >
              {cat === "all" ? "ALL" : CATEGORY_LABELS[cat].toUpperCase().split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* ── SERVICE GRID ─────────────────────────────────────────── */}
      <div style={gridStyle}>
        {filtered.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            liveResult={testResults[s.id]}
          />
        ))}
      </div>

      <footer style={footerStyle}>
        <p style={{ margin: 0, fontSize: 11, color: "#52596d" }}>
          Secret values are never displayed in this UI. Click "Manage" on any
          card to view or rotate the credential at its source of truth.
        </p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Service card
// ─────────────────────────────────────────────────────────────────────────

function ServiceCard({
  service: s,
  liveResult,
}: {
  service: Service;
  liveResult?: { status: ServiceStatus; detail?: string; latency_ms?: number };
}) {
  // Live result wins over the static status
  const effectiveStatus = liveResult?.status ?? s.status;
  const status = STATUS_STYLES[effectiveStatus];
  const tested = !!liveResult;

  return (
    <article style={cardStyle} className="uono-card">
      {/* Neon border accent */}
      <div style={cardBorderGlowStyle} />

      <div style={cardInnerStyle}>
        <div style={cardHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={iconStyle}>{s.icon}</div>
            <div style={{ minWidth: 0 }}>
              <h3 style={cardTitleStyle}>{s.name}</h3>
              <div style={categoryLabelStyle}>{CATEGORY_LABELS[s.category]}</div>
            </div>
          </div>
          <span
            style={{
              ...statusPillStyle,
              color: status.color,
              border: `1px solid ${status.color}55`,
              background: `${status.color}15`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: status.color,
                marginRight: 6,
                display: "inline-block",
                animation: status.pulse
                  ? `uono-pulse 1.8s ease-in-out infinite`
                  : "none",
              }}
            />
            {status.label}
          </span>
        </div>

        <p style={cardDescStyle}>{s.description}</p>

        <div style={metaRowStyle}>
          <span style={metaLabelStyle}>Stored in</span>
          <code style={metaValueStyle}>{s.storage}</code>
        </div>

        {s.publicValue && (
          <div style={metaRowStyle}>
            <span style={metaLabelStyle}>Value</span>
            <code style={{ ...metaValueStyle, color: "#a5e8ff" }}>{s.publicValue}</code>
          </div>
        )}

        {tested && (
          <div style={metaRowStyle}>
            <span style={metaLabelStyle}>Probe</span>
            <code style={{
              ...metaValueStyle,
              color: effectiveStatus === "configured" ? "#00d68f" : "#ffb800",
            }}>
              {liveResult?.detail ?? "tested"}
              {typeof liveResult?.latency_ms === "number" && ` · ${liveResult.latency_ms}ms`}
            </code>
          </div>
        )}

        {s.note && (
          <div style={noteStyle}>
            <span style={{ color: "#ffb800", marginRight: 6 }}>ⓘ</span>
            {s.note}
          </div>
        )}

        {s.manageUrl && (
          <a
            href={s.manageUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={manageBtnStyle}
            className="uono-manage-btn"
          >
            Manage →
          </a>
        )}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────

const PAGE_CSS = `
@keyframes uono-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.55; transform: scale(1.4); }
}
@keyframes uono-border-glow {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
.uono-card { transition: transform 220ms cubic-bezier(.22,.61,.36,1), border-color 220ms; }
.uono-card:hover { transform: translateY(-2px); }
.uono-card:hover > div:first-child { animation: uono-border-glow 2s ease-in-out infinite; }
.uono-manage-btn:hover { background: linear-gradient(90deg, #ff2238, #ffd66b) !important; color: #06080d !important; }
`;

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: `
    radial-gradient(ellipse at top, rgba(0,212,255,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(255,214,107,0.05) 0%, transparent 50%),
    #06080d
  `,
  color: "#e8ebf2",
  fontFamily: "system-ui, -apple-system, sans-serif",
  paddingBottom: 60,
};

const heroStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "20px 16px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(0,0,0,0.4)",
  backdropFilter: "blur(12px)",
};

const backBtnStyle: CSSProperties = {
  padding: "6px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  color: "#7884a0",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.5,
  cursor: "pointer",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 900,
  letterSpacing: 1.2,
  background: "linear-gradient(90deg, #ff2238 0%, #ffd66b 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const subtitleStyle: CSSProperties = {
  margin: "2px 0 0",
  fontSize: 11,
  color: "#7884a0",
  letterSpacing: 0.3,
};

const statsContainerStyle: CSSProperties = {
  display: "flex",
  gap: 16,
  padding: "12px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  background: "rgba(0,0,0,0.2)",
};

const testAllBtnStyle: CSSProperties = {
  padding: "8px 16px",
  background: "linear-gradient(90deg, #ff2238 0%, #ffd66b 100%)",
  border: "none",
  borderRadius: 10,
  color: "#06080d",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1.4,
  transition: "all 0.18s ease",
  fontFamily: "inherit",
  boxShadow: "0 4px 16px rgba(0,212,255,0.35)",
};

const errorBannerStyle: CSSProperties = {
  margin: "12px 16px 0",
  padding: "10px 14px",
  background: "rgba(255,61,94,0.08)",
  border: "1px solid rgba(255,61,94,0.4)",
  borderRadius: 10,
  color: "#ff8095",
  fontSize: 12,
  fontWeight: 600,
};

const statStyle: CSSProperties = {
  textAlign: "center",
  minWidth: 38,
};

const statValueStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: "#00d68f",
  lineHeight: 1,
};

const statLabelStyle: CSSProperties = {
  fontSize: 9,
  color: "#52596d",
  letterSpacing: 1.4,
  marginTop: 2,
};

const tabsContainerStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  padding: "16px 16px 0",
  overflowX: "auto",
};

const tabStyle: CSSProperties = {
  padding: "7px 14px",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 1.2,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 0.18s ease",
  fontFamily: "inherit",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
  padding: "16px",
};

const cardStyle: CSSProperties = {
  position: "relative",
  borderRadius: 14,
  overflow: "hidden",
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const cardBorderGlowStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 14,
  padding: 1,
  background: "linear-gradient(135deg, rgba(0,212,255,0.4), transparent 40%, transparent 60%, rgba(255,214,107,0.4))",
  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
  WebkitMaskComposite: "xor",
  maskComposite: "exclude",
  pointerEvents: "none",
  opacity: 0.5,
};

const cardInnerStyle: CSSProperties = {
  position: "relative",
  padding: 16,
  zIndex: 1,
};

const cardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 10,
};

const iconStyle: CSSProperties = {
  fontSize: 22,
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "rgba(0,212,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 800,
  color: "#e8ebf2",
  letterSpacing: 0.2,
};

const categoryLabelStyle: CSSProperties = {
  fontSize: 9,
  color: "#52596d",
  letterSpacing: 1.2,
  textTransform: "uppercase",
  marginTop: 1,
};

const statusPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 8px",
  borderRadius: 999,
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 1.2,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const cardDescStyle: CSSProperties = {
  margin: "6px 0 12px",
  fontSize: 12,
  color: "#a8b1c5",
  lineHeight: 1.45,
};

const metaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 0",
  borderTop: "1px solid rgba(255,255,255,0.04)",
  fontSize: 11,
};

const metaLabelStyle: CSSProperties = {
  color: "#52596d",
  fontSize: 10,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  minWidth: 70,
};

const metaValueStyle: CSSProperties = {
  fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
  fontSize: 11,
  color: "#a8b1c5",
  background: "rgba(0,0,0,0.3)",
  padding: "2px 6px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.04)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  minWidth: 0,
};

const noteStyle: CSSProperties = {
  marginTop: 10,
  padding: "8px 10px",
  background: "rgba(255,184,0,0.06)",
  border: "1px solid rgba(255,184,0,0.18)",
  borderRadius: 8,
  fontSize: 11,
  color: "#d4c8a0",
  lineHeight: 1.4,
};

const manageBtnStyle: CSSProperties = {
  display: "inline-block",
  marginTop: 12,
  padding: "8px 16px",
  background: "rgba(0,212,255,0.08)",
  border: "1px solid rgba(0,212,255,0.3)",
  borderRadius: 8,
  color: "#ff2238",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1,
  textDecoration: "none",
  transition: "all 0.18s ease",
};

const footerStyle: CSSProperties = {
  padding: "20px 16px",
  textAlign: "center",
};
