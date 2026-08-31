/**
 * CasinoLogin — premium gilt gold+emerald auth at /login.
 *
 * Phone-first: mobile-number OTP is the primary sign-in (enter number → SMS
 * code → verify), with email/password kept as a secondary method and Google
 * OAuth alongside. No money logic here — auth only.
 *   - PRIMARY: signInWithOtp({ phone }) + verifyOtp({ phone, token, type:'sms' })
 *   - signInWithPassword / signUp (email, secondary)
 *   - signInWithOAuth (Google)
 *   - resetPasswordForEmail
 *   - ?next= destination + ?mode=signup, existing-session bounce
 *
 * Phone OTP additionally requires the Supabase Auth "Phone" provider (Twilio)
 * enabled in the project dashboard — that's server-side config, not code here.
 * If it isn't enabled, signInWithOtp returns an error the UI shows gracefully.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Common dialling codes (India first — primary audience). E.164 is built as
// `${dialCode}${nationalDigits}`.
const DIAL_CODES = ['+91', '+1', '+44', '+971', '+61', '+880', '+92', '+94', '+63', '+234', '+27', '+55'];

export default function CasinoLogin() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  // Post-login destination: honor an explicit ?next= deep link, otherwise
  // land users straight on the V3 home lobby (no bounce through "/").
  const nextPath = searchParams.get('next') || '/v3';
  const initialMode: 'signin' | 'signup' = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  // Primary method is phone; email/password is the secondary fallback.
  const [method, setMethod] = useState<'phone' | 'email'>('phone');

  // Phone-OTP state
  const [dialCode, setDialCode] = useState('+91');
  const [phoneNat, setPhoneNat] = useState('');
  const [phoneStep, setPhoneStep] = useState<'enter' | 'code'>('enter');
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);

  // Email state
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [checking, setChecking] = useState(true);

  const e164 = `${dialCode}${phoneNat.replace(/\D/g, '')}`;
  const phoneValid = /^\+\d{8,15}$/.test(e164);

  // If already signed in, bounce straight to the intended destination
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        nav(nextPath, { replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [nav, nextPath]);

  // Resend-code cooldown countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((v) => (v <= 1 ? 0 : v - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (checking) {
    return (
      <div className="c7p-page lg-checking">
        <style>{LG_CSS}</style>
        <span className="lg-check-dot" /> Checking session…
      </div>
    );
  }

  const clearAlerts = () => { setError(''); setMsg(''); };

  // ── Phone OTP ────────────────────────────────────────────────────────────
  const handleSendCode = async () => {
    clearAlerts();
    if (!phoneValid) { setError('Enter a valid mobile number (with country code).'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) setError(error.message);
      else {
        // signInWithOtp signs in existing users and auto-registers new ones.
        setPhoneStep('code');
        setMsg(`Code sent to ${e164}`);
        setResendIn(45);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not send the code. Try again.');
    }
    setLoading(false);
  };

  const handleVerify = async (ev: React.FormEvent) => {
    ev.preventDefault();
    clearAlerts();
    const token = otp.replace(/\D/g, '');
    if (token.length < 4) { setError('Enter the code from the SMS.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: e164, token, type: 'sms' });
      if (error) setError(error.message);
      else if (data.session) nav(nextPath, { replace: true });
      else setError('Could not verify that code. Please try again.');
    } catch (e: any) {
      setError(e?.message || 'Verification failed.');
    }
    setLoading(false);
  };

  // ── Email / password (secondary) ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearAlerts();
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else {
          nav(nextPath, { replace: true });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) setError(error.message);
        else if (data.session) {
          // "Confirm email" is OFF → Supabase returns a live session immediately.
          nav(nextPath, { replace: true });
        } else {
          // "Confirm email" is ON → no session yet; a confirmation email was sent.
          setMsg('✅ Account created. Check your email to confirm, then sign in.');
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    clearAlerts();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${nextPath}` },
      });
      if (error) { setError(error.message); setLoading(false); }
      // On success the browser navigates away — no need to reset loading.
    } catch (e: any) {
      setError(e?.message || 'Could not start Google sign-in');
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      setError('Enter your email above first, then tap Forgot password.');
      return;
    }
    setLoading(true);
    clearAlerts();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) setError(error.message);
      else setMsg(`✅ Reset link sent to ${email}`);
    } catch (e: any) {
      setError(e?.message || 'Could not send reset email');
    }
    setLoading(false);
  };

  const emailDisabled = loading || !email || !password;

  const switchMethod = (m: 'phone' | 'email') => { setMethod(m); clearAlerts(); };

  // Google button — shared by both methods.
  const googleBtn = (
    <button type="button" onClick={handleGoogle} disabled={loading} className="lg-google">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Continue with Google
    </button>
  );

  return (
    <div className="c7p-page lg-root">
      <style>{LG_CSS}</style>

      {/* Living jungle god-rays */}
      <div aria-hidden="true" className="lg-rays" />
      {/* Alive sparkles */}
      <div aria-hidden="true" className="lg-spks">
        <span className="lg-spk g" /><span className="lg-spk e" /><span className="lg-spk g" /><span className="lg-spk e" /><span className="lg-spk g" /><span className="lg-spk g" /><span className="lg-spk e" /><span className="lg-spk g" />
      </div>
      {/* Gold dust — a slow drift of fine sparkles for extra glamour */}
      <div aria-hidden="true" className="lg-dust">
        <span /><span /><span /><span /><span /><span />
      </div>

      <div className="lg-card-wrap">
        {/* Brand mark */}
        <div className="lg-brand">
          <div className="lg-orb">
            <span className="lg-orb-crown" aria-hidden="true">♛</span>
            <span className="lg-orb-c7" aria-hidden="true">C7</span>
          </div>
          <h1 className="lg-h1">
            <span className="c7p-gold-text">C7</span>
            <span className="lg-h1-sub">Casino</span>
          </h1>
          <div className="lg-tagline">Real-Time · Provably Fair · Instant</div>
        </div>

        {/* Gilt card */}
        <div className="c7p-card-gold lg-card">
          <span className="lg-card-shine" aria-hidden="true" />

          {method === 'phone' ? (
            /* ── PRIMARY: phone OTP ─────────────────────────────────────── */
            <>
              <h2 className="lg-title">
                {phoneStep === 'enter' ? 'Sign in with mobile' : 'Enter the code'}
                <span className="lg-title-emoji">📱</span>
              </h2>
              <p className="lg-sub">
                {phoneStep === 'enter'
                  ? 'We’ll text you a one-time code · New here? You’re signed up automatically'
                  : `Sent to ${e164}`}
              </p>

              {phoneStep === 'enter' ? (
                <form className="lg-form" onSubmit={(e) => { e.preventDefault(); handleSendCode(); }}>
                  <div>
                    <label className="lg-label">Mobile number</label>
                    <div className="lg-phone-row">
                      <select
                        className="lg-dial"
                        value={dialCode}
                        onChange={(e) => setDialCode(e.target.value)}
                        aria-label="Country code"
                      >
                        {DIAL_CODES.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phoneNat}
                        onChange={(e) => setPhoneNat(e.target.value)}
                        placeholder="98765 43210"
                        autoComplete="tel-national"
                        className="lg-input lg-phone-input"
                      />
                    </div>
                  </div>

                  {error && <div className="lg-alert err">⚠ {error}</div>}
                  {msg && <div className="lg-alert ok">{msg}</div>}

                  <button type="submit" disabled={loading || !phoneValid} className="c7p-btn-gold lg-submit">
                    {loading ? '…' : 'Send code'}
                  </button>
                </form>
              ) : (
                <form className="lg-form" onSubmit={handleVerify}>
                  <div>
                    <label className="lg-label">Verification code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit code"
                      autoComplete="one-time-code"
                      maxLength={8}
                      className="lg-input lg-otp"
                    />
                  </div>

                  {error && <div className="lg-alert err">⚠ {error}</div>}
                  {msg && <div className="lg-alert ok">{msg}</div>}

                  <button type="submit" disabled={loading || otp.replace(/\D/g, '').length < 4} className="c7p-btn-gold lg-submit">
                    {loading ? '…' : 'Verify & continue'}
                  </button>

                  <div className="lg-row-links">
                    <button
                      type="button"
                      className="lg-link"
                      disabled={loading || resendIn > 0}
                      onClick={handleSendCode}
                    >
                      {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                    </button>
                    <button
                      type="button"
                      className="lg-link"
                      onClick={() => { setPhoneStep('enter'); setOtp(''); clearAlerts(); }}
                    >
                      Change number
                    </button>
                  </div>
                </form>
              )}

              {/* OR divider + Google */}
              <div className="lg-or"><span /><b>OR</b><span /></div>
              {googleBtn}

              <button type="button" className="lg-alt" onClick={() => switchMethod('email')}>
                Use email instead
              </button>
            </>
          ) : (
            /* ── SECONDARY: email / password ────────────────────────────── */
            <>
              {/* Mode tabs */}
              <div className="lg-tabs">
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); clearAlerts(); }}
                    className={`lg-tab${mode === m ? ' on' : ''}`}
                  >{m === 'signin' ? 'Sign In' : 'Sign Up'}</button>
                ))}
              </div>

              <h2 className="lg-title">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                <span className="lg-title-emoji">{mode === 'signin' ? '👋' : '✨'}</span>
              </h2>
              <p className="lg-sub">
                {mode === 'signin'
                  ? `Sign in to continue${(nextPath && nextPath !== '/' && nextPath !== '/casino') ? ` to ${nextPath}` : ''}`
                  : 'Free demo coins to play · No card required'}
              </p>

              <form onSubmit={handleSubmit} className="lg-form">
                <div>
                  <label className="lg-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="lg-input"
                  />
                </div>

                <div>
                  <label className="lg-label">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    minLength={6}
                    required
                    className="lg-input"
                  />
                </div>

                {error && <div className="lg-alert err">⚠ {error}</div>}
                {msg && <div className="lg-alert ok">{msg}</div>}

                <button type="submit" disabled={emailDisabled} className="c7p-btn-gold lg-submit">
                  {loading ? '…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>

                <div className="lg-or"><span /><b>OR</b><span /></div>

                {googleBtn}

                {mode === 'signin' && (
                  <button type="button" onClick={handleForgot} disabled={loading} className="lg-forgot">
                    Forgot password?
                  </button>
                )}
              </form>

              <button type="button" className="lg-alt" onClick={() => switchMethod('phone')}>
                Use phone instead
              </button>
            </>
          )}

          {/* Trust footer */}
          <div className="lg-trust">🔒 Encrypted · 18+ · Provably Fair</div>
        </div>

        {/* Back to lobby */}
        <div className="lg-back-wrap">
          <button type="button" onClick={() => nav('/v3')} className="lg-back">← Back to lobby</button>
        </div>
      </div>
    </div>
  );
}

