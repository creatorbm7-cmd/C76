/**
 * KycPage — player identity verification (KYC/AML).
 *
 * Required before real-money deposits: request_manual_deposit() throws
 * E_KYC_REQUIRED until the user has an approved kyc_submissions row.
 *
 * Pure frontend against the existing RLS-protected `kyc_submissions` table:
 *   - users INSERT their own row (status='pending')
 *   - admins approve/reject (see AdminKyc)
 * is_kyc_verified() flips true once status is 'approved'/'verified'.
 *
 * Route: /kyc
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
// V3 reset: legacy c7-sun27-compat token module dropped — local c7p palette map.
const t = { colors: { gold: { 400: '#f6c945' }, emerald: { 500: '#12a04f' } } } as const;
import { supabase } from '@/integrations/supabase/client';
import HdrScreen from '@/components/casino/HdrScreen';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import LuxSpinner from '@/components/c7/shell/LuxSpinner';

const PRIZE = t.colors.gold[400];
const WIN   = t.colors.emerald[500];

const DOC_TYPES = [
  { id: 'passport',        label: 'Passport' },
  { id: 'national_id',     label: 'National ID' },
  { id: 'driving_license', label: 'Driving Licence' },
] as const;

type Status = 'none' | 'pending' | 'approved' | 'rejected' | 'verified';

interface Row {
  status: string | null;
  review_note: string | null;
  full_name: string | null;
}

export default function KycPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<Row | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // form
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [address, setAddress] = useState('');
  const [docType, setDocType] = useState<typeof DOC_TYPES[number]['id']>('passport');
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login?next=/kyc', { replace: true }); return; }
      const { data } = await supabase
        .from('kyc_submissions')
        .select('status, review_note, full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setExisting(data as Row);
      setLoading(false);
    })();
  }, [navigate]);

  const status: Status = (() => {
    if (submitted) return 'pending';
    const s = (existing?.status ?? 'none').toLowerCase();
    if (s === 'approved' || s === 'verified') return 'approved';
    if (s === 'pending') return 'pending';
    if (s === 'rejected') return 'rejected';
    return 'none';
  })();

  const canEdit = status === 'none' || status === 'rejected';
  const formValid = fullName.trim().length > 1 && dob && nationality.trim() && docType;

  const submit = async () => {
    if (!formValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login?next=/kyc', { replace: true }); return; }
      const payload = {
        user_id: user.id,
        full_name: fullName.trim(),
        date_of_birth: dob,
        nationality: nationality.trim(),
        address_text: address.trim() || null,
        document_type: docType,
        document_front_url: frontUrl.trim() || null,
        document_back_url: backUrl.trim() || null,
        selfie_url: selfieUrl.trim() || null,
        status: 'pending',
      };
      // Re-submit after a rejection updates the existing row; first time inserts.
      const { error: upErr } = existing
        ? await supabase.from('kyc_submissions').update(payload).eq('user_id', user.id)
        : await supabase.from('kyc_submissions').insert(payload);
      if (upErr) { setError(upErr.message); return; }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HdrScreen pad={120}>
      <Styles />

      <header className="c7p-pg-bar c7-lux-head">
        <LuxFrameFX />
        <button className="c7p-pg-back" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="c7p-pg-title c7p-gold-text">Identity Verification</span>
      </header>

      <div className="kyc-note-row">
        <div className="kyc-badge"><ShieldCheck size={14} /><span>KYC · REQUIRED FOR DEPOSITS</span></div>
        <p className="kyc-note">Verify your identity once. Required by law before any real-money deposit or withdrawal.</p>
      </div>

      {loading ? (
        <div style={{ padding: 56, display: 'flex', justifyContent: 'center' }}>
          <LuxSpinner size={60} label="Loading" />
        </div>
      ) : status === 'approved' ? (
        <StatusCard icon={<CheckCircle2 size={22} />} tone={WIN}
          title="Verified ✓" body={`Your identity is verified${existing?.full_name ? ` — ${existing.full_name}` : ''}. You're cleared to deposit when real-money is live.`} />
      ) : status === 'pending' ? (
        <StatusCard icon={<Clock size={22} />} tone={PRIZE}
          title="Under review" body="Your documents are being reviewed by our team. This usually takes a short while — you'll be cleared to deposit once approved." />
      ) : (
        <>
          {status === 'rejected' && (
            <StatusCard icon={<AlertCircle size={22} />} tone="#ff5470"
              title="Re-submission needed" body={existing?.review_note || 'Your previous submission could not be verified. Please re-submit with clear details.'} />
          )}

          <section className="kyc-formsec">
            <div className="c7p-glass kyc-card">
            <Field label="Full legal name">
              <input className="kyc-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As on your document" maxLength={120} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Date of birth">
                <input className="kyc-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label="Nationality">
                <input className="kyc-input" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. Indian" maxLength={60} />
              </Field>
            </div>
            <Field label="Residential address (optional)">
              <input className="kyc-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, postcode" maxLength={200} />
            </Field>

            <Field label="Document type">
              <div className="kyc-doc-grid">
                {DOC_TYPES.map((d) => (
                  <button key={d.id} type="button" className="kyc-doc" data-active={docType === d.id} onClick={() => setDocType(d.id)}>
                    {d.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Document front (image URL)">
              <input className="kyc-input" value={frontUrl} onChange={(e) => setFrontUrl(e.target.value)} placeholder="Link to a clear photo of the front" maxLength={400} />
            </Field>
            <Field label="Document back (optional)">
              <input className="kyc-input" value={backUrl} onChange={(e) => setBackUrl(e.target.value)} placeholder="Link to the back, if applicable" maxLength={400} />
            </Field>
            <Field label="Selfie holding the document (optional)">
              <input className="kyc-input" value={selfieUrl} onChange={(e) => setSelfieUrl(e.target.value)} placeholder="Link to a selfie with your document" maxLength={400} />
            </Field>

            {error && (
              <div className="kyc-result kyc-result--err">
                <AlertCircle size={18} /><span>{error}</span>
              </div>
            )}
            </div>
          </section>

          <div className="kyc-cta-wrap">
            <button onClick={submit} disabled={!formValid || submitting || !canEdit} className="c7p-btn-green kyc-cta">
              {submitting ? (<><Loader2 size={18} className="kyc-spin" /><span>Submitting…</span></>)
                          : (<><ShieldCheck size={18} /><span>Submit for verification</span></>)}
            </button>
            <p className="kyc-disclaimer">Your details are stored securely and reviewed by a compliance admin. We never share them.</p>
          </div>
        </>
      )}
    </HdrScreen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="kyc-label">{label}</label>
      {children}
    </div>
  );
}

function StatusCard({ icon, tone, title, body }: { icon: React.ReactNode; tone: string; title: string; body: string }) {
  return (
    <section style={{ padding: '12px 16px 0' }}>
      <div style={{
        display: 'flex', gap: 13, padding: 16, borderRadius: 16,
        background: `${tone}14`, border: `1px solid ${tone}55`, color: tone,
      }}>
        <div style={{ flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 4, lineHeight: 1.5 }}>{body}</div>
        </div>
      </div>
    </section>
  );
}

function Styles() {
  return (
    <style>{`
      @keyframes kyc-spin { to { transform: rotate(360deg); } }
      .kyc-spin { animation: kyc-spin 1s linear infinite; }
      .kyc-note-row { padding: 14px 16px 4px; text-align: center; }
      .kyc-badge {
        display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px;
        background: linear-gradient(180deg, #d6ffe9, #35d98a 45%, #0b7a3f); color: #06301c;
        font-size: 10px; font-weight: 900; letter-spacing: 1.2px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 14px rgba(107,245,163,0.35);
      }
      .kyc-note { margin: 8px 0 0; font-size: 11px; color: rgba(255,255,255,0.55); }
      /* Form card — shared c7p-glass frame supplies the surface; this adds inner padding */
      .kyc-formsec { padding: 8px 16px 0; }
      .kyc-card { padding: 16px 15px; }
      .kyc-label { display: block; font-size: 11px; color: rgba(255,255,255,0.55); letter-spacing: 1px; text-transform: uppercase; font-weight: 700; margin-bottom: 7px; }
      .kyc-input {
        width: 100%; background: linear-gradient(160deg, rgba(11,74,51,0.55), rgba(4,29,19,0.72)); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(107,245,163,0.3);
        border-radius: 12px; padding: 13px 14px; color: #fff; font-size: 15px; font-weight: 500; outline: none; font-family: inherit;
        box-shadow: inset 0 1px 0 rgba(255,244,214,0.08), inset 0 2px 8px rgba(0,0,0,0.35);
      }
      .kyc-input:focus { border-color: #2ee08a; box-shadow: 0 0 0 3px rgba(46,224,138,0.18); }
      .kyc-doc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .kyc-doc {
        padding: 12px 6px; border-radius: 12px; border: 1px solid rgba(107,245,163,0.28);
        background: linear-gradient(160deg, rgba(11,74,51,0.55), rgba(4,29,19,0.72)); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        box-shadow: inset 0 1px 0 rgba(255,244,214,0.08); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
      }
      .kyc-doc[data-active="true"] {
        border-color: #35d98a; color: #06301c;
        background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.7), transparent 52%), linear-gradient(180deg, #d6ffe9, #35d98a 45%, #0b7a3f);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
      }
      .kyc-result { display: flex; align-items: center; gap: 10px; padding: 13px 14px; border-radius: 12px; border: 1px solid; font-size: 13px; font-weight: 600; margin-top: 4px; }
      .kyc-result--err { border-color: rgba(224,43,60,0.55); background: rgba(224,43,60,0.10); color: #ff8089; }
      .kyc-cta-wrap {
        position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 520px;
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
        background: linear-gradient(to top, rgba(0,0,0,0.95) 60%, rgba(0,0,0,0)); backdrop-filter: blur(10px); z-index: 10;
      }
      /* CTA surface comes from shared .c7p-btn-green; keep width + type only */
      .kyc-cta { width: 100%; padding: 15px; font-size: 16px; font-family: inherit; }
      .kyc-disclaimer { margin: 8px 0 0; text-align: center; font-size: 10px; color: rgba(255,255,255,0.45); }
    `}</style>
  );
}
