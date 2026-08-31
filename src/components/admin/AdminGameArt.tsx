// Game Art Studio — batch HD artwork for the live games lobby.
//
// Iterates the live 2J aggregator catalog and, per game, generates premium
// vertical slot-cover art via the admin OpenAI image endpoint (admin-casino
// `ai_image_gen`) and binds it to the asset library under `game.<uid>`. The
// games lobby (LiveApiGames) renders that art automatically over the bundled
// PNG / CDN thumbnail — no code change, no touch to the 2J launch flow.
//
// Cost-aware: sequential generation, skip games that already have art, a hard
// per-run cap, and a Stop button. Each generated image = one OpenAI credit.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { invokeAdmin } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import { uploadArt } from "@/lib/appArt";
import { fetchLiveCatalog, type CatalogGame } from "@/lib/igaming";
import { toast } from "sonner";
import { Loader2, RefreshCw, Wand2, Image as ImageIcon, Check, Square, Play, Gamepad2 } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

const STYLE =
  ", premium vertical slot-machine game cover art, 3D HDR cartoon casino style, glossy cinematic lighting, royal gold and emerald green with black-diamond accents, ornate gold bezel frame, high detail, centered hero composition, mobile game thumbnail";

const artKey = (uid: string) => `game.${uid}`;
const promptFor = (g: CatalogGame) => `"${g.name}" — a ${g.category} casino game` + STYLE;

