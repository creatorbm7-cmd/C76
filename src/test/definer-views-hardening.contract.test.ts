// System #7 — security-definer-view hardening CONTRACT SPEC (executable).
//
// Pins the branch-only draft in
// `supabase/migrations/20260822140000_security_definer_views_hardening.sql`:
// the 3 advisor-flagged views must be switched to security_invoker and have their
// anon SELECT grant revoked, WITHOUT redefining the views (ALTER VIEW SET, not
// CREATE OR REPLACE). Static-only; imports no production code, changes nothing.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const VIEWS = ["treasury_summary", "c74_reserve_status", "v_igaming_ggr"];
const SQL = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260822140000_security_definer_views_hardening.sql"),
  "utf8",
);
const lc = SQL.toLowerCase();
const norm = lc.replace(/\s+/g, " ");
// executable SQL only — drop `--` comment lines so structural checks ignore prose.
const code = SQL.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").toLowerCase();

describe("definer-view hardening — migration draft integrity", () => {
  it.each(VIEWS)("sets security_invoker=true on public.%s", (v) => {
    expect(norm).toContain(`alter view public.${v} set (security_invoker = true);`);
  });

  it("switches all three views to security_invoker", () => {
    const n = (code.match(/set \(security_invoker = true\)/g) || []).length;
    expect(n).toBe(3);
  });

  it.each(VIEWS)("revokes ALL from anon on public.%s (anon has the full inert privilege set)", (v) => {
    expect(norm).toContain(`revoke all on public.${v} from anon;`);
  });

  it("does NOT redefine the views (no CREATE/REPLACE/DROP VIEW — definition preserved)", () => {
    expect(code).not.toContain("create or replace view");
    expect(code).not.toContain("create view");
    expect(code).not.toContain("drop view");
  });

  it("does NOT revoke from service_role (admin edge reads must keep working)", () => {
    expect(code).not.toContain("from service_role");
    expect(code).not.toContain("from authenticated"); // reroute-first; not in this draft
  });

  it("touches no table data (no update/insert/delete)", () => {
    expect(code).not.toMatch(/\b(update|insert into|delete from)\b/);
  });
});

// Semantic contract: anon must never read these aggregates; service_role always may.
type Role = "anon" | "authenticated" | "service_role";
function canReadAfterFix(role: Role, isAdminUnderlyingRls: boolean): boolean {
  if (role === "anon") return false;             // grant revoked
  if (role === "service_role") return true;      // BYPASSRLS
  return isAdminUnderlyingRls;                    // authenticated: RLS-scoped via security_invoker
}

describe("definer-view hardening — access semantics", () => {
  it("blocks anon regardless of RLS", () => {
    expect(canReadAfterFix("anon", true)).toBe(false);
  });
  it("always allows service_role (admin edge functions)", () => {
    expect(canReadAfterFix("service_role", false)).toBe(true);
  });
  it("scopes authenticated by underlying RLS (admin yes, normal user no)", () => {
    expect(canReadAfterFix("authenticated", true)).toBe(true);
    expect(canReadAfterFix("authenticated", false)).toBe(false);
  });
});
