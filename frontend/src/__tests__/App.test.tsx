import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const { mockLogout } = vi.hoisted(() => ({ mockLogout: vi.fn() }));

vi.mock("../context/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, email: "test@example.com", created_at: "2026-01-01 00:00:00" },
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: mockLogout,
  }),
}));

import App from "../App";

beforeEach(() => {
  mockLogout.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ backend: "ok", database: "ok" }),
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("アカウントアイコンからメールアドレスとログアウト操作を表示できる", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    await screen.findByRole("button", { name: "アカウントメニューを開く" });
    expect(screen.queryByText("test@example.com")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "アカウントメニューを開く" }));
    expect(screen.getByRole("menu", { name: "アカウントメニュー" })).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "ログアウト" }));
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
