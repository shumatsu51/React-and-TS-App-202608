import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "../types/user";

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
}));

import * as authApi from "../api/auth";
import AuthGate from "../components/AuthGate";
import { AuthProvider } from "../context/AuthProvider";

const mockUser: User = { id: 1, email: "test@example.com", created_at: "2026-01-01 00:00:00" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthGate", () => {
  it("未ログインの場合ログインフォームを表示する", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(null);

    render(
      <AuthProvider>
        <AuthGate>
          <p>protected content</p>
        </AuthGate>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
    });
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("ログイン済みの場合 children を表示する", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <AuthGate>
          <p>protected content</p>
        </AuthGate>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("protected content")).toBeInTheDocument();
    });
    expect(screen.queryByText(mockUser.email)).not.toBeInTheDocument();
  });

  it("ログインに成功すると children を表示する", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce(null);
    vi.mocked(authApi.login).mockResolvedValueOnce(mockUser);

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthGate>
          <p>protected content</p>
        </AuthGate>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("メールアドレス"), "test@example.com");
    await user.type(screen.getByPlaceholderText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("protected content")).toBeInTheDocument();
    });
  });
});
