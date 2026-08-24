import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import AddNewTripPage from "../pages/AddNewTripPage";

describe("AddNewTripPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("未保存の入力がある状態で戻ろうとすると確認モーダルを表示する", () => {
    const router = createMemoryRouter(
      [
        { path: "/trips/new", element: <AddNewTripPage /> },
        { path: "/trips", element: <p>旅行一覧</p> },
      ],
      { initialEntries: ["/trips/new"] }
    );

    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByLabelText(/旅行名/), { target: { value: "沖縄旅行" } });
    fireEvent.click(screen.getByRole("button", { name: "← 旅行一覧に戻る" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("未保存の変更があります");
  });

  it("旅行作成に成功すると完了モーダルを表示する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const router = createMemoryRouter(
      [
        { path: "/trips/new", element: <AddNewTripPage /> },
        { path: "/trips", element: <p>旅行一覧</p> },
      ],
      { initialEntries: ["/trips/new"] }
    );
    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByLabelText(/旅行名/), { target: { value: "沖縄旅行" } });
    fireEvent.change(screen.getByLabelText(/開始日/), { target: { value: "2026-09-10" } });
    fireEvent.change(screen.getByLabelText(/終了日/), { target: { value: "2026-09-12" } });
    fireEvent.click(screen.getByRole("button", { name: "旅行を作成" }));

    await waitFor(() => expect(screen.getByText("✅旅行情報を登録しました")).toBeInTheDocument());
  });
});
