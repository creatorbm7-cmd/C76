import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

// Source-intent tests for the Settings "Connect Telegram" section. These guard
// the wiring (correct RPCs, deep-link, states) without mounting the page and
// mocking the whole Supabase client.

const src = readFileSync("src/pages/dtx/DtxSettingsPage.tsx", "utf-8");

describe("DtxSettingsPage — Connect Telegram", () => {
  it("mints a single-use token via the create_telegram_link_token RPC", () => {
    expect(src).toContain("create_telegram_link_token");
  });

  it("opens the bot deep-link built by the shared helper", () => {
    expect(src).toContain("telegramDeepLink");
    expect(src).toContain('from "@/lib/telegram-link"');
    expect(src).toContain("window.open(");
  });

  it("supports disconnecting via the unlink_telegram RPC", () => {
    expect(src).toContain("unlink_telegram");
  });

  it("renders both connected and disconnected states", () => {
    expect(src).toContain("tgConnected");
    expect(src).toContain("Connect Telegram");
    expect(src).toContain("Disconnect Telegram");
    expect(src).toContain("Telegram connected");
  });

  it("handles loading and error state safely", () => {
    expect(src).toContain("tgBusy");
    expect(src).toContain("tgError");
    expect(src).toMatch(/role="alert"/);
  });

  it("replaces the misleading email-notification label with accurate Telegram wording", () => {
    expect(src).not.toContain("Email me about");
    expect(src).toContain("Telegram alerts");
  });

  it("does not hardcode the non-bot @Creator744 support handle as the deep-link target", () => {
    // The support handle may appear elsewhere, but the linking flow must go
    // through the helper / verified bot, never a t.me/Creator744 start link.
    expect(src).not.toMatch(/t\.me\/Creator744\?start/i);
  });
});
