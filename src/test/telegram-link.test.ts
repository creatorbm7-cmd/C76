import { describe, it, expect } from "vitest";
import { telegramDeepLink, normalizeBotUsername, botUsername } from "@/lib/telegram-link";

// The linking deep-link is the one piece of client logic that must be exactly
// right — a wrong bot handle or malformed ?start payload silently breaks the
// whole opt-in chain, so it gets real unit coverage.

describe("normalizeBotUsername", () => {
  it("strips a leading @ and surrounding whitespace", () => {
    expect(normalizeBotUsername("@dtx_creatorbot")).toBe("dtx_creatorbot");
    expect(normalizeBotUsername("  @dtx_creatorbot  ")).toBe("dtx_creatorbot");
    expect(normalizeBotUsername("dtx_creatorbot")).toBe("dtx_creatorbot");
  });
});

describe("telegramDeepLink", () => {
  it("builds a t.me deep-link with the token as the ?start payload", () => {
    expect(telegramDeepLink("ABCD1234", "dtx_creatorbot"))
      .toBe("https://t.me/dtx_creatorbot?start=ABCD1234");
  });

  it("tolerates an @-prefixed bot handle", () => {
    expect(telegramDeepLink("ABCD1234", "@dtx_creatorbot"))
      .toBe("https://t.me/dtx_creatorbot?start=ABCD1234");
  });

  it("url-encodes and trims the token so it survives as a single ?start value", () => {
    expect(telegramDeepLink("  X Y/Z  ", "bot"))
      .toBe("https://t.me/bot?start=X%20Y%2FZ");
  });

  it("defaults to the verified bot username when none is passed", () => {
    // No VITE_TELEGRAM_BOT_USERNAME is set in the test env, so this is the
    // codebase-verified default (@dtx_creatorbot), never the support handle.
    expect(botUsername()).toBe("dtx_creatorbot");
    expect(telegramDeepLink("ABCD1234")).toBe("https://t.me/dtx_creatorbot?start=ABCD1234");
  });

  it("never points at the @Creator744 support handle (which is not a bot)", () => {
    expect(telegramDeepLink("ABCD1234").toLowerCase()).not.toContain("creator744?");
    expect(botUsername()).toMatch(/bot$/i);
  });
});
