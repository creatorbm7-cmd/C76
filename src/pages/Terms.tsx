import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";
import Footer from "@/components/Footer";
import { LGL_CSS } from "./PrivacyPolicy";

/**
 * Terms (/terms) — premium gilt gold+emerald reskin.
 * Legal copy unchanged; shares the legal-page styling with PrivacyPolicy.
 */
const SECTIONS: { h: string; p: string }[] = [
  { h: "Acceptance of Terms", p: "By accessing and using C7 Winners, you accept and agree to be bound by these Terms of Service." },
  { h: "Educational Purpose", p: "C7 Winners is provided for educational and informational purposes only. This is not financial advice. Always do your own research before making any financial decisions." },
  { h: "Risk Acknowledgment", p: "Trading cryptocurrencies and using DeFi protocols involves significant risk. You may lose some or all of your investment. Only invest what you can afford to lose." },
  { h: "No Warranty", p: "C7 Winners is provided \"as is\" without warranties of any kind. We do not guarantee the accuracy, completeness, or reliability of any information or services." },
  { h: "Limitation of Liability", p: "To the fullest extent permitted by law, C7 Winners and its creators shall not be liable for any damages arising from your use of the service." },
  { h: "Compliance", p: "You are responsible for complying with all applicable laws and regulations in your jurisdiction." },
];

const Terms = () => {
  const nav = useNavigate();
  return (
    <div className="c7p-page lgl-root">
      <style>{LGL_CSS}</style>

      <header className="lgl-head">
        <button className="lgl-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/"))} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="lgl-head-title c7p-gold-text">Terms of Service</span>
        <ScrollText size={18} className="lgl-head-ic" />
      </header>

      <main className="lgl-main">
        <div className="lgl-eyebrow c7p-gold-text">C7 WINNERS · TERMS</div>
        <h1 className="lgl-h1">Terms of Service</h1>

        <div className="c7p-panel lgl-panel">
          {SECTIONS.map((s, i) => (
            <section key={s.h} className={`lgl-sec${i === 0 ? " lgl-sec--first" : ""}`}>
              <h2 className="lgl-h2 c7p-gold-text">{s.h}</h2>
              <p className="lgl-p">{s.p}</p>
            </section>
          ))}
        </div>

        <div className="lgl-xlink"><Link to="/privacy">See also: Privacy Policy ›</Link></div>

        <div className="lgl-foot-note">18+ · Play responsibly · Provably fair</div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
