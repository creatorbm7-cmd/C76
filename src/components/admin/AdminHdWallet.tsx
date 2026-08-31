import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, ShieldAlert, Loader2, Eye, EyeOff, RefreshCw, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * AdminHdWallet — set / check the HD wallet master seed from the admin panel.
 *
 * The seed powers per-user crypto deposit address derivation. It is stored
 * ENCRYPTED in Supabase Vault via the `admin-hd-wallet` edge function (admin
 * JWT + PIN 2FA); it is never sent back to the browser — this tab only ever
 * shows presence + length/word-count. Once set, `derive-user-wallet` reads it
 * from Vault and every user gets their own auto-crediting TRC20/ETH/BSC address.
 */

type SeedStatus = { present: boolean; source?: string; len?: number; words?: number };

async function callHd(action: "status" | "set", extra?: Record<string, unknown>) {
  const pin = sessionStorage.getItem("dtx_admin_auth") ?? "";
  const { data, error } = await supabase.functions.invoke("admin-hd-wallet", {
    body: { action, ...(extra ?? {}) },
    headers: pin ? { "x-admin-pin-session": pin } : undefined,
  });
  if (error) throw new Error(error.message || "Request failed");
  const d = data as { success?: boolean; error?: string; status?: SeedStatus } | null;
  if (d?.error) throw new Error(d.error);
  return d?.status ?? { present: false };
}

async function callHdGenerate(): Promise<{ mnemonic: string; status: SeedStatus }> {
  const pin = sessionStorage.getItem("dtx_admin_auth") ?? "";
  const { data, error } = await supabase.functions.invoke("admin-hd-wallet", {
    body: { action: "generate" },
    headers: pin ? { "x-admin-pin-session": pin } : undefined,
  });
  if (error) throw new Error(error.message || "Request failed");
  const d = data as { success?: boolean; error?: string; mnemonic?: string; status?: SeedStatus } | null;
  if (d?.error) throw new Error(d.error);
  if (!d?.mnemonic) throw new Error("No seed was returned");
  return { mnemonic: d.mnemonic, status: d.status ?? { present: true } };
}