export default function AdminGameArt() {
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [haveKeys, setHaveKeys] = useState<Set<string>>(new Set()); // asset_keys already bound
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [cap, setCap] = useState(25);
  const stopRef = useRef(false);

  const loadAssets = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)("admin_app_assets_list");
    if (!error && Array.isArray(data)) {
      setHaveKeys(new Set(data.map((a: any) => a.asset_key).filter(Boolean)));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ games: g }] = await Promise.all([fetchLiveCatalog(), loadAssets()]);
      setGames(g ?? []);
    } catch { toast.error("Couldn't load the live catalog"); }
    finally { setLoading(false); }
  }, [loadAssets]);
  useEffect(() => { load(); }, [load]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(games.map((x) => x.category))).sort()],
    [games],
  );
  const filtered = useMemo(() => games.filter((g) =>
    (cat === "all" || g.category === cat) &&
    (!q || `${g.name} ${g.uid}`.toLowerCase().includes(q.toLowerCase()))
  ), [games, cat, q]);

  const hasArt = (g: CatalogGame) => haveKeys.has(artKey(g.uid));
  const withArt = useMemo(() => games.filter(hasArt).length, [games, haveKeys]);

  // Generate + bind one game's art. Returns true on success.
  const genOne = useCallback(async (g: CatalogGame): Promise<boolean> => {
    setBusyUid(g.uid);
    try {
      const { data, error } = await invokeAdmin<{ images?: string[]; error?: string }>(
        "admin-casino",
        { action: "ai_image_gen", prompt: promptFor(g), size: "1024x1536", quality: "high", background: "opaque", n: 1 },
      );
      const msg = data?.error ?? error?.message;
      if (msg) throw new Error(/OPENAI_API_KEY not configured/i.test(msg) ? "OpenAI key not configured on the server" : msg);
      const uri = (data?.images ?? [])[0];
      if (!uri) throw new Error("No image returned");
      // Upload the generated PNG to Storage and bind its URL — NOT the ~2-4MB
      // base64 (which overflows the save_app_asset RPC payload and also bloats
      // every lobby load). Keeps app_assets tiny.
      const publicUrl = await uploadArt(uri, artKey(g.uid));
      const { data: sv, error: se } = await (supabase.rpc as any)("save_app_asset", {
        p_name: g.name.slice(0, 40), p_category: "game", p_image: publicUrl, p_prompt: promptFor(g), p_asset_key: artKey(g.uid),
      });
      if (se || sv?.error) throw new Error(sv?.error ?? se?.message);
      setHaveKeys((prev) => new Set(prev).add(artKey(g.uid)));
      return true;
    } catch (e: any) {
      toast.error(`${g.name}: ${e?.message ?? "failed"}`);
      return false;
    } finally { setBusyUid(null); }
  }, []);

  const genSingle = async (g: CatalogGame) => { if (!running) { const ok = await genOne(g); if (ok) toast.success(`${g.name} — art bound live`); } };

  // Batch: generate art for the filtered games that don't have it yet, up to cap.
  const runBatch = async () => {
    const queue = filtered.filter((g) => !hasArt(g)).slice(0, cap);
    if (!queue.length) { toast.info("Every game in view already has art"); return; }
    if (!confirm(`Generate HD art for ${queue.length} game(s)? Each uses one OpenAI image credit.`)) return;
    stopRef.current = false; setRunning(true); setProgress({ done: 0, total: queue.length });
    let ok = 0;
    for (let i = 0; i < queue.length; i++) {
      if (stopRef.current) break;
      if (await genOne(queue[i])) ok++;
      setProgress({ done: i + 1, total: queue.length });
    }
    setRunning(false); setProgress(null);
    toast.success(`Done — ${ok}/${queue.length} game(s) got fresh art`);
  };
  const stop = () => { stopRef.current = true; toast("Stopping after the current image…"); };

  const missingInView = filtered.filter((g) => !hasArt(g)).length;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.ga-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}.ga-in{width:100%;border:1px solid rgba(15,23,42,0.14);border-radius:9px;padding:8px 10px;font-size:13px;color:#0f172a;background:#fff}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Games · HD Artwork"
          title="GAME ART STUDIO"
          tone="rose"
          icon={<Wand2 className="h-5 w-5" />}
          badges={[{ label: `${games.length} GAMES`, tone: "rose", dot: true }, { label: `${withArt} WITH ART`, tone: "emerald" }, { label: `${games.length - withArt} MISSING`, tone: "amber" }]}
          subtitle={<>Generate premium vertical slot-cover art per game and bind it to <code>game.&lt;uid&gt;</code> — the lobby shows it automatically. The 2J launch flow is never touched. Each image uses one OpenAI credit.</>}
          actions={<>
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading || running}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Reload</V8HeroBtn>
            {running
              ? <V8HeroBtn variant="primary" onClick={stop}><Square className="h-3.5 w-3.5" /> Stop {progress ? `(${progress.done}/${progress.total})` : ""}</V8HeroBtn>
              : <V8HeroBtn variant="primary" onClick={runBatch} disabled={loading || missingInView === 0}><Play className="h-3.5 w-3.5" /> Generate missing ({Math.min(missingInView, cap)})</V8HeroBtn>}
          </>}
        />

        <div className="grid grid-cols-3 gap-3">
          <V8StatCard icon={<Gamepad2 className="h-4 w-4" />} label="Games" value={games.length} sub="live catalog" tone="rose" delay={0} />
          <V8StatCard icon={<Check className="h-4 w-4" />} label="With HD art" value={withArt} sub="bound live" tone="emerald" delay={80} />
          <V8StatCard icon={<ImageIcon className="h-4 w-4" />} label="Missing" value={games.length - withArt} sub="no art yet" tone="amber" delay={160} />
        </div>

        {/* controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input className="ga-in" style={{ maxWidth: 200 }} placeholder="Search games…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">Per-run cap
            <input type="number" min={1} max={200} value={cap} onChange={(e) => setCap(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} className="ga-in" style={{ width: 64 }} disabled={running} />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                style={cat === c ? { background: "linear-gradient(135deg,#a855f7,#6d28d9)", color: "#fff" } : { background: "rgba(15,23,42,0.05)", color: "#475569" }}>{c}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="ga-card p-10 text-center text-slate-400 text-sm">No games match.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((g) => {
              const done = hasArt(g);
              const busy = busyUid === g.uid;
              return (
                <div key={g.uid} className="ga-card p-2.5 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-7 w-7 rounded-lg grid place-items-center text-xs shrink-0 ${done ? "text-emerald-600" : "text-slate-300"}`}
                      style={{ background: done ? "rgba(16,185,129,0.12)" : "rgba(15,23,42,0.05)" }}>{done ? <Check className="h-4 w-4" /> : "🎮"}</span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-slate-800 truncate">{g.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{g.category} · <span className="font-mono">{g.uid}</span></div>
                    </div>
                  </div>
                  <button onClick={() => genSingle(g)} disabled={busy || running}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold text-white disabled:opacity-50"
                    style={{ background: done ? "linear-gradient(135deg,#64748b,#475569)" : "linear-gradient(135deg,#a855f7,#6d28d9)" }}>
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} {done ? "Regenerate" : "Generate"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
