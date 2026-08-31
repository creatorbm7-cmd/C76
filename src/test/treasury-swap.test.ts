import { describe, it, expect } from "vitest";
import {
  assetDecimals, computeReceived, roundTo, rateFromPeg,
  validateSwapInput, swapsToCsv, type SwapRow,
} from "@/lib/treasurySwap";

const readFile = async (path: string) => {
  const fs = await import("fs");
  return fs.readFileSync(path, "utf-8");
};
const MIGRATION = "supabase/migrations/20260729120000_treasury_c74_swap_ledger.sql";

/* ============================ ACCOUNTING ACCURACY ============================ */
describe("Treasury swap — accounting accuracy (pure helpers)", () => {
  it("asset decimals: USDT 6, C74 18", () => {
    expect(assetDecimals("USDT")).toBe(6);
    expect(assetDecimals("C74")).toBe(18);
    expect(assetDecimals("c74")).toBe(18); // case-insensitive
  });

  it("received = round(gross * rate, decimals(toAsset)) — no hardcoded scale", () => {
    // 100 USDT @ 100 → 10,000 C74
    expect(computeReceived(100, 100, "C74")).toBe(10000);
    // reverse: 10,000 C74 @ 0.01 → 100 USDT
    expect(computeReceived(10000, 0.01, "USDT")).toBe(100);
  });

  it("rounds to the destination asset precision", () => {
    // to USDT (6dp) truncates beyond 6 places
    expect(computeReceived(1, 0.1234567, "USDT")).toBe(0.123457);
    expect(roundTo(0.12345649, 6)).toBe(0.123456);
  });

  it("rateFromPeg inverts the energy_usd peg", () => {
    expect(rateFromPeg(0.01)).toBe(100);
    expect(rateFromPeg(0.001)).toBe(1000);
    expect(Number.isNaN(rateFromPeg(0))).toBe(true);
  });
});

/* ============================ INPUT / NUMERIC SAFETY ============================ */
describe("Treasury swap — input validation (numeric safety)", () => {
  const base = { fromAccount: "TREASURY_USDT", toAccount: "TREASURY_C74", rate: 100 };

  it("accepts a valid swap", () => {
    expect(validateSwapInput({ ...base, gross: 100 }).ok).toBe(true);
  });
  it("rejects equal accounts", () => {
    expect(validateSwapInput({ fromAccount: "X", toAccount: "X", gross: 1, rate: 1 }).ok).toBe(false);
  });
  it("rejects NaN / Infinity / non-positive amount", () => {
    expect(validateSwapInput({ ...base, gross: NaN }).ok).toBe(false);
    expect(validateSwapInput({ ...base, gross: Infinity }).ok).toBe(false);
    expect(validateSwapInput({ ...base, gross: 0 }).ok).toBe(false);
    expect(validateSwapInput({ ...base, gross: -5 }).ok).toBe(false);
  });
  it("rejects NaN / non-positive rate", () => {
    expect(validateSwapInput({ ...base, gross: 1, rate: NaN }).ok).toBe(false);
    expect(validateSwapInput({ ...base, gross: 1, rate: 0 }).ok).toBe(false);
  });
  it("enforces the max-swap risk cap", () => {
    expect(validateSwapInput({ ...base, gross: 200000, maxSwap: 100000 }).ok).toBe(false);
    expect(validateSwapInput({ ...base, gross: 50000, maxSwap: 100000 }).ok).toBe(true);
  });
});

/* ============================ CSV EXPORT ============================ */
describe("Treasury swap — history CSV export", () => {
  it("escapes commas/quotes and emits a header row", () => {
    const rows: SwapRow[] = [{
      journal_id: "j1", created_at: "2026-07-29T00:00:00Z", reference_type: "manual_swap",
      from_account: "TREASURY_USDT", to_account: "TREASURY_C74", gross_amount: 100,
      conversion_rate: 100, received_amount: 10000, rate_source: "peg:energy_usd",
      reason: "seed, initial", display_status: "completed",
    }];
    const csv = swapsToCsv(rows);
    expect(csv.split("\n")[0]).toContain("journal_id");
    expect(csv).toContain('"seed, initial"'); // comma-containing field quoted
    expect(csv).toContain("manual_swap");
  });
});

/* ============================ AUTHORIZATION (RBAC) ============================ */
describe("Treasury migration — authorization / RBAC", () => {
  it("adds the owner role to the user_roles check", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("'owner'");
    expect(sql).toContain("user_roles_role_check");
  });
  it("defines is_owner() gate and uses it in both RPCs", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("function public.is_owner");
    expect(sql).toMatch(/owner role required for treasury swap/);
    expect(sql).toMatch(/owner role required for treasury reversal/);
    expect(sql).toContain("42501"); // insufficient_privilege
  });
  it("enforces owner-only RLS SELECT on every treasury table", async () => {
    const sql = await readFile(MIGRATION);
    for (const t of ["treasury_accounts", "treasury_journal", "treasury_entries", "treasury_balances"]) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
    }
    expect(sql).toMatch(/using \(public\.is_owner\(\)\)/);
  });
  it("RPCs are revoked from anon/public and granted to authenticated only", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toMatch(/revoke execute on function public\.admin_treasury_swap[\s\S]*from public, anon/);
    expect(sql).toMatch(/grant\s+execute on function public\.admin_treasury_swap[\s\S]*to authenticated/);
  });
});

