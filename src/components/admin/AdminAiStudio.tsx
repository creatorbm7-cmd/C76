// AI Studio — admin OpenAI image generator for in-app assets.
//
// Generate premium 3D/HDR-cartoon artwork (wheel faces, icons, mascots,
// backdrops) from a prompt, then download the PNG or copy its data-URI straight
// into a component ASSETS slot (e.g. C74Wheel.tsx). Backed by the admin-only
// `ai-image-gen` edge function — the OpenAI key stays server-side.

import { useState, useCallback, useEffect } from "react";
import { invokeAdmin } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Wand2, Download, Copy, AlertTriangle, Save, Trash2, RefreshCw, Link2, Upload } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn } from "./adminV8Kit";
import { C7_ASSET_SLOTS } from "@/lib/c7Assets";

// Bindable UI slots — saving an image to one makes it appear live in that
// surface (fetched via get_app_assets()). "" = save to library only.
const SLOT_KEYS = [
  { v: "", l: "Library only" },
  { v: "wheel.face", l: "Wheel · face" },
  { v: "wheel.hub", l: "Wheel · hub" },
  { v: "wheel.pointer", l: "Wheel · pointer" },
  { v: "wheel.backdrop", l: "Wheel · backdrop" },
  { v: "wheel.mascot", l: "Wheel · mascot" },
  { v: "gullak.piggy", l: "Gullak · piggy" },
  { v: "gullak.backdrop", l: "Gullak · backdrop" },
  // Home dashboard quick-action icons — original 2D-art (transparent PNG) that
  // replaces the emoji fallback on the home RichDashboard tiles.
  { v: "dash.bank", l: "Dashboard · Bank Game icon" },
  { v: "dash.missions", l: "Dashboard · Missions icon" },
  { v: "dash.c74", l: "Dashboard · C74 Rewards icon" },
  { v: "dash.vip", l: "Dashboard · VIP Club icon" },
  { v: "dash.top", l: "Dashboard · Leaderboard icon" },
  { v: "dash.daily", l: "Dashboard · Daily Bonus icon" },
  // Home promo-reel banner backgrounds (wide 2D-art / video-still per slide).
  { v: "dash.reel.welcome", l: "Reel · Welcome banner" },
  { v: "dash.reel.jackpot", l: "Reel · Jackpot banner" },
  { v: "dash.reel.vip", l: "Reel · VIP banner" },
  { v: "dash.reel.refer", l: "Reel · Refer banner" },
  // Bottom-nav tab art — overrides the bundled /nav/<id>.webp. `nav.profile`
  // gives the Profile tab a real illustrated icon to match the other tabs.
  { v: "nav.profile", l: "Nav · Profile tab" },
  { v: "nav.bank", l: "Nav · Bank tab" },
  { v: "nav.game", l: "Nav · Game tab" },
  { v: "nav.refer", l: "Nav · Refer tab" },
  { v: "nav.events", l: "Nav · Events tab" },
  // Home trust strip (top 3 badges).
  { v: "trust.games", l: "Trust · Live Games" },
  { v: "trust.fair", l: "Trust · Provably Fair" },
  { v: "trust.instant", l: "Trust · Instant USDT" },
  // Home top-bar header icons.
  { v: "hdr.gift", l: "Header · Gift" },
  { v: "hdr.bell", l: "Header · Bell" },
  { v: "hdr.support", l: "Header · Support" },
  { v: "hdr.settings", l: "Header · Settings" },
  // Home promo carousel cards.
  { v: "promo.daily", l: "Promo · Daily Bonus" },
  { v: "promo.tourney", l: "Promo · Tournament" },
  { v: "promo.refer", l: "Promo · Referral" },
  { v: "promo.vip", l: "Promo · VIP" },
  { v: "promo.c74", l: "Promo · C74" },
  { v: "promo.spin", l: "Promo · Lucky Spin" },
  { v: "promo.bank", l: "Promo · Bank Game" },
  { v: "promo.missions", l: "Promo · Missions" },
  { v: "promo.events", l: "Promo · Events" },
  // C74 hub feature tiles.
  { v: "c74.wheel", l: "C74 hub · Lucky Wheel" },
  { v: "c74.bank", l: "C74 hub · Bank Game" },
  { v: "c74.missions", l: "C74 hub · Missions" },
  { v: "c74.events", l: "C74 hub · Events" },
  { v: "c74.vip", l: "C74 hub · VIP" },
  { v: "c74.refer", l: "C74 hub · Refer" },
  // ── V2 Premium Lobby (/v2) cinematic slots — consumed by the V2 lobby via
  // get_app_assets; each has a procedural CSS fallback until bound. See
  // docs/V2-STUDIO-ART-KEYS.md for ready-to-paste prompts. ──
  { v: "v2.lobby.bg", l: "V2 · Full-page backdrop" },
  { v: "v2.ambient.layer", l: "V2 · Parallax depth layer" },
  { v: "v2.hero.frame", l: "V2 · Balance card skin" },
  { v: "v2.btn.deposit", l: "V2 · Deposit button face" },
  { v: "v2.btn.withdraw", l: "V2 · Withdraw button face" },
  { v: "v2.jackpot", l: "V2 · Jackpot arena backdrop" },
  { v: "v2.jackpot.coin", l: "V2 · Jackpot medallion" },
  { v: "v2.jackpot.wheel", l: "V2 · Lucky Wheel face" },
  { v: "v2.reward.daily", l: "V2 · Daily reward chest" },
  { v: "v2.vip", l: "V2 · VIP hero" },
  { v: "v2.qa.rewards", l: "V2 · Quick Access · Rewards" },
  { v: "v2.qa.vip", l: "V2 · Quick Access · VIP" },
  { v: "v2.qa.deposit", l: "V2 · Quick Access · Deposit" },
  { v: "v2.qa.withdraw", l: "V2 · Quick Access · Withdraw" },
  { v: "v2.qa.wallet", l: "V2 · Quick Access · Wallet" },
  { v: "v2.qa.stats", l: "V2 · Quick Access · Stats" },
  { v: "v2.nav.bank", l: "V2 · Bottom nav · Bank" },
  { v: "v2.nav.games", l: "V2 · Bottom nav · Games" },
  { v: "v2.nav.wheel", l: "V2 · Bottom nav · Lucky Wheel" },
  { v: "v2.nav.refer", l: "V2 · Bottom nav · Refer & Earn" },
  { v: "v2.nav.events", l: "V2 · Bottom nav · Events" },
  { v: "v2.trust.games", l: "V2 · Trust · Live Games" },
  { v: "v2.trust.fair", l: "V2 · Trust · Provably Fair" },
  { v: "v2.trust.usdt", l: "V2 · Trust · Instant USDT" },
  { v: "v2.promo.refer", l: "V2 · Promo · Refer & Earn" },
  { v: "v2.promo.cashback", l: "V2 · Promo · Cashback" },
  { v: "v2.promo.rakeback", l: "V2 · Promo · Rakeback" },
  { v: "v2.badge.hot", l: "V2 · Badge · HOT" },
  { v: "v2.badge.new", l: "V2 · Badge · NEW" },
  { v: "v2.badge.jackpot", l: "V2 · Badge · JACKPOT" },
  { v: "v2.badge.live", l: "V2 · Badge · LIVE" },
  // ── V3 "Top Rich" header icon slots — consumed by the V3 lobby header; each
  // has a rich gold CSS fallback until an operator binds a transparent PNG. ──
  { v: "v3.hdr.avatar", l: "V3 · Header · Avatar" },
  { v: "v3.hdr.rewards", l: "V3 · Header icon · Rewards" },
  { v: "v3.hdr.inbox", l: "V3 · Header icon · Inbox" },
  { v: "v3.hdr.settings", l: "V3 · Header icon · Settings" },
  // Per-game HD lobby artwork — bind to `game.<uid>` (aggregator id) or
  // `game.<slug>` for C74 Originals (e.g. game.mayan-temple).
  // ── Premium C7 drop-in asset slots (hero renders / unified reel symbols / nav
  //    / feature icons) — registry in src/lib/c7Assets.ts, mapping in
  //    docs/C7-ASSET-SLOTS.md. Bind a transparent 2K PNG to upgrade LIVE. ──
  ...C7_ASSET_SLOTS.map((s) => ({ v: s.key, l: `C7 · ${s.label}` })),
  { v: "__custom", l: "Game art · game.<uid> / game.<slug>" },
];

