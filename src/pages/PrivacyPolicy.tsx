import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";

/**
 * PrivacyPolicy (/privacy) — premium gilt gold+emerald reskin.
 * Legal copy is unchanged; only the presentation is brought in line with the
 * rest of the app (emerald felt page, gilt gold header, gilt panel, gold-cut
 * section headings).
 */
const SECTIONS: { h: string; p: string }[] = [
  { h: "Overview", p: "C7 Winners is a decentralized exchange interface. We do not collect, store, or process personal data. Your privacy is paramount." },
  { h: "Data Collection", p: "C7 Winners does not collect personally identifiable information. All transactions occur directly on the blockchain. We may collect anonymous analytics to improve the user experience." },
  { h: "Wallet Connection", p: "When you connect your wallet, you're interacting directly with smart contracts on the blockchain. We never have custody of your funds or access to your private keys." },
  { h: "Third-Party Services", p: "We may use third-party services for analytics and infrastructure. These services have their own privacy policies." },
  { h: "Updates", p: "This privacy policy may be updated from time to time. Continued use of the service constitutes acceptance of any changes." },
];

const PrivacyPolicy = () => {
  const nav = useNavigate();
  return (
    <div className="c7p-page lgl-root">
      <style>{LGL_CSS}</style>

      <header className="lgl-head">
        <button className="lgl-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/"))} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="lgl-head-title c7p-gold-text">Privacy Policy</span>
        <ShieldCheck size={18} className="lgl-head-ic" />
      </header>

      <main className="lgl-main">
        <div className="lgl-eyebrow c7p-gold-text">C7 WINNERS · PRIVACY</div>
        <h1 className="lgl-h1">Your Privacy</h1>

        <div className="c7p-panel lgl-panel">
          {SECTIONS.map((s, i) => (
            <section key={s.h} className={`lgl-sec${i === 0 ? " lgl-sec--first" : ""}`}>
              <h2 className="lgl-h2 c7p-gold-text">{s.h}</h2>
              <p className="lgl-p">{s.p}</p>
            </section>
          ))}
        </div>

        <div className="lgl-xlink"><Link to="/terms">See also: Terms of Service ›</Link></div>

        <div className="lgl-foot-note">18+ · Play responsibly · Provably fair</div>
      </main>

      <Footer />
    </div>
  );
};

export const LGL_CSS = `
.lgl-root { min-height: 100vh; display: flex; flex-direction: column; color: #fff; font-family: Inter, system-ui, sans-serif; }
.lgl-head { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: linear-gradient(180deg, rgba(6,20,12,0.94), rgba(6,20,12,0.62)); backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(255,214,120,0.22); box-shadow: 0 1px 0 rgba(255,214,120,0.1); }
.lgl-head::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,200,61,0.55) 30%, rgba(46,224,138,0.4) 70%, transparent); }
.lgl-back { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,214,120,0.28); color: #ffe9a8; cursor: pointer;
  background: rgba(0,0,0,0.3); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lgl-head-title { font-size: 17px; font-weight: 900; letter-spacing: 0.4px; flex: 1; }
.lgl-head-ic { color: #ffd24d; flex-shrink: 0; }
.lgl-main { flex: 1; position: relative; z-index: 1; width: 100%; max-width: 760px; margin: 0 auto; padding: 22px 16px 32px; }
.lgl-eyebrow { font-size: 10px; font-weight: 900; letter-spacing: 3px; }
.lgl-h1 { margin: 4px 0 18px; font-size: 30px; font-weight: 900; letter-spacing: -0.5px; color: #fff; line-height: 1.05; }
.lgl-panel { padding: 20px 20px 6px; }
.lgl-sec { padding: 0 0 16px; border-top: 1px solid rgba(255,214,120,0.12); margin-top: 16px; }
.lgl-sec--first { border-top: none; margin-top: 0; }
.lgl-h2 { font-size: 15px; font-weight: 900; letter-spacing: 0.3px; margin: 0 0 7px; }
.lgl-p { font-size: 13.5px; line-height: 1.62; color: rgba(255,255,255,0.72); margin: 0; }
.lgl-foot-note { text-align: center; font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 18px; font-weight: 600; letter-spacing: 0.3px; }
.lgl-xlink { text-align: center; margin-top: 20px; }
.lgl-xlink a { font-size: 12.5px; font-weight: 800; color: #ffe9a8; text-decoration: none; letter-spacing: 0.3px; }
.lgl-xlink a:hover { text-decoration: underline; }
`;

export default PrivacyPolicy;
