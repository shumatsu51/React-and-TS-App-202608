import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../context/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, email: "test@example.com", created_at: "2026-01-01 00:00:00" },
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

import App from "../App";

describe("App", () => {
  it("ログイン中のユーザーのメールアドレスを表示する", () => {
    render(<App />);
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });
});
