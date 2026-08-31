import { describe, it, expect } from "vitest";
import {
  telegramTextForEvent,
  isTelegramUserEvent,
  TELEGRAM_USER_EVENTS,
} from "../../supabase/functions/_shared/telegramEvents";

// Focused tests for the notify-event user-facing Telegram leg (pure formatter).
// The message text is what the resilient shared sender delivers to opted-in users.

describe("telegramTextForEvent (pure)", () => {
  it("returns null for non-user-facing events (email/in-app only)", () => {
    expect(telegramTextForEvent("login")).toBeNull();
    expect(telegramTextForEvent("signup_welcome")).toBeNull();
    expect(telegramTextForEvent("withdrawal_submitted_typo")).toBeNull();
    expect(telegramTextForEvent("totally_unknown")).toBeNull();
  });

  it("formats each eligible transactional/celebratory event with its key facts", () => {
    expect(telegramTextForEvent("deposit_credited", { amount: 250, currency: "USDT", tx_code: "D-1" }))
      .toContain("Deposit credited");
    expect(telegramTextForEvent("deposit_credited", { amount: 250 })).toContain("250.00");
    expect(telegramTextForEvent("withdrawal_submitted", { amount: 40, chain: "TRON" })).toContain("Withdrawal submitted");
    expect(telegramTextForEvent("withdrawal_approved", { amount: 100, chain: "TRON" })).toContain("Withdrawal approved");
    expect(telegramTextForEvent("withdrawal_rejected", { amount: 100, reason: "KYC" })).toContain("refunded");
    expect(telegramTextForEvent("withdrawal_rejected", { amount: 100, reason: "KYC" })).toContain("KYC");
    expect(telegramTextForEvent("big_win", { amount: 5000, multiplier: 100, game: "Crash" })).toContain("Big win");
    expect(telegramTextForEvent("referral_reward", {})).toContain("Referral reward");
    expect(telegramTextForEvent("referral_welcome", {})).toContain("Welcome bonus");
  });

  it("HTML-escapes dynamic values (parse_mode HTML injection safety)", () => {
    const out = telegramTextForEvent("big_win", { game: "<b>x</b> & <script>alert(1)</script>", amount: 1 });
    expect(out).not.toBeNull();
    expect(out!).not.toContain("<script>");
    expect(out!).toContain("&lt;script&gt;");
    expect(out!).toContain("&amp;");
  });

  it("every TELEGRAM_USER_EVENTS entry is eligible and produces text; helper agrees", () => {
    for (const e of TELEGRAM_USER_EVENTS) {
      expect(isTelegramUserEvent(e)).toBe(true);
      expect(telegramTextForEvent(e, { amount: 1 })).toBeTruthy();
    }
    expect(isTelegramUserEvent("login")).toBe(false);
  });

  it("never embeds a bot-token-shaped string (secrets stay server-side)", () => {
    const out = telegramTextForEvent("deposit_credited", { amount: 10 });
    // Telegram bot tokens look like `123456789:AA...`; the formatter must never emit one.
    expect(out!).not.toMatch(/\b\d{6,}:[A-Za-z0-9_-]{20,}\b/);
  });
});
