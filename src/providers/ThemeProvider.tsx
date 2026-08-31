/**
 * ThemeProvider — locks the app to the Yono Arcade palette.
 *
 * Sets data-theme="yono" on <html> so the --c7-* variables in index.css apply.
 * (Emerald and other themes were removed — Yono is the only theme.)
 */
import { useEffect, type ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'yono');
  }, []);
  return <>{children}</>;
}

export default ThemeProvider;
