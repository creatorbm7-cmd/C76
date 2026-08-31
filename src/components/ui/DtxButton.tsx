import { ReactNode, CSSProperties } from "react";

/**
 * DtxButton — the ONE button used across the app.
 * Styling is driven by global CSS classes in src/index.css:
 *   .dtx-btn + .dtx-btn-{variant} + optional .dtx-btn-{sm|lg} + .dtx-btn-full
 * Theme-aware overrides live under [data-theme="light"] and [data-uono-theme="white"].
 */

export type DtxButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type DtxButtonSize = "sm" | "md" | "lg";

interface Props {
  variant?: DtxButtonVariant;
  size?: DtxButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: CSSProperties;
  title?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  "aria-label"?: string;
}

export default function DtxButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  children,
  type = "button",
  className,
  style,
  title,
  leftIcon,
  rightIcon,
  "aria-label": ariaLabel,
}: Props) {
  const isDisabled = disabled || loading;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    if (variant === "primary" && navigator.vibrate) navigator.vibrate(10);
    onClick?.(e);
  };

  const classes = [
    "dtx-btn",
    `dtx-btn-${variant}`,
    size === "sm" ? "dtx-btn-sm" : "",
    size === "lg" ? "dtx-btn-lg" : "",
    fullWidth ? "dtx-btn-full" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel}
      disabled={isDisabled}
      className={classes}
      style={style}
      onClick={handleClick}
    >
      {loading ? (
        <span aria-hidden className="dtx-btn-spinner" />
      ) : (
        <>
          {leftIcon ? <span style={{ display: "inline-flex", alignItems: "center" }}>{leftIcon}</span> : null}
          {children != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{children}</span>
          )}
          {rightIcon ? <span style={{ display: "inline-flex", alignItems: "center" }}>{rightIcon}</span> : null}
        </>
      )}
    </button>
  );
}