export default function AdminHdWallet() {
  const [status, setStatus] = useState<SeedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [gen, setGen] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pinExpired, setPinExpired] = useState(false);

  // Detect the PIN-auth failures so we can force a clear re-login instead of a
  // subtle red note that reads like a success.
  const flagIfPin = (m: string) => { if (/PIN|Unauthorized|Forbidden/i.test(m)) setPinExpired(true); };
  const reAuth = () => { try { sessionStorage.removeItem("dtx_admin_auth"); } catch { /* noop */ } window.location.reload(); };

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setStatus(await callHd("status")); setPinExpired(false); }
    catch (e: any) { const t = e?.message || "Could not load status"; setMsg({ kind: "err", text: t }); flagIfPin(t); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async () => {
    const s = seed.trim();
    if (s.length < 16) { setMsg({ kind: "err", text: "Paste your full mnemonic (12/24 words) or hex seed." }); return; }
    setSaving(true); setMsg(null);
    try {
      const st = await callHd("set", { seed: s });
      setStatus(st);
      setSeed("");
      setMsg({ kind: "ok", text: "Seed saved (encrypted in Vault). Per-user deposit wallets are now live." });
    } catch (e: any) {
      const t = e?.message || "Save failed"; setMsg({ kind: "err", text: t }); flagIfPin(t);
    } finally {
      setSaving(false);
    }
  };

  const onGenerate = async () => {
    if (!window.confirm(
      "Generate a brand-new 24-word seed and store it (encrypted) in Vault?\n\n" +
      "• The 24 words shown next are the ONLY backup — write them on paper offline.\n" +
      "• They become the custody key for ALL user deposits.\n" +
      "• Treat this as a HOT wallet: keep only a float, sweep to cold storage.\n\n" +
      "Continue?"
    )) return;
    setGenerating(true); setMsg(null);
    try {
      const { mnemonic, status: st } = await callHdGenerate();
      setStatus(st);
      setGen(mnemonic);
      setMsg({ kind: "ok", text: "Seed generated & stored. WRITE DOWN the 24 words below now — shown only once." });
    } catch (e: any) {
      const t = e?.message || "Generate failed"; setMsg({ kind: "err", text: t }); flagIfPin(t);
    } finally {
      setGenerating(false);
    }
  };

  const present = status?.present === true;

  return (
    <div className="hdw">
      <style>{`
        .hdw { max-width: 760px; }
        .hdw-card { background: linear-gradient(165deg,#131a26,#0c1119); border:1px solid rgba(255,205,80,.22);
          border-radius:18px; padding:20px; box-shadow:0 18px 40px -18px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,240,190,.08); color:#e8edf5; }
        .hdw-head { display:flex; align-items:center; gap:12px; margin-bottom:4px; }
        .hdw-ic { width:44px; height:44px; border-radius:12px; display:grid; place-items:center; flex:0 0 auto;
          background:radial-gradient(120% 120% at 30% 20%, rgba(255,214,120,.3), transparent 60%), linear-gradient(160deg,#3a2c07,#1a1305);
          border:1px solid rgba(255,205,80,.4); color:#ffd24d; }
        .hdw-title { font-size:17px; font-weight:900; letter-spacing:.2px; }
        .hdw-sub { font-size:12px; color:#94a3b8; margin-top:1px; }
        .hdw-status { display:flex; align-items:center; gap:10px; margin:16px 0; padding:13px 15px; border-radius:13px; font-weight:800; font-size:13px; }
        .hdw-status.on  { background:rgba(16,185,129,.12); border:1px solid rgba(16,185,129,.4); color:#6ee7b7; }
        .hdw-status.off { background:rgba(255,201,64,.10); border:1px solid rgba(255,201,64,.4); color:#fcd34d; }
        .hdw-status .sub { font-weight:600; color:#94a3b8; font-size:11.5px; }
        .hdw-label { font-size:10px; font-weight:900; letter-spacing:1.6px; text-transform:uppercase; color:#8aa0b8; margin:14px 0 6px; }
        .hdw-inputwrap { position:relative; }
        .hdw-input { width:100%; padding:13px 44px 13px 14px; border-radius:12px; background:#070b12;
          border:1px solid rgba(255,205,80,.3); color:#fff; font-size:13px; font-family:ui-monospace,Menlo,monospace; outline:none; }
        .hdw-input:focus { border-color:rgba(255,214,90,.7); box-shadow:0 0 0 3px rgba(255,205,80,.14); }
        .hdw-eye { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:#7c8aa0; cursor:pointer; padding:6px; display:grid; place-items:center; }
        .hdw-btn { margin-top:12px; width:100%; padding:13px; border:none; border-radius:12px; cursor:pointer; font-size:14px; font-weight:900; color:#241800;
          background:radial-gradient(120% 100% at 50% 10%, #fff2c4, transparent 55%), linear-gradient(180deg,#ffd24d,#e0a514);
          box-shadow:0 8px 18px -6px rgba(255,190,60,.5); display:inline-flex; align-items:center; justify-content:center; gap:8px; }
        .hdw-btn:disabled { opacity:.6; cursor:default; }
        .hdw-note { margin-top:14px; padding:12px 14px; border-radius:12px; background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.3); color:#fca5a5; font-size:11.5px; line-height:1.5; }
        .hdw-note b { color:#fecaca; }
        .hdw-msg { margin-top:12px; padding:11px 14px; border-radius:11px; font-size:12.5px; font-weight:700; }
        .hdw-msg.ok  { background:rgba(16,185,129,.12); border:1px solid rgba(16,185,129,.4); color:#6ee7b7; }
        .hdw-msg.err { background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.4); color:#fca5a5; }
        .hdw-refresh { margin-left:auto; background:none; border:1px solid rgba(255,255,255,.14); color:#94a3b8; border-radius:9px; padding:6px 10px; font-size:11px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
        .hdw-gen { background:radial-gradient(120% 100% at 50% 10%, #b6ffd6, transparent 55%), linear-gradient(180deg,#35d98a,#0b7a3f); color:#04160c; box-shadow:0 8px 18px -6px rgba(53,217,138,.5); }
        .hdw-or { text-align:center; font-size:11px; font-weight:800; color:#7c8aa0; margin:12px 0 4px; letter-spacing:.5px; }
        .hdw-backup { margin-top:14px; padding:15px; border-radius:14px; background:rgba(245,158,11,.08); border:1.5px solid rgba(245,158,11,.5); box-shadow:0 0 22px -6px rgba(245,158,11,.4); }
        .hdw-backup-h { font-size:12px; font-weight:900; letter-spacing:.4px; color:#fcd34d; text-align:center; margin-bottom:12px; }
        .hdw-words { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
        .hdw-word { display:flex; align-items:baseline; gap:6px; padding:8px 9px; border-radius:9px; background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.1); font-size:13px; font-weight:800; color:#fff6da; font-family:ui-monospace,Menlo,monospace; }
        .hdw-word i { font-style:normal; font-size:9px; font-weight:700; color:#7c8aa0; min-width:14px; }
        @media (max-width:420px){ .hdw-words { grid-template-columns:repeat(2,1fr); } }
        .hdw-backup-actions { display:flex; gap:8px; margin-top:12px; }
        .hdw-copy { flex:0 0 auto; padding:9px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.06); color:#e8edf5; font-size:12px; font-weight:800; cursor:pointer; }
        .hdw-done { flex:1; padding:9px 14px; border-radius:10px; border:none; background:linear-gradient(180deg,#ffd24d,#e0a514); color:#241800; font-size:12.5px; font-weight:900; cursor:pointer; }
        .hdw-backup-note { margin-top:10px; font-size:11px; line-height:1.5; color:#fca5a5; } .hdw-backup-note b { color:#fecaca; }
        .hdw-reauth { margin-top:14px; padding:15px; border-radius:14px; background:rgba(239,68,68,.1); border:1.5px solid rgba(239,68,68,.5); text-align:center; }
        .hdw-reauth-t { font-size:13px; font-weight:900; color:#fca5a5; }
        .hdw-reauth-s { font-size:11.5px; line-height:1.5; color:#fecaca; margin:6px 0 12px; }
        .hdw-reauth-btn { padding:11px 18px; border:none; border-radius:11px; cursor:pointer; font-size:13px; font-weight:900; color:#fff; background:linear-gradient(180deg,#ef4444,#b91c1c); box-shadow:0 6px 16px -4px rgba(239,68,68,.5); }
      `}</style>

      <div className="hdw-card">
        <div className="hdw-head">
          <span className="hdw-ic"><KeyRound size={22} strokeWidth={2.2} /></span>
          <div>
            <div className="hdw-title">HD Wallet Seed</div>
            <div className="hdw-sub">Master seed for per-user crypto deposit addresses</div>
          </div>
          <button className="hdw-refresh" onClick={refresh} disabled={loading}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="hdw-status off"><Loader2 size={16} className="animate-spin" /> Checking status…</div>
        ) : present ? (
          <div className="hdw-status on">
            <ShieldCheck size={18} />
            <span>Seed configured ✓</span>
            <span className="sub">· {status?.words ? `${status.words} words` : `${status?.len ?? 0} chars`} · encrypted in Vault</span>
          </div>
        ) : (
          <div className="hdw-status off">
            <ShieldAlert size={18} />
            <span>No seed set</span>
            <span className="sub">· per-user auto-wallets are OFF (shared address + manual verify)</span>
          </div>
        )}

        {/* Admin PIN expired — force a clear re-login (prevents silent save failures) */}
        {pinExpired && (
          <div className="hdw-reauth">
            <div className="hdw-reauth-t">🔒 Your admin session expired</div>
            <div className="hdw-reauth-s">That's why the save didn't go through. Re-enter your PIN, then tap Generate again — it'll work.</div>
            <button className="hdw-reauth-btn" onClick={reAuth}>Re-enter admin PIN</button>
          </div>
        )}

        {/* One-time backup panel — the freshly generated seed, shown ONCE */}
        {gen && (
          <div className="hdw-backup">
            <div className="hdw-backup-h">⚠️ WRITE THESE 24 WORDS DOWN — shown only once</div>
            <div className="hdw-words">
              {gen.split(/\s+/).map((w, i) => (
                <span className="hdw-word" key={i}><i>{i + 1}</i>{w}</span>
              ))}
            </div>
            <div className="hdw-backup-actions">
              <button className="hdw-copy" onClick={() => { try { navigator.clipboard.writeText(gen); setMsg({ kind: "ok", text: "Copied. Paste into an OFFLINE note, then clear your clipboard." }); } catch { /* noop */ } }}>Copy</button>
              <button className="hdw-done" onClick={() => setGen(null)}>✓ I've written it down — hide</button>
            </div>
            <div className="hdw-backup-note">Lose these words and the deposit funds are <b>unrecoverable</b>. Store on paper/metal, offline, never in a screenshot or cloud note.</div>
          </div>
        )}

        {/* Auto-generate (only when no seed yet) */}
        {!present && !gen && (
          <>
            <button className="hdw-btn hdw-gen" onClick={onGenerate} disabled={generating}>
              {generating ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <>✨ Generate a secure seed for me</>}
            </button>
            <div className="hdw-or">— or paste your own —</div>
          </>
        )}

        <div className="hdw-label">{present ? "Replace seed" : "Set seed"}</div>
        <div className="hdw-inputwrap">
          <input
            className="hdw-input"
            type={show ? "text" : "password"}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="Paste 12/24-word mnemonic or hex seed"
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off"
          />
          <button className="hdw-eye" type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide" : "Show"}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <button className="hdw-btn" onClick={save} disabled={saving}>
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Lock size={15} /> {present ? "Replace seed" : "Save seed"}</>}
        </button>

        {msg && <div className={`hdw-msg ${msg.kind}`}>{msg.text}</div>}

        <div className="hdw-note">
          <b>Security:</b> the seed controls all deposit funds. It is stored encrypted in Supabase Vault and is
          never shown here again. Use a seed generated in a trusted wallet (not a demo/web tool), and never
          share or screenshot it. Setting the seed requires a fresh admin PIN.
        </div>
      </div>
    </div>
  );
}
