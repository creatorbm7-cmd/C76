import { useState } from "react";

/**
 * AdminHub — consolidation wrapper (audit Phase 3).
 *
 * Renders a premium sub-tab bar over a set of EXISTING admin components, so
 * overlapping tabs (deposits ×5, treasury ×3, agents ×3, games ×4, analytics ×3,
 * audit ×2) collapse into one canonical hub each. Presentation only: every
 * sub-view is the original component rendered verbatim, and only the ACTIVE
 * sub-tab mounts (via the `render` thunk) so no extra data is fetched. No hooks,
 * queries, RPCs or money paths are touched here.
 */
export interface HubTab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  render: () => JSX.Element;
}

export default function AdminHub({ tabs, defaultKey }: { tabs: HubTab[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);
  const cur = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="space-y-4">
      <style>{AHUB_CSS}</style>
      <div className="ahub-bar" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={`ahub-tab${active === t.key ? " on" : ""}`}
            onClick={() => setActive(t.key)}
          >
            {t.icon && <span className="ahub-ic">{t.icon}</span>}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div>{cur?.render()}</div>
    </div>
  );
}

// Light-canvas pill bar (the admin content area is the light theme), with a
// premium emerald→gold active state to echo the console chrome.
const AHUB_CSS = `
.ahub-bar{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:4px 2px 2px;-webkit-overflow-scrolling:touch}
.ahub-bar::-webkit-scrollbar{display:none}
.ahub-tab{flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:11px;cursor:pointer;
  font-size:12.5px;font-weight:800;letter-spacing:.2px;font-family:inherit;white-space:nowrap;color:#334155;
  background:#ffffff;border:1px solid rgba(15,23,42,0.09);
  box-shadow:0 1px 2px rgba(15,23,42,0.05);transition:transform .13s cubic-bezier(.34,1.56,.64,1),background .13s,color .13s,box-shadow .13s}
.ahub-tab:hover{transform:translateY(-1px);color:#0f172a;border-color:rgba(16,185,129,0.4)}
.ahub-tab .ahub-ic{display:grid;place-items:center;color:#059669}
.ahub-tab.on{color:#053b23;border-color:transparent;
  background:linear-gradient(160deg,#a7f3d0,#34d399 55%,#059669);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.55),0 6px 16px -6px rgba(16,185,129,0.55)}
.ahub-tab.on .ahub-ic{color:#053b23}
`;