const LG_CSS = `
.lg-checking { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); font-size: 13px; font-family: Inter, system-ui, sans-serif; }
.lg-check-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; background: #2ee08a; box-shadow: 0 0 8px #2ee08a; animation: lg-pulse 1.4s ease-in-out infinite; }

.lg-root { min-height: 100vh; color: #fff; display: flex; align-items: center; justify-content: center; padding: 32px 16px;
  position: relative; overflow: hidden; font-family: Inter, system-ui, sans-serif; }
.lg-rays { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: repeating-linear-gradient(101deg, transparent 0 46px, rgba(140,255,200,0.04) 46px 49px, transparent 49px 104px);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0,0,0,0.5) 40%, transparent 70%);
          mask-image: linear-gradient(180deg, #000 0%, rgba(0,0,0,0.5) 40%, transparent 70%); }
.lg-spks { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.lg-spk { position: absolute; width: 7px; height: 7px; border-radius: 50%; opacity: 0; will-change: transform, opacity; animation: lg-tw 3.2s ease-in-out infinite; }
.lg-spk.g { background: radial-gradient(circle, #ffe9a8, rgba(245,180,35,.5) 45%, transparent 72%); box-shadow: 0 0 8px rgba(255,214,120,.9); }
.lg-spk.e { background: radial-gradient(circle, #d6ffe9, rgba(46,230,130,.55) 45%, transparent 72%); box-shadow: 0 0 8px rgba(46,230,130,.9); }
.lg-spk:nth-child(1){ top:12%; left:16%; animation-delay:0s; } .lg-spk:nth-child(2){ top:20%; right:14%; animation-delay:1.1s; }
.lg-spk:nth-child(3){ top:52%; left:8%; animation-delay:2.2s; } .lg-spk:nth-child(4){ bottom:22%; right:10%; animation-delay:1.6s; }
.lg-spk:nth-child(5){ bottom:14%; left:20%; animation-delay:2.7s; }
@keyframes lg-tw { 0%,100% { opacity: 0; transform: translateY(2px) scale(.5); } 50% { opacity: .95; transform: translateY(-2px) scale(1); } }
@keyframes lg-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

.lg-card-wrap { position: relative; z-index: 1; width: 100%; max-width: 400px; animation: lg-rise 420ms cubic-bezier(.21,1.02,.73,1) both; }
@keyframes lg-rise { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }

/* Brand */
.lg-brand { text-align: center; margin-bottom: 26px; }
.lg-orb { position: relative; width: 66px; height: 66px; border-radius: 19px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px;
  background: radial-gradient(120% 100% at 50% 8%, #eafff4, transparent 46%), linear-gradient(158deg, #7ff0b4 2%, #22c06e 46%, #0a6a38);
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.7), inset 0 -8px 14px rgba(0,0,0,0.3), 0 8px 20px -6px rgba(0,0,0,0.6), 0 0 0 2px rgba(245,180,35,0.85), 0 0 20px -4px rgba(245,180,35,0.7);
  animation: lg-orb 3.4s ease-in-out infinite; will-change: transform; }
@keyframes lg-orb { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.lg-orb-crown { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); font-size: 15px; line-height: 1; color: #ffd87a; text-shadow: 0 0 6px rgba(255,205,90,0.9); }
.lg-orb-c7 { font: 900 30px/1 Inter, system-ui, sans-serif; letter-spacing: -2px;
  background: linear-gradient(180deg,#fff6d8,#ffd87a 46%,#f5b423); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.45)); }
.lg-h1 { margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
.lg-h1 .c7p-gold-text { font-size: 28px; }
.lg-h1-sub { margin-left: 8px; color: #fff; }
.lg-tagline { margin-top: 6px; font-size: 10px; font-weight: 800; letter-spacing: 2.5px; color: rgba(255,255,255,0.5); text-transform: uppercase; }

/* Card */
.lg-card { position: relative; overflow: hidden; padding: 22px; }
.lg-card-shine { position: absolute; top: 0; left: -60%; width: 42%; height: 100%; transform: skewX(-20deg); pointer-events: none; z-index: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent); animation: lg-shine 4.6s ease-in-out infinite; }
@keyframes lg-shine { 0% { left: -60%; } 55%,100% { left: 130%; } }
.lg-card > *:not(.lg-card-shine) { position: relative; z-index: 1; }

/* Tabs */
.lg-tabs { display: flex; background: rgba(0,0,0,0.3); border-radius: 999px; padding: 4px; margin-bottom: 22px; border: 1px solid rgba(255,214,120,0.18); }
.lg-tab { flex: 1; padding: 10px 12px; font-size: 12px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;
  color: rgba(255,255,255,0.6); background: transparent; border: none; border-radius: 999px; font-family: inherit; transition: all .2s; }
.lg-tab.on { color: #3a2600;
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.75), transparent 52%), linear-gradient(180deg,#fff3c4,#ffd24d 45%,#e0a514);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -6px 10px rgba(138,100,16,0.3), 0 3px 10px -3px rgba(255,200,61,0.5); }

.lg-title { margin: 0 0 4px; font-size: 19px; font-weight: 900; letter-spacing: -0.4px; color: #fff; }
.lg-title-emoji { margin-left: 6px; }
.lg-sub { margin: 0 0 20px; font-size: 12px; color: rgba(255,255,255,0.5); }

.lg-form { display: flex; flex-direction: column; gap: 14px; }
.lg-label { display: block; font-size: 10px; font-weight: 900; letter-spacing: 1.8px; color: #8fb0a0; text-transform: uppercase; margin-bottom: 6px; }
.lg-input { width: 100%; padding: 13px 14px; border-radius: 12px; box-sizing: border-box; font-size: 14px; color: #fff; outline: none; font-family: inherit;
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,214,120,0.24); transition: border-color .16s, box-shadow .16s; }
.lg-input::placeholder { color: rgba(255,255,255,0.35); }
.lg-input:focus { border-color: rgba(46,224,138,0.7); box-shadow: 0 0 0 3px rgba(46,224,138,0.14); }

/* Phone row: country-code select + national number */
.lg-phone-row { display: flex; gap: 8px; }
.lg-dial { flex: 0 0 auto; width: 84px; padding: 13px 10px; border-radius: 12px; box-sizing: border-box; font-size: 14px; font-weight: 800; color: #fff;
  outline: none; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,214,120,0.24); cursor: pointer; }
.lg-dial:focus { border-color: rgba(46,224,138,0.7); box-shadow: 0 0 0 3px rgba(46,224,138,0.14); }
.lg-phone-input { flex: 1; }
.lg-otp { letter-spacing: 6px; font-size: 18px; font-weight: 800; text-align: center; }

.lg-alert { padding: 10px 12px; font-size: 12px; font-weight: 700; border-radius: 12px; }
.lg-alert.err { color: #ff8fb0; background: rgba(255,77,109,0.1); border: 1px solid rgba(255,77,109,0.32); }
.lg-alert.ok { color: #6bf5a3; background: rgba(46,224,138,0.1); border: 1px solid rgba(46,224,138,0.32); }

.lg-submit { width: 100%; padding: 14px 16px; font-size: 14px; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; border-radius: 16px; }

.lg-row-links { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 2px; }
.lg-link { background: none; border: none; color: #2ee08a; font-size: 12px; font-weight: 800; cursor: pointer; padding: 6px 2px; font-family: inherit; }
.lg-link:disabled { color: rgba(255,255,255,0.35); cursor: not-allowed; }

.lg-or { display: flex; align-items: center; gap: 10px; margin: 14px 0 2px; }
.lg-or span { flex: 1; height: 1px; background: rgba(255,214,120,0.16); }
.lg-or b { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: rgba(255,255,255,0.45); }

.lg-google { width: 100%; padding: 13px 16px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; margin-top: 12px;
  font-size: 14px; font-weight: 800; color: #1f1f1f; background: #fff; border: none; border-radius: 16px; font-family: inherit;
  box-shadow: 0 4px 0 rgba(0,0,0,0.28), 0 8px 16px rgba(0,0,0,0.28); transition: transform .12s; }
.lg-google:active { transform: translateY(2px); }
.lg-google:disabled { opacity: .6; cursor: not-allowed; }

.lg-forgot { background: none; border: none; color: #2ee08a; font-size: 12px; font-weight: 700; cursor: pointer; padding: 6px; margin-top: 2px; text-align: center; font-family: inherit; }

.lg-alt { display: block; width: 100%; margin-top: 16px; padding: 11px; background: none; cursor: pointer; font-family: inherit;
  color: rgba(255,255,255,0.7); font-size: 12.5px; font-weight: 800; letter-spacing: .3px;
  border: 1px solid rgba(255,214,120,0.22); border-radius: 12px; transition: border-color .16s, color .16s; }
.lg-alt:hover { color: #fff; border-color: rgba(255,214,120,0.4); }

.lg-trust { margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(255,214,120,0.14); text-align: center; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; color: rgba(255,255,255,0.45); text-transform: uppercase; }

.lg-back-wrap { text-align: center; margin-top: 18px; }
.lg-back { background: none; border: none; color: rgba(255,255,255,0.45); font-size: 12px; font-weight: 700; cursor: pointer; padding: 8px; font-family: inherit; }

/* ══ GOLD GLAMOUR — richer thilakam on the login card ══
   Additive: deeper gold frame + halo, brighter/denser sparkles, drifting gold
   dust, a specular sweep across the primary CTA, and a soft gold bloom on the
   title. Reduced-motion safe (guarded below). */
.lg-spk:nth-child(6){ top:34%; right:20%; animation-delay:.6s; }
.lg-spk:nth-child(7){ bottom:40%; left:24%; animation-delay:1.9s; }
.lg-spk:nth-child(8){ top:8%; left:44%; animation-delay:2.5s; }
.lg-spk { box-shadow: 0 0 10px rgba(255,214,120,0.95); }

/* Fine gold dust — tiny, slow, low-opacity motes that drift upward */
.lg-dust { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.lg-dust span { position: absolute; width: 3px; height: 3px; border-radius: 50%; opacity: 0;
  background: radial-gradient(circle, #fff4cf, rgba(240,201,74,0.6) 45%, transparent 72%);
  animation: lg-dust 7.5s linear infinite; }
.lg-dust span:nth-child(1){ left:12%; animation-delay:0s; } .lg-dust span:nth-child(2){ left:30%; animation-delay:1.6s; }
.lg-dust span:nth-child(3){ left:52%; animation-delay:3.1s; } .lg-dust span:nth-child(4){ left:70%; animation-delay:.8s; }
.lg-dust span:nth-child(5){ left:84%; animation-delay:2.3s; } .lg-dust span:nth-child(6){ left:46%; animation-delay:4.2s; }
@keyframes lg-dust { 0% { opacity: 0; transform: translateY(20px) scale(.6); } 12% { opacity: .9; } 80% { opacity: .5; } 100% { opacity: 0; transform: translateY(-90px) scale(1); } }

/* Card: deeper gilt frame + warm gold outer halo */
.lg-card { box-shadow:
  inset 0 0 0 1.5px rgba(245,200,80,0.62),
  inset 0 1.8px 0 rgba(255,246,213,0.34),
  inset 0 0 34px -8px rgba(240,201,74,0.16),
  0 0 30px -8px rgba(240,201,74,0.5),
  0 26px 54px -22px rgba(0,0,0,0.9); }

/* Orb: a brighter gold ring pulse */
.lg-orb { box-shadow: inset 0 2px 0 rgba(255,255,255,0.7), inset 0 -8px 14px rgba(0,0,0,0.3),
  0 8px 20px -6px rgba(0,0,0,0.6), 0 0 0 2px rgba(245,180,35,0.95), 0 0 26px -3px rgba(245,180,35,0.85); }

/* Title: soft gold bloom */
.lg-title { text-shadow: 0 0 14px rgba(240,201,74,0.28); }

/* Primary CTA: one slow specular gold sweep */
.lg-submit { position: relative; overflow: hidden; }
.lg-submit::after { content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 42%; transform: skewX(-20deg); pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: lg-cta-sweep 4.8s ease-in-out infinite; }
@keyframes lg-cta-sweep { 0%, 62% { left: -60%; } 86%, 100% { left: 130%; } }

/* ══ RICH COLOR + TOP SHINE ══
   Deeper jewel-emerald ground, a live gold shimmer across the wordmark, and a
   richer dual (gold+emerald) focus glow. Restrained — one moving highlight. */
.lg-root { background:
  radial-gradient(90% 55% at 50% -4%, rgba(240,201,74,0.12), transparent 46%),
  radial-gradient(120% 70% at 50% 0%, rgba(30,120,80,0.5), transparent 60%),
  linear-gradient(178deg, #103b28 0%, #08281a 44%, #030f0a 100%); }
/* live gold shimmer on the C7 wordmark + orb monogram */
.lg-h1 .c7p-gold-text, .lg-orb-c7 {
  background-image: linear-gradient(100deg,#fff8e0 0%,#ffe9a8 22%,#f7d868 42%,#e0a93a 58%,#ffe9a8 80%,#fff8e0 100%);
  background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: lg-goldshift 5.5s ease-in-out infinite; }
@keyframes lg-goldshift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
/* richer input focus — gold ring + emerald bloom */
.lg-input:focus, .lg-dial:focus {
  border-color: rgba(240,201,74,0.7);
  box-shadow: 0 0 0 3px rgba(46,224,138,0.16), 0 0 16px -3px rgba(240,201,74,0.5); }
/* gold-tinted divider + brighter trust rule */
.lg-or span { background: linear-gradient(90deg, transparent, rgba(240,201,74,0.4), transparent); }

@media (prefers-reduced-motion: reduce) {
  .lg-orb, .lg-spk, .lg-card-shine, .lg-card-wrap, .lg-check-dot,
  .lg-dust span, .lg-submit::after, .lg-h1 .c7p-gold-text, .lg-orb-c7 { animation: none !important; }
  .lg-dust span { opacity: 0 !important; }
  .lg-h1 .c7p-gold-text, .lg-orb-c7 { background-position: 0% 50% !important; }
}
`;
