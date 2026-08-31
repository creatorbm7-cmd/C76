import { describe, it, expect, vi } from "vitest";

describe("ADMIN PANEL - Code Analysis", () => {
  const readFile = async (path: string) => {
    const fs = await import("fs");
    return fs.readFileSync(path, "utf-8");
  };

  // 1. Admin sidebar has all required tabs (current labels)
  it("AdminSidebar includes all required tabs", async () => {
    const code = await readFile("src/components/admin/AdminSidebar.tsx");
    const requiredTabs = ["Dashboard", "Users", "KYC Verification", "Deposits", "Withdrawals", "Treasury", "Promotions", "System Config"];
    requiredTabs.forEach(tab => {
      expect(code).toContain(tab);
    });
  });

  // 1b. AdminSidebar exposes the 8-section control-center structure (audit Phase 2)
  it("AdminSidebar has the 8 canonical sections", async () => {
    const code = await readFile("src/components/admin/AdminSidebar.tsx");
    const sections = ["Overview", "Finance", "Users", "C74 Ecosystem", "Games", "Operations", "Security", "System"];
    sections.forEach(s => {
      expect(code).toContain(`label: "${s}"`);
    });
  });

  // 2. Admin settings uses direct table access (admin-only via RLS)
  it("AdminSettings accesses admin_casino_config (protected by admin RLS)", async () => {
    const code = await readFile("src/components/admin/AdminSettings.tsx");
    expect(code).toContain("admin_casino_config");
  });

  // 3. Admin overview exists
  it("AdminOverview component exists", async () => {
    const code = await readFile("src/components/admin/AdminOverview.tsx");
    expect(code).toBeDefined();
    expect(code.length).toBeGreaterThan(0);
  });

  // 4. Admin users panel exists
  it("AdminUsers component exists", async () => {
    const code = await readFile("src/components/admin/AdminUsers.tsx");
    expect(code).toBeDefined();
  });

  // 5. Finance surface exists (Withdrawals Queue + Treasury tab)
  it("Admin finance components exist", async () => {
    const wq = await readFile("src/components/admin/AdminWithdrawalsQueue.tsx");
    const tr = await readFile("src/components/casino/AdminTreasuryTab.tsx");
    expect(wq.length).toBeGreaterThan(0);
    expect(tr.length).toBeGreaterThan(0);
  });

  // 6. AdminSecurity component exists
  it("AdminSecurity component exists", async () => {
    const code = await readFile("src/components/admin/AdminSecurity.tsx");
    expect(code).toBeDefined();
  });

  // 7. AdminAnalytics component exists
  it("AdminAnalytics component exists", async () => {
    const code = await readFile("src/components/admin/AdminAnalytics.tsx");
    expect(code).toBeDefined();
  });

  // 8. AdminPromotions component exists
  it("AdminPromotions component exists", async () => {
    const code = await readFile("src/components/admin/AdminPromotions.tsx");
    expect(code).toBeDefined();
  });

  // 9. AdminGeo component exists
  it("AdminGeo component exists", async () => {
    const code = await readFile("src/components/admin/AdminGeo.tsx");
    expect(code).toBeDefined();
  });

  // 10. Admin route exists and the Admin page is gated by AdminPinGate
  it("App.tsx registers /admin and the Admin page is protected by AdminPinGate", async () => {
    const app = await readFile("src/App.tsx");
    expect(app).toContain('path="/admin"');
    const admin = await readFile("src/pages/Admin.tsx");
    expect(admin).toContain("AdminPinGate");
  });

  // 11. Maintenance mode toggle exists in settings
  it("AdminSettings has maintenance_mode toggle", async () => {
    const code = await readFile("src/components/admin/AdminSettings.tsx");
    expect(code).toContain("maintenance_mode");
  });

  // 12. Game enable/disable toggles exist
  it("AdminSettings has game enable toggles", async () => {
    const code = await readFile("src/components/admin/AdminSettings.tsx");
    expect(code).toContain("game_enabled");
  });
});

describe("ADMIN - Edge Functions", () => {
  // 13. verify-admin-pin edge function exists
  it("verify-admin-pin edge function exists", async () => {
    const fs = await import("fs");
    const code = fs.readFileSync("supabase/functions/verify-admin-pin/index.ts", "utf-8");
    expect(code).toContain("admin_login_attempts");
    expect(code).toContain("bcrypt");
  });

  // 14. place-bet edge function exists
  it("place-bet edge function exists", async () => {
    const fs = await import("fs");
    const code = fs.readFileSync("supabase/functions/place-bet/index.ts", "utf-8");
    expect(code).toBeDefined();
  });
});
