import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface Props {
  eyebrow?: string;
  title: string;
  seeAllTo?: string;
  seeAllLabel?: string;
}

export default function SectionTitle({ eyebrow, title, seeAllTo, seeAllLabel = "See all" }: Props) {
  const navigate = useNavigate();
  return (
    <div className="flex items-end justify-between px-4 pt-5 pb-2">
      <div className="min-w-0">
        {eyebrow && (
          <div
            className="text-[10px] font-bold tracking-[3px] uppercase"
            style={{ color: "hsl(var(--dtx-mint))" }}
          >
            {eyebrow}
          </div>
        )}
        <h2
          className="text-lg font-black leading-tight"
          style={{ fontFamily: "Syne, sans-serif", letterSpacing: 0.2 }}
        >
          {title}
        </h2>
      </div>
      {seeAllTo && (
        <button
          onClick={() => navigate(seeAllTo)}
          className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-dtx-muted hover:text-white transition"
        >
          {seeAllLabel}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