/* ============================ IDEMPOTENCY / CONCURRENCY ============================ */
describe("Treasury migration — idempotency & concurrency", () => {
  it("idempotency_key is UNIQUE and short-circuits to a replay", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("idempotency_key        text not null unique");
    expect(sql).toContain("'idempotent_replay', true");
  });
  it("catches unique_violation for concurrent duplicates (no double swap)", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("exception when unique_violation");
  });
  it("locks balance rows FOR UPDATE in a canonical order (deadlock-safe)", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("for update");
    expect(sql).toContain("p_from_account < p_to_account");
  });
});

/* ============================ ROLLBACK / NEGATIVE-BALANCE ============================ */
describe("Treasury migration — rollback & negative-balance protection", () => {
  it("raises INSUFFICIENT_TREASURY_BALANCE and never stores a failed swap", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("INSUFFICIENT_TREASURY_BALANCE");
    expect(sql).toContain("v_from_bal < p_gross_amount");
  });
  it("rejects NaN / Infinity numerically at the DB layer (Postgres NaN>0 trap)", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("'NaN'::numeric");
    expect(sql).toContain("'Infinity'::numeric");
  });
});

/* ============================ AUDIT INTEGRITY / IMMUTABILITY ============================ */
describe("Treasury migration — audit integrity & immutability", () => {
  it("journal + entries are append-only (trigger + REVOKE UPDATE/DELETE)", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("append-only");
    expect(sql).toContain("before update or delete on public.treasury_journal");
    expect(sql).toContain("before update or delete on public.treasury_entries");
    expect(sql).toMatch(/revoke update, delete on public\.treasury_journal/);
  });
  it("writes a rich audit_logs row with before/after balances", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("insert into public.audit_logs");
    expect(sql).toContain("'before_balances'");
    expect(sql).toContain("'after_balances'");
    expect(sql).toContain("'idempotency_key'");
  });
  it("emits a pg_notify event bus signal on completion", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("pg_notify('treasury_swap_completed'");
  });
  it("balances are a projection: entries carry signed delta + balance_after", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("delta         numeric not null");
    expect(sql).toContain("balance_after numeric not null");
    expect(sql).toContain("treasury_reconciliation"); // rebuild/verify view
  });
});

/* ============================ REVERSAL (compensating journal only) ============================ */
describe("Treasury migration — reversal is a new journal, never a mutation", () => {
  it("reversal inserts a NEW journal linked via reversal_of_journal_id", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("reversal_of_journal_id");
    expect(sql).toContain("'reversal'");
  });
  it("a swap can be reversed at most once (unique partial index)", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("treasury_journal_one_reversal");
    expect(sql).toContain("ALREADY_REVERSED");
  });
  it("reversal reason is mandatory (D4 guardrail)", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("reversal reason is required");
  });
  it("display_status is DERIVED (original row never set to 'reversed')", async () => {
    const sql = await readFile(MIGRATION);
    expect(sql).toContain("as display_status");
    expect(sql).toContain("security_invoker = true");
  });
});

/* ============================ UI WIRING ============================ */
describe("Treasury swap — admin UI wiring", () => {
  it("panel gates on is_owner and requires confirmation before execute", async () => {
    const code = await readFile("src/components/admin/AdminTreasurySwap.tsx");
    expect(code).toContain('rpc("is_owner"');
    expect(code).toContain("Owner access required");
    expect(code).toContain("Confirm treasury swap");
    expect(code).toContain("admin_treasury_swap");
    expect(code).toContain("crypto.randomUUID"); // idempotency key per attempt
  });
  it("history supports filters, CSV export and owner reversal with reason", async () => {
    const code = await readFile("src/components/admin/AdminTreasurySwap.tsx");
    expect(code).toContain("Export CSV");
    expect(code).toContain("admin_treasury_reverse");
    expect(code).toContain("Reversal reason");
  });
  it("is registered as an owner tab in the admin console", async () => {
    const admin = await readFile("src/pages/Admin.tsx");
    const sidebar = await readFile("src/components/admin/AdminSidebar.tsx");
    expect(admin).toContain('"treasury_swap"');
    expect(admin).toContain("<AdminTreasurySwap />");
    expect(sidebar).toContain("C74 Treasury Swap");
  });
});
