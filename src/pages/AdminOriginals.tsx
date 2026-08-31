// AdminOriginals — C74 Originals / Registry / Asset operations console (P8).
//
// A STANDALONE, self-contained admin page at /admin/originals (guarded like
// /admin/live). It is 100% additive and READ-ONLY: it previews the data-driven
// game registry (public/games-html/games.json merged with built-ins), shows which
// AI-art asset slots are bound vs missing (via get_app_assets), and lets an
// operator export / draft the games.json config. It performs NO filesystem writes,
// NO backend mutations, NO payment/RNG/schema changes — onboarding a game is still
// a deploy-time folder + JSON edit (runtime ZIP upload is not possible on Vercel
// static hosting, which this page states explicitly).

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gamepad2, Image as ImageIcon, Download, Upload, CheckCircle2, XCircle, AlertTriangle, Copy, Check } from "lucide-react";
import { fetchC74Registry, type C74Original } from "@/games/c74originals/registry";
import { useAppAssets } from "@/hooks/useAppAssets";

// The V2 lobby AI-art slots (mirror of the AI Studio presets / docs).
const V2_SLOTS = [
  "v2.lobby.bg", "v2.ambient.layer", "v2.hero.frame", "v2.btn.deposit", "v2.btn.withdraw",
  "v2.jackpot", "v2.jackpot.coin", "v2.jackpot.wheel", "v2.reward.daily", "v2.vip",
];

