import { describe, expect, it } from "vitest";

describe("PREMIUM / CASINO - Route wiring", () => {
  const read = async (path: string) => {
    const fs = await import("fs");
    return fs.readFileSync(path, "utf-8");
  };

  it("App redirects /premium home and /casino to the canonical routes", async () => {
    // Normalize whitespace so alignment spacing doesn't break intent checks.
    const code = (await read("src/App.tsx")).replace(/\s+/g, " ");
    // APP SWAP: the Instagram-light app (/ig) is now the user-facing home. "/"
    // redirects to /ig; /v3 also redirects to /ig (classic dark lobby lives at
    // /v3-classic). Lobby-root aliases (/casino, /games, /home) still point at
    // /v3, which now forwards on to /ig. /premium still redirects to "/".
    expect(code).toContain('path="/premium" element={<Navigate to="/" replace />}');
    expect(code).toContain('path="/casino" element={<Navigate to="/v3" replace />}');
    expect(code).toContain('path="/" element={<Navigate to="/ig" replace />}');
    expect(code).toContain('path="/v3" element={<Navigate to="/ig" replace />}');
    expect(code).toContain('path="/home" element={<Navigate to="/v3" replace />}');
    expect(code).toContain('path="/games" element={<Navigate to="/v3" replace />}');
  });

  it("Admin route wiring remains present", async () => {
    const code = await read("src/App.tsx");
    expect(code).toContain('path="/admin"');
    expect(code).toContain('path="/admin/login"');
  });
});
