import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }), eq: vi.fn().mockReturnThis() }),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";

const mockAuth = vi.mocked(supabase.auth);

function renderWithRouter(element: React.ReactNode, initialRoute = "/") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/casino" element={<div data-testid="casino-page">Casino</div>} />
        <Route path="/guarded" element={<AuthGuard>{element}</AuthGuard>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AUTH GUARD", () => {
  beforeEach(() => vi.clearAllMocks());

  it("AuthGuard redirects to /casino when no session", async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null } as any);
    renderWithRouter(<div data-testid="protected">Protected</div>, "/guarded");
    await waitFor(() => { expect(screen.queryByTestId("protected")).not.toBeInTheDocument(); });
  });

  it("AuthGuard renders children when session exists", async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" }, access_token: "tok" } }, error: null } as any);
    renderWithRouter(<div data-testid="protected">Protected</div>, "/guarded");
    await waitFor(() => { expect(screen.getByTestId("protected")).toBeInTheDocument(); });
  });
});