export default function AdminOriginals() {
  const art = useAppAssets();
  const [games, setGames] = useState<C74Original[]>([]);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [importErr, setImportErr] = useState("");

  useEffect(() => {
    fetchC74Registry().then((g) => {
      setGames(g);
      setDraft(JSON.stringify(g.map(stripDefaults), null, 2));
    }).catch(() => { /* keep empty */ });
  }, []);

  const liveCount = games.filter((g) => g.enabled).length;

  // Asset status: which slots are bound (get_app_assets) vs missing.
  const slotRows = useMemo(() => {
    const gameSlots = games.map((g) => `game.${g.slug}`);
    return [...V2_SLOTS, ...gameSlots].map((k) => ({ key: k, bound: !!art[k] }));
  }, [games, art]);
  const boundCount = slotRows.filter((s) => s.bound).length;

  const exportJson = () => {
    const blob = new Blob([draft], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "games.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const copyJson = async () => {
    try { await navigator.clipboard?.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };
  const validateDraft = (txt: string) => {
    setDraft(txt);
    try {
      const parsed = JSON.parse(txt);
      if (!Array.isArray(parsed)) { setImportErr("Root must be an array of games."); return; }
      const bad = parsed.find((g: unknown) => typeof (g as { slug?: unknown })?.slug !== "string");
      setImportErr(bad ? "Every entry needs a string \"slug\"." : "");
    } catch (e) { setImportErr((e as Error).message); }
  };

  return (
    <div className="min-h-screen bg-[#04120b] text-emerald-50 p-4 pb-24">
      <header className="flex items-center gap-3 mb-4">
        <Link to="/admin" className="grid place-items-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-200"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="text-lg font-black tracking-tight">C74 Originals &amp; Assets</h1>
          <p className="text-[11px] text-emerald-300/70">Registry · asset bindings · configuration — read-only operations console</p>
        </div>
      </header>

      {/* Static-hosting limitation banner */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 mb-4 text-amber-200">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-[11.5px] leading-snug">
          <b>Runtime ZIP upload is not supported</b> on Vercel static hosting (read-only filesystem).
          Onboard a game at deploy time: extract the ZIP into <code>public/games-html/&lt;slug&gt;/</code>,
          add a row to <code>public/games-html/games.json</code> (export/draft below), optionally bind
          <code> game.&lt;slug&gt;</code> art in AI Studio, then commit + deploy.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <Tile icon={<Gamepad2 className="w-4 h-4" />} v={games.length} k="Registered" />
        <Tile icon={<CheckCircle2 className="w-4 h-4" />} v={liveCount} k="Live" />
        <Tile icon={<ImageIcon className="w-4 h-4" />} v={`${boundCount}/${slotRows.length}`} k="Assets bound" />
      </div>

      {/* Registry preview */}
      <Section title="Game Registry">
        <div className="overflow-x-auto rounded-xl border border-emerald-400/20">
          <table className="w-full text-[11.5px]">
            <thead className="bg-emerald-500/10 text-emerald-300/80 text-left">
              <tr>{["Slug", "Name", "Orient.", "Art", "Status"].map((h) => <th key={h} className="px-3 py-2 font-bold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.slug} className="border-t border-emerald-400/10">
                  <td className="px-3 py-2 font-mono text-emerald-200">{g.slug}</td>
                  <td className="px-3 py-2 font-bold">{g.name}</td>
                  <td className="px-3 py-2 text-emerald-300/70">{g.orientation || "portrait"}</td>
                  <td className="px-3 py-2">{art[`game.${g.slug}`] || g.thumbnail
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    : <XCircle className="w-3.5 h-3.5 text-amber-400/70" />}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${g.enabled ? "bg-emerald-600 text-white" : "bg-amber-500/20 text-amber-200 border border-amber-400/40"}`}>{g.enabled ? "LIVE" : "SOON"}</span>
                  </td>
                </tr>
              ))}
              {games.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-emerald-300/50">Loading registry…</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Asset slot mapping */}
      <Section title="AI Asset Bindings">
        <div className="grid grid-cols-2 gap-2">
          {slotRows.map((s) => (
            <div key={s.key} className="flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-500/5 px-3 py-2">
              {s.bound ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />}
              <code className="text-[10.5px] text-emerald-200 truncate">{s.key}</code>
              <span className={`ml-auto text-[8.5px] font-black ${s.bound ? "text-emerald-400" : "text-amber-300/60"}`}>{s.bound ? "BOUND" : "MISSING"}</span>
            </div>
          ))}
        </div>
        <p className="text-[10.5px] text-emerald-300/60 mt-2">Missing slots fall back to the built-in procedural design. Bind art in <b>Admin → AI Studio</b> (see docs/V2-STUDIO-ART-KEYS.md).</p>
      </Section>

      {/* games.json config draft / import / export */}
      <Section title="games.json Configuration">
        <div className="flex gap-2 mb-2">
          <button onClick={exportJson} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-[12px] font-bold"><Download className="w-3.5 h-3.5" /> Export</button>
          <button onClick={copyJson} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-[12px] font-bold">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}</button>
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-[12px] font-bold cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Load file
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(validateDraft); }} />
          </label>
        </div>
        <textarea
          value={draft}
          onChange={(e) => validateDraft(e.target.value)}
          spellCheck={false}
          className="w-full h-64 rounded-xl bg-[#02100a] border border-emerald-400/20 p-3 font-mono text-[11px] text-emerald-100 leading-relaxed"
        />
        {importErr
          ? <p className="text-[11px] text-red-300 mt-1 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {importErr}</p>
          : <p className="text-[11px] text-emerald-300/70 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Valid — commit this to <code>public/games-html/games.json</code> and deploy.</p>}
      </Section>

      {/* Folder structure docs */}
      <Section title="Folder Structure">
        <pre className="rounded-xl bg-[#02100a] border border-emerald-400/20 p-3 text-[11px] text-emerald-200/90 overflow-x-auto">{`public/games-html/
  games.json              (registry index — edit this)
  <slug>/
    index.html            (entry — required)
    js/  audio/  images/  fonts/   (game's own assets)
    thumb.png             (optional card art; or bind game.<slug> in AI Studio)`}</pre>
        <p className="text-[10.5px] text-emerald-300/60 mt-2">Full guide: <code>docs/C74-ZIP-GAME-ENGINE.md</code>. The generic host at <code>/play/&lt;slug&gt;</code> serves any installed folder (fullscreen, sound bridge, jackpot overlay), portrait or landscape.</p>
      </Section>
    </div>
  );
}

function Tile({ icon, v, k }: { icon: React.ReactNode; v: React.ReactNode; k: string }) {
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-center">
      <span className="inline-grid place-items-center text-emerald-400">{icon}</span>
      <div className="text-lg font-black text-emerald-50">{v}</div>
      <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-300/60">{k}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="text-[13px] font-black text-emerald-300 mb-2">{title}</h2>
      {children}
    </section>
  );
}

// Drop registry-default fields so the exported JSON stays tidy/minimal.
function stripDefaults(g: C74Original) {
  const out: Record<string, unknown> = { slug: g.slug, name: g.name, category: g.category, provider: g.provider };
  if (g.blurb) out.blurb = g.blurb;
  if (g.thumbnail) out.thumbnail = g.thumbnail;
  if (g.icon) out.icon = g.icon;
  if (g.banner) out.banner = g.banner;
  out.orientation = g.orientation || "portrait";
  out.enabled = g.enabled;
  return out;
}
