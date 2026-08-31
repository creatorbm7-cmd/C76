// Shared phone-number helpers for auth/settings flows. Keeps login and the
// Settings "verify phone" panel agreeing on dialling codes and E.164 format.
// Presentation/format only — no network, no money logic.

// Common dialling codes (India first — primary audience).
export const DIAL_CODES = ['+91', '+1', '+44', '+971', '+61', '+880', '+92', '+94', '+63', '+234', '+27', '+55'];

// Build an E.164 string from a dial code + a national number (any separators).
export const toE164 = (dial: string, national: string): string => `${dial}${national.replace(/\D/g, '')}`;

// Loose E.164 validity check (leading +, 8–15 digits).
export const isE164 = (s: string): boolean => /^\+\d{8,15}$/.test(s);
