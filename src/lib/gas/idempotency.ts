// C74 Gas — Phase B · Step 1: idempotency framework (key derivation).
//
// A deterministic, collision-resistant idempotency key for the gas pipeline.
// The DB enforces uniqueness (UNIQUE on gas_quotes / c74_fee_ledger /
// settlement_ledger); this module produces the key so the same logical action
// always maps to the same key — a retry is a no-op, never a double-charge, and
// distinct actions never collide onto the same key.
//
// Uses SHA-256 (Web Crypto) over a canonical string — cryptographically strong,
// fixed-length, and available in the browser and in edge (Deno) runtimes. Pure
// and side-effect-free: no network, no keys, no money movement.

/** The fields that make a gas action unique. All required; order-independent. */
export interface IdempotencyParts {
  scope: "quote" | "fee" | "settlement";
  userId: string;
  action: string;
  chainId: number;
  /** A caller-supplied nonce that distinguishes otherwise-identical actions
   *  (e.g. the UserOp nonce, or a client-generated request id). */
  nonce: string;
}

function canonicalize(parts: IdempotencyParts): string {
  return [
    parts.scope,
    parts.userId.trim().toLowerCase(),
    parts.action.trim().toLowerCase(),
    String(parts.chainId),
    parts.nonce.trim(),
  ].join("|");
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Canonical, stable idempotency key. Async because it uses SHA-256 via Web
 * Crypto. Same inputs always yield the same key across retries; different inputs
 * never realistically collide (256-bit digest) — so a distinct legitimate action
 * can't be mistaken for a duplicate.
 */
export async function idempotencyKey(parts: IdempotencyParts): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalize(parts));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `c74gas:${parts.scope}:${toHex(digest)}`;
}
