// IgRibbon — premium notched-flag status ribbon (LIVE/NEW/HOT/TOP/BEST/EVENT/
// JACKPOT). Pure CSS (see .ig-ribbon in styles/ig-premium.css) so it stays crisp
// at any size and themes cleanly. Presentation only — the label comes from the
// caller (e.g. the existing catalog badger). No data invented here.
export type IgRibbonKind = "live" | "new" | "hot" | "top" | "best" | "event" | "jackpot";

const LABEL: Record<IgRibbonKind, string> = {
  live: "LIVE", new: "NEW", hot: "HOT", top: "TOP", best: "BEST", event: "EVENT", jackpot: "JACKPOT",
};

export default function IgRibbon({ kind, sm, label, className = "" }: {
  kind: IgRibbonKind; sm?: boolean; label?: string; className?: string;
}) {
  return (
    <span className={`ig-ribbon ig-rb-${kind}${sm ? " sm" : ""}${className ? " " + className : ""}`}>
      <b>{label ?? LABEL[kind]}</b>
    </span>
  );
}
