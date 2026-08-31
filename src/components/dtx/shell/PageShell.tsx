import { ReactNode } from "react";
import AnimatedBackdrop from "@/components/c7/AnimatedBackdrop";

interface Props { children: ReactNode; noBottomNav?: boolean; }

export default function PageShell({ children, noBottomNav }: Props) {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "transparent", color: "#ffffff" }}
    >
      <AnimatedBackdrop />
      <div
        className="mx-auto w-full max-w-[460px]"
        style={{ paddingBottom: noBottomNav ? 0 : "calc(92px + env(safe-area-inset-bottom,0px))" }}
      >
        {children}
      </div>
    </div>
  );
}
