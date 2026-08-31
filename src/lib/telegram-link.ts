// Telegram account-linking helpers (pure, UI-agnostic so they're unit-testable).
//
// A user links their Telegram by minting a single-use token via the
// `create_telegram_link_token` RPC, then opening the bot deep-link
// `https://t.me/<bot>?start=<token>`. When they press Start in Telegram, the
// bot's webhook consumes the token server-side and binds their chat id.
//
// The bot username is verified from the existing integration: the admin
// channels UI instructs operators to add `@dtx_creatorbot` to channels, and it
// is the only real bot handle in the codebase (note: `@Creator744` is the
// support contact, not a bot — Telegram bot usernames must end in "bot").
// It stays overridable via VITE_TELEGRAM_BOT_USERNAME so ops can correct it
// without a code change if the deployed bot ever differs.

const DEFAULT_BOT_USERNAME = "dtx_creatorbot";

/** Resolve the bot username: env override wins, else the verified default. */
export function botUsername(): string {
  const raw = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.trim();
  return normalizeBotUsername(raw || DEFAULT_BOT_USERNAME);
}

/** Strip a leading `@` and surrounding whitespace from a bot handle. */
export function normalizeBotUsername(username: string): string {
  return username.trim().replace(/^@+/, "");
}

/**
 * Build the Telegram deep-link that opens the bot and pre-fills the /start
 * payload with the single-use link token.
 */
export function telegramDeepLink(token: string, bot: string = botUsername()): string {
  const cleanBot = normalizeBotUsername(bot);
  const payload = encodeURIComponent(token.trim());
  return `https://t.me/${cleanBot}?start=${payload}`;
}
