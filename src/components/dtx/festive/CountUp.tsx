import { useEffect, useRef, useState } from "react";

interface Props {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function CountUp({ to, duration = 1500, decimals = 0, prefix = "", suffix = "", className }: Props) {
  const [val, setVal] = useState(0);
  const startedAt = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = val;
    startedAt.current = null;
    let raf = 0;
    const tick = (now: number) => {
      if (startedAt.current === null) startedAt.current = now;
      const p = Math.min(1, (now - startedAt.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(fromRef.current + (to - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration]);

  return <span className={className}>{prefix}{val.toFixed(decimals)}{suffix}</span>;
}
