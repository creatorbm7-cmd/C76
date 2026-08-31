import { useEffect } from "react";

/**
 * Captures ?ref=CODE from URL into localStorage so we can attach the referrer
 * after the user signs in. Runs once on mount.
 */
export default function RefCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && /^[A-Z0-9]{4,16}$/i.test(ref)) {
        const existing = localStorage.getItem("dtx_ref_code");
        if (!existing) localStorage.setItem("dtx_ref_code", ref.toUpperCase());
      }
    } catch {/* ignore */}
  }, []);
  return null;
}