// Master art-direction — the locked base prompt appended to every generation so
// all assets share one rich colourful glossy cartoon "Emerald + Gold Royale"
// look (Slotwinner-grade; vibrant jewel accents incl. purple/cyan allowed).
const STYLE_SUFFIX =
  ", rich colourful glossy premium cartoon casino art, Slotwinner and Coin-Master mobile-game quality, deep emerald and royal gold master palette with vibrant jewel accent colours (sapphire blue, ruby red, amethyst purple, cyan, magenta, orange), thick clean dark outlines, big soft gloss highlights, smooth rounded 3D bevels, gemstone shine, gold rim lighting, sparkles and glow, high saturation, playful yet luxurious, crisp clean vector-like shapes, single centered subject, award-winning premium mobile casino UI icon, no photorealism, no rough stone texture, no moss, no text watermark";

// One-click prompt fill. After generating, pick the matching slot key (shown in
// the label) on the card and Save & bind. Every prompt is subject-only — the
// shared STYLE_SUFFIX above carries the Temple material + lighting language.
const PRESETS: { label: string; icon: string; prompt: string; background: string; size: string }[] = [
  // ── Phase A — highest visual impact ──────────────────────────────────
  { label: "Wheel · v2.jackpot.wheel", icon: "🎡", background: "opaque", size: "1024x1024",
    prompt: "A glossy cartoon casino fortune wheel seen top-down: a chunky bevelled gold outer ring studded with colourful gems, 12 bright equal segments alternating emerald and gold with little jewel and coin icons, a shiny jewel medallion hub, sparkles and glow, radially symmetric" },
  { label: "Home BG · v2.lobby.bg", icon: "🎰", background: "opaque", size: "1536x1024",
    prompt: "A rich colourful cartoon casino lobby background: deep emerald scene with soft gold light rays, floating gold coins, jewels and sparkles, a glossy golden archway, gentle bokeh glow, a darker calmer central area for UI overlay" },
  { label: "Hero frame · v2.hero.frame", icon: "🖼️", background: "transparent", size: "1536x1024",
    prompt: "An ornate horizontal cartoon UI panel frame with a chunky glossy gold border, smooth rounded bevels, colourful gem studs at the corners, soft inner shadow, gold rim light, hollow transparent center, transparent background" },
  // ── Phase B ──────────────────────────────────────────────────────────
  { label: "Deposit btn · v2.btn.deposit", icon: "🟢", background: "transparent", size: "1536x1024",
    prompt: "A glossy wide 3D cartoon casino button plate in bright emerald green with a chunky rounded gold border, soft highlights and inner glow, blank center for a label, transparent background" },
  { label: "Withdraw btn · v2.btn.withdraw", icon: "🟡", background: "transparent", size: "1536x1024",
    prompt: "A glossy wide 3D cartoon casino button plate in warm gold with a chunky rounded darker-gold border, soft highlights and sheen, blank center for a label, transparent background" },
  { label: "Jackpot altar · v2.jackpot", icon: "💰", background: "opaque", size: "1536x1024",
    prompt: "A colourful cartoon jackpot stage: a big glossy gold arch with colourful gem accents, a confetti and coin burst, sparkles and warm glow, a dark empty center for a jackpot counter" },
  { label: "Coin · v2.jackpot.coin", icon: "🪙", background: "transparent", size: "1024x1024",
    prompt: "A glossy cartoon gold coin embossed with 'C74', chunky rounded rim, bright specular highlight and gold shine, colourful sparkles, transparent background" },
  // ── Phase C — quick-access & trust icons (glossy colourful cartoon) ───
  { label: "VIP · v2.qa.vip / v2.vip", icon: "👑", background: "transparent", size: "1024x1024",
    prompt: "A glossy cartoon VIP emblem: a shiny gold crown set with colourful gem jewels (ruby, sapphire, emerald) on a round emerald medallion, sparkles and gold rim light, transparent background" },
  { label: "Rewards · v2.qa.rewards", icon: "🎁", background: "transparent", size: "1024x1024",
    prompt: "A glossy cartoon reward icon: an open treasure chest overflowing with gold coins and colourful gems, bright highlights and sparkles, transparent background" },
  { label: "Wallet · v2.qa.wallet", icon: "🏛️", background: "transparent", size: "1024x1024",
    prompt: "A glossy cartoon vault icon: a rounded emerald-and-gold safe door with a gem lock and a few gold coins, bright highlights, transparent background" },
  { label: "Stats · v2.qa.stats", icon: "📊", background: "transparent", size: "1024x1024",
    prompt: "A glossy cartoon analytics icon: rising rounded bars in emerald and gold with a small sparkle, transparent background" },
  { label: "Deposit ic · v2.qa.deposit", icon: "📥", background: "transparent", size: "1024x1024",
    prompt: "A glossy cartoon deposit icon: a bright green down-arrow dropping into a golden bowl of coins, sparkles, transparent background" },
  { label: "Withdraw ic · v2.qa.withdraw", icon: "📤", background: "transparent", size: "1024x1024",
    prompt: "A glossy cartoon withdraw icon: a shiny gold up-arrow rising from an emerald vault with coins, bright highlights, transparent background" },
  { label: "Trust games · v2.trust.games", icon: "🎮", background: "transparent", size: "1024x1024",
    prompt: "A glossy cartoon slot-machine emblem in emerald and gold with colourful reel symbols and rounded bevels, sparkles, transparent background" },
  { label: "Trust fair · v2.trust.fair", icon: "🛡️", background: "transparent", size: "1024x1024",
    prompt: "A glossy cartoon shield icon in emerald and gold with a bold gold check mark and a small gem, sparkles, transparent background" },
  { label: "Trust USDT · v2.trust.usdt", icon: "💵", background: "transparent", size: "1024x1024",
    prompt: "A glossy cartoon gold coin with a bright lightning-bolt glyph, glossy highlights and sparkles, transparent background" },
  { label: "Live badge · v2.badge.live", icon: "🔴", background: "transparent", size: "1024x1024",
    prompt: "A small glossy cartoon LIVE badge shaped like a red gem with a chunky gold rim and glow, transparent background" },
];

