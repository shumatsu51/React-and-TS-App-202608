import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const tripsApi = vi.hoisted(() => ({ getTrip: vi.fn() }));
vi.mock("../api/trips", () => tripsApi);

import EditTripPage from "../pages/EditTripPage";

const trip = {
  id: 1,
  user_id: 1,
  title: "京都旅行",
  start_date: "2026-08-20",
  end_date: "2026-08-22",
  description: "夏休みの旅行",
};

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: "/trips/:id/edit", element: <EditTripPage /> },
      { path: "/trips/:id", element: <p>旅行詳細</p> },
    ],
    { initialEntries: ["/trips/1/edit"] }
  );
  render(<RouterProvider router={router} />);
};

describe("EditTripPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tripsApi.getTrip.mockResolvedValue(trip);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("取得した旅行情報をフォームの初期値として表示する", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByLabelText(/旅行名/)).toHaveValue("京都旅行"));
    expect(screen.getByLabelText(/開始日/)).toHaveValue("2026-08-20");
    expect(screen.getByLabelText(/終了日/)).toHaveValue("2026-08-22");
  });

  it("取得失敗後に再試行できる", async () => {
    tripsApi.getTrip.mockRejectedValueOnce(new Error("network error"));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("旅行情報を取得できませんでした")
    );
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    await waitFor(() => expect(screen.getByLabelText(/旅行名/)).toHaveValue("京都旅行"));
  });

  it("更新成功後に完了モーダルを表示する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    renderPage();

    await waitFor(() => expect(screen.getByLabelText(/旅行名/)).toHaveValue("京都旅行"));
    fireEvent.change(screen.getByLabelText(/旅行名/), { target: { value: "秋の京都旅行" } });
    fireEvent.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => expect(screen.getByText("✅旅行情報を更新しました")).toBeInTheDocument());
  });

  it("未保存の変更がある場合、詳細へ戻る前に確認する", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByLabelText(/旅行名/)).toHaveValue("京都旅行"));
    fireEvent.change(screen.getByLabelText(/旅行名/), { target: { value: "秋の京都旅行" } });
    fireEvent.click(screen.getByRole("button", { name: "← 旅行詳細に戻る" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("未保存の変更があります");
  });

  it("旅行期間外になる旅程がある場合、APIの409メッセージを表示する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          message: "旅行期間外になる旅程があります。先に旅程の日付を変更または削除してください",
        }),
      })
    );
    renderPage();

    await waitFor(() => expect(screen.getByLabelText(/旅行名/)).toHaveValue("京都旅行"));
    fireEvent.change(screen.getByLabelText(/旅行名/), { target: { value: "秋の京都旅行" } });
    fireEvent.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "旅行期間外になる旅程があります。先に旅程の日付を変更または削除してください"
        )
      ).toBeInTheDocument();
    });
  });
});
