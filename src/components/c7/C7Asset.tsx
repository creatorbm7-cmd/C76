// C7Asset — drop-in premium asset slot.
//
// Renders the operator-bound PNG for `slot` (from the live get_app_assets map)
// when present; otherwise renders the built-in premium `fallback` (a C7Icon,
// an existing PNG, or any node). The moment a transparent PNG is bound to the
// slot's asset_key in Admin → AI Studio, this upgrades LIVE with no code change.
//
// Display-only: no balance, RPC, C74 or game logic. See src/lib/c7Assets.ts for
// the slot registry and docs/C7-ASSET-SLOTS.md for the route/asset mapping.
import { ReactNode, useState } from "react";
import { useAppAssets } from "@/hooks/useAppAssets";
import { useGenAssets, genPathFor } from "@/lib/genAssets";

type Props = {
  slot: string;
  fallback: ReactNode;
  size?: number;            // square px for the bound <img>
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
};

export default function C7Asset({ slot, fallback, size, width, height, className, alt = "", style }: Props) {
  const art = useAppAssets();
  const gen = useGenAssets();
  const [failed, setFailed] = useState(false);
  // Precedence: bound Admin art → static cutout (gen manifest) → built-in fallback.
  const bound = art[slot] ?? (gen.has(slot) ? genPathFor(slot) : undefined);

  if (bound && !failed) {
    return (
      <img
        src={bound}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        width={width ?? size}
        height={height ?? size}
        className={className}
        style={{ objectFit: "contain", ...style }}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
      />
    );
  }
  return <>{fallback}</>;
}