const SIZES = ["1024x1024", "1024x1536", "1536x1024"];
const QUALITIES = ["high", "medium", "low"];
const BACKGROUNDS = ["transparent", "opaque"];

// Upload a generated image (data URI) to the public `app-art` Storage bucket and
// return its public URL. Storing a URL — not the base64 — keeps get_app_assets
// tiny so the lobby stays fast even with dozens of game arts. Already-hosted
// http(s) inputs pass straight through.
async function uploadArt(dataUri: string, key: string | null): Promise<string> {
  if (/^https?:\/\//i.test(dataUri)) return dataUri;
  const m = /^data:(image\/[a-z.+-]+);base64,(.*)$/i.exec(dataUri);
  if (!m) throw new Error("Unsupported image data");
  const mime = m[1];
  const ext = mime.split("/")[1].replace("jpeg", "jpg").replace("svg+xml", "svg");
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const safe = (key || "lib").replace(/[^a-z0-9._-]/gi, "_");
  const path = key ? `${safe}.${ext}` : `lib/${safe}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("app-art").upload(path, bytes, { contentType: mime, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from("app-art").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not resolve public URL");
  return `${data.publicUrl}?v=${Date.now()}`;
}

export default function AdminAiStudio() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("high");
  const [background, setBackground] = useState("transparent");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [notConfigured, setNotConfigured] = useState(false);
  const [slotFor, setSlotFor] = useState<Record<number, string>>({});
  // Free-text key (e.g. `game.1808`) used when the slot dropdown is "Custom key…".
  const [customKey, setCustomKey] = useState<Record<number, string>>({});
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [library, setLibrary] = useState<any[]>([]);
  const [ensuring, setEnsuring] = useState(false);
  const [ensureStatus, setEnsureStatus] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optStatus, setOptStatus] = useState("");

  const refreshLibrary = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)("admin_app_assets_list");
    if (!error && Array.isArray(data)) setLibrary(data);
  }, []);
  useEffect(() => { refreshLibrary(); }, [refreshLibrary]);

  const saveToLibrary = async (uri: string, i: number) => {
    setSavingIdx(i);
    try {
      const raw = slotFor[i] ?? "";
      const key = (raw === "__custom" ? (customKey[i] ?? "").trim() : raw);
      if (raw === "__custom" && !key) { toast.error("Enter a custom key (e.g. game.1808)"); setSavingIdx(null); return; }
      // Upload to Storage first; store the URL (not the base64) so the live
      // asset map (get_app_assets) stays lightweight.
      const publicUrl = await uploadArt(uri, key || null);
      const { data, error } = await (supabase.rpc as any)("save_app_asset", {
        p_name: (prompt.trim().slice(0, 40) || "asset"),
        p_category: key ? key.split(".")[0] : "misc",
        p_image: publicUrl,
        p_prompt: prompt.trim() || null,
        p_asset_key: key || null,
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      toast.success(key ? `Saved & bound to ${key} — it's live now` : "Saved to library");
      refreshLibrary();
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSavingIdx(null); }
  };

  const deleteAsset = async (id: string) => {
    const { error } = await (supabase.rpc as any)("admin_app_asset_delete", { p_id: id });
    if (error) toast.error(error.message); else { toast.success("Deleted"); refreshLibrary(); }
  };

  const applyPreset = (p: typeof PRESETS[number]) => {
    setPrompt(p.prompt);
    setSize(p.size);
    setBackground(p.background);
  };

  const generate = useCallback(async () => {
    const p = prompt.trim();
    if (p.length < 3) { toast.error("Enter a prompt first"); return; }
    setLoading(true);
    setNotConfigured(false);
    try {
      // admin-casino returns 200 with { error } on failure (its JS-client-safe
      // convention), so read the payload rather than the transport error.
      const { data, error } = await invokeAdmin<{ images?: string[]; error?: string }>(
        "admin-casino",
        { action: "ai_image_gen", prompt: p + STYLE_SUFFIX, size, quality, background, n: 1 },
      );
      const msg = data?.error ?? error?.message;
      if (msg) {
        if (/OPENAI_API_KEY not configured/i.test(msg)) { setNotConfigured(true); return; }
        throw new Error(msg);
      }
      const imgs = (data?.images ?? []) as string[];
      if (imgs.length === 0) throw new Error("No image returned");
      setImages((prev) => [...imgs, ...prev].slice(0, 12));
      toast.success("Image generated");
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [prompt, size, quality, background]);

  // One-click: auto-generate + bind every MISSING Temple asset (Phase A/B/C).
  // Calls admin-casino `ensure_assets` in a loop until the server reports done.
  // Idempotent — already-bound keys are skipped server-side.
  const ensureAll = useCallback(async () => {
    setEnsuring(true);
    setNotConfigured(false);
    setEnsureStatus("Starting…");
    const allGenerated: string[] = [];
    const allErrors: { key: string; error: string }[] = [];
    try {
      // Up to 30 calls (1 image each server-side). A single slow/timed-out call
      // is transient — the server row self-heals via the claim TTL — so keep
      // going rather than aborting; only bail after several in a row.
      let consecutiveFails = 0;
      let noProgress = 0;
      for (let i = 0; i < 40; i++) {
        let data: any = null, error: any = null;
        try {
          ({ data, error } = await invokeAdmin<{ generated?: string[]; errors?: { key: string; error: string }[]; remaining?: number; done?: boolean; error?: string; configured?: boolean }>(
            "admin-casino", { action: "ensure_assets" },
          ));
        } catch (e) { error = e; }
        // Config problem — stop and show the setup banner.
        if (data?.configured === false || /OPENAI_API_KEY not configured/i.test(data?.error ?? "")) { setNotConfigured(true); return; }
        // Whole-request server error (auth etc.) — surface it and stop.
        if (data?.error) throw new Error(data.error);
        // Transport error (edge timeout / network) — transient; retry a few times.
        if (!data) {
          if (++consecutiveFails >= 5) throw new Error(error?.message ?? "Network error");
          setEnsureStatus(`Retrying… (${allGenerated.length} bound so far)`);
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        consecutiveFails = 0;
        if (data.generated?.length) allGenerated.push(...data.generated);
        if (data.errors?.length) allErrors.push(...data.errors);
        const remaining = typeof data.remaining === "number" ? data.remaining : 0;
        setEnsureStatus(`Bound ${allGenerated.length} · ${remaining} remaining${allErrors.length ? ` · ${allErrors.length} error(s)` : ""}`);
        if (data.done === true || remaining <= 0) break;
        // No key advanced this round (all remaining are cooling down) — stop
        // spinning after several empties so the operator can retry later.
        noProgress = data.generated?.length ? 0 : noProgress + 1;
        if (noProgress >= 6) break;
        await new Promise((r) => setTimeout(r, 400));
      }
      if (allErrors.length) toast.error(`Finished with ${allErrors.length} error(s): ${allErrors.slice(0, 3).map((e) => `${e.key} (${e.error})`).join("; ")}`);
      else toast.success(`All assets bound (${allGenerated.length} generated) — live now`);
      refreshLibrary();
    } catch (e: any) {
      toast.error(e?.message ?? "Auto-generate failed");
    } finally {
      setEnsuring(false);
    }
  }, [refreshLibrary]);

  // One-click: downscale already-bound oversized images (gpt-image-1 returns
  // ~2MB PNGs). Loops admin-casino `optimize_assets` until the server is done.
  const optimizeAll = useCallback(async () => {
    setOptimizing(true);
    setOptStatus("Starting…");
    let done = 0;
    const errs: { key: string; error: string }[] = [];
    try {
      let noProgress = 0;
      for (let i = 0; i < 40; i++) {
        let data: any = null, error: any = null;
        try {
          ({ data, error } = await invokeAdmin<{ optimized?: string[]; errors?: { key: string; error: string }[]; remaining?: number; done?: boolean; error?: string }>(
            "admin-casino", { action: "optimize_assets" },
          ));
        } catch (e) { error = e; }
        if (data?.error) throw new Error(data.error);
        if (!data) {
          if (++noProgress >= 5) throw new Error(error?.message ?? "Network error");
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        if (data.optimized?.length) done += data.optimized.length;
        if (data.errors?.length) errs.push(...data.errors);
        const remaining = typeof data.remaining === "number" ? data.remaining : 0;
        setOptStatus(`Optimized ${done} · ${remaining} remaining${errs.length ? ` · ${errs.length} skipped` : ""}`);
        if (data.done === true || remaining <= 0) break;
        noProgress = data.optimized?.length ? 0 : noProgress + 1;
        if (noProgress >= 6) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      if (errs.length) toast.error(`Optimized ${done}, ${errs.length} skipped`);
      else toast.success(`Optimized ${done} image(s) — lighter & cache-busted`);
      refreshLibrary();
    } catch (e: any) {
      toast.error(e?.message ?? "Optimize failed");
    } finally {
      setOptimizing(false);
    }
  }, [refreshLibrary]);

  const download = (uri: string, i: number) => {
    const a = document.createElement("a");
    a.href = uri;
    a.download = `c74-asset-${Date.now()}-${i}.png`;
    a.click();
  };

  const copyUri = async (uri: string) => {
    try { await navigator.clipboard.writeText(uri); toast.success("Data-URI copied — paste into a component ASSETS slot"); }
    catch { toast.error("Copy failed"); }
  };

  // Bring your own art: read selected image files as data-URIs and drop them into
  // the same review grid as generated images — so each can be bound to a slot key
  // and saved with the existing Save & bind flow (no server generation involved).
  const onUploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const readers = Array.from(files).slice(0, 6).map((f) => new Promise<string>((resolve, reject) => {
      if (!/^image\//.test(f.type)) { reject(new Error(`${f.name}: not an image`)); return; }
      if (f.size > 6 * 1024 * 1024) { reject(new Error(`${f.name}: over 6 MB`)); return; }
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error(`${f.name}: could not be read`));
      r.readAsDataURL(f);
    }));
    Promise.allSettled(readers).then((results) => {
      const ok = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value);
      results.filter((r) => r.status === "rejected").forEach((r) => toast.error((r as PromiseRejectedResult).reason?.message ?? "Upload failed"));
      if (ok.length) { setImages((prev) => [...ok, ...prev].slice(0, 12)); toast.success(`${ok.length} image${ok.length > 1 ? "s" : ""} ready — pick a slot below and Save`); }
    });
  };

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.ais-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Rewards · AI Studio"
          title="AI ASSET STUDIO"
          tone="cyan"
          icon={<Wand2 className="h-5 w-5" />}
          badges={[{ label: "OPENAI IMAGE GEN", tone: "cyan", dot: true }, { label: "ADMIN ONLY", tone: "amber" }]}
          subtitle={<>Generate original 3D/HDR-cartoon game assets — wheel faces, icons, mascots, backdrops — then download or copy the data-URI straight into a component ASSETS slot (e.g. the C74 wheel).</>}
        />

        {/* One-click auto-seed — generate + bind every missing Temple asset */}
        <div className="ais-card p-4 flex items-center justify-between gap-3"
          style={{ borderColor: "rgba(16,185,129,0.35)", background: "linear-gradient(135deg,#ecfdf5,#fff)" }}>
          <div className="min-w-0">
            <div className="text-[13px] font-black text-emerald-800">Auto-generate all Temple assets</div>
            <div className="text-[11px] text-slate-600 leading-snug">
              Generates + binds every missing Phase A/B/C slot (wheel, lobby, hero, buttons, icons). Already-bound keys are skipped.
              {ensureStatus && <span className="block mt-1 font-bold text-emerald-700">{ensureStatus}</span>}
              {optStatus && <span className="block mt-0.5 font-bold text-sky-700">{optStatus}</span>}
            </div>
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <button onClick={ensureAll} disabled={ensuring || optimizing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-black text-white disabled:opacity-60"
              style={{ background: "linear-gradient(180deg,#10b981,#059669)" }}>
              {ensuring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {ensuring ? "Generating…" : "Generate all"}
            </button>
            <button onClick={optimizeAll} disabled={ensuring || optimizing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black disabled:opacity-60"
              style={{ background: "rgba(2,132,199,0.1)", color: "#0369a1", border: "1px solid rgba(2,132,199,0.3)" }}>
              {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {optimizing ? "Optimizing…" : "Optimize images"}
            </button>
          </div>
        </div>

        {notConfigured && (
          <div className="ais-card p-4 flex items-start gap-3" style={{ borderColor: "rgba(245,158,11,0.4)", background: "linear-gradient(135deg,#fffbeb,#fff)" }}>
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[12px] text-slate-700">
              <div className="font-black text-amber-700 mb-1">OpenAI key not configured</div>
              Set the server secret, then try again:
              <code className="block mt-2 px-2 py-1.5 rounded bg-slate-900 text-emerald-300 text-[11px] font-mono">supabase secrets set OPENAI_API_KEY=sk-...</code>
            </div>
          </div>
        )}

        {/* Presets */}
        <div className="ais-card p-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Quick presets</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className="av8-action-btn flex items-center gap-2 px-3 py-2.5 rounded-xl text-left"
                style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.08)" }}>
                <span className="text-lg">{p.icon}</span>
                <span className="text-[11px] font-bold text-slate-700">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upload your own — bring finished PNGs (icons, wheel, covers) */}
        <div className="ais-card p-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Upload your own</h3>
          <p className="text-[12px] text-slate-600 mb-3 leading-snug">
            Already have finished art — transparent icons, a wheel face, game covers? Upload it here, then pick a slot key on the card below and <b>Save &amp; bind</b> — it goes live instantly (stored in the <code className="px-1 rounded bg-slate-100 text-slate-700">app-art</code> bucket). PNG / WebP / JPG · up to 6&nbsp;MB · up to 6 at once.
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-[12px] font-black text-white shadow-sm"
            style={{ background: "linear-gradient(180deg,#0891b2,#0e7490)" }}>
            <Upload className="h-4 w-4" /> Choose image(s)…
            <input type="file" accept="image/png,image/webp,image/jpeg" multiple className="hidden"
              onChange={(e) => { onUploadFiles(e.target.files); e.currentTarget.value = ""; }} />
          </label>
        </div>

        {/* Prompt + controls */}
        <div className="ais-card p-4 space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the asset… e.g. a glowing golden C74 coin with sparkles"
            rows={3}
            className="w-full rounded-xl p-3 text-sm text-slate-800 resize-y"
            style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.1)" }}
          />
          <div className="flex flex-wrap gap-3 items-end">
            <Field label="Size">
              <Select value={size} onChange={setSize} options={SIZES} />
            </Field>
            <Field label="Quality">
              <Select value={quality} onChange={setQuality} options={QUALITIES} />
            </Field>
            <Field label="Background">
              <Select value={background} onChange={setBackground} options={BACKGROUNDS} />
            </Field>
            <div className="ml-auto">
              <V8HeroBtn variant="primary" onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {loading ? "Generating…" : "Generate"}
              </V8HeroBtn>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">A consistent casino 3D-cartoon style is auto-appended to every prompt.</p>
        </div>

        {/* Results */}
        {images.length > 0 && (
          <div className="ais-card p-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Generated ({images.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((uri, i) => (
                <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(15,23,42,0.08)" }}>
                  <div className="aspect-square grid place-items-center" style={{ backgroundImage: "repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%)", backgroundSize: "16px 16px" }}>
                    <img src={uri} alt={`Generated ${i}`} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="p-1.5 border-t" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
                    <select value={slotFor[i] ?? ""} onChange={(e) => setSlotFor({ ...slotFor, [i]: e.target.value })}
                      className="w-full text-[10px] rounded-md px-1.5 py-1 mb-1" style={{ border: "1px solid rgba(15,23,42,0.14)", background: "#fff", color: "#0f172a" }}>
                      {SLOT_KEYS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                    {slotFor[i] === "__custom" && (
                      <input value={customKey[i] ?? ""} onChange={(e) => setCustomKey({ ...customKey, [i]: e.target.value })}
                        placeholder="game.1808" spellCheck={false}
                        className="w-full text-[10px] rounded-md px-1.5 py-1 mb-1 font-mono" style={{ border: "1px solid rgba(15,23,42,0.14)", background: "#fff", color: "#0f172a" }} />
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => saveToLibrary(uri, i)} disabled={savingIdx === i} className="av8-action-btn flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#16a34a,#0b7a3f)" }}>
                        {savingIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                      </button>
                      <button onClick={() => download(uri, i)} title="Download PNG" className="av8-action-btn px-2 py-1.5 rounded-md text-slate-500 hover:text-slate-900" style={{ border: "1px solid rgba(15,23,42,0.1)" }}><Download className="h-3.5 w-3.5" /></button>
                      <button onClick={() => copyUri(uri)} title="Copy data-URI" className="av8-action-btn px-2 py-1.5 rounded-md text-slate-500 hover:text-slate-900" style={{ border: "1px solid rgba(15,23,42,0.1)" }}><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Asset library */}
        <div className="ais-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Asset library ({library.length})</h3>
            <button onClick={refreshLibrary} className="av8-action-btn text-slate-400 hover:text-slate-700"><RefreshCw className="h-3.5 w-3.5" /></button>
          </div>
          {library.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-6">No saved assets yet — generate one and hit Save.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {library.map((a) => (
                <div key={a.id} className="rounded-lg overflow-hidden border" style={{ borderColor: "rgba(15,23,42,0.08)" }}>
                  <div className="aspect-square grid place-items-center relative" style={{ backgroundImage: "repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%)", backgroundSize: "12px 12px" }}>
                    <img src={a.image} alt={a.name} className="max-w-full max-h-full object-contain" />
                    {a.asset_key && <span className="absolute top-1 left-1 text-[7px] font-black px-1 py-0.5 rounded bg-emerald-600 text-white inline-flex items-center gap-0.5"><Link2 className="h-2 w-2" />{a.asset_key}</span>}
                  </div>
                  <div className="flex items-center justify-between px-1.5 py-1">
                    <span className="text-[9px] text-slate-500 truncate">{a.name}</span>
                    <button onClick={() => deleteAsset(a.id)} className="text-rose-400 hover:text-rose-600 shrink-0"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-bold">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg px-3 py-2 text-[12px] font-semibold text-slate-700"
      style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.14)" }}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
