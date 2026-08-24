import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TripListPage, { type Trip } from "../pages/TripListPage";

const trips: Trip[] = [
  {
    id: 1,
    user_id: 1,
    title: "北海道旅行",
    start_date: "2026-09-10",
    end_date: "2026-09-12",
    description: null,
  },
  {
    id: 2,
    user_id: 1,
    title: "沖縄旅行",
    start_date: "2026-08-23",
    end_date: "2026-08-25",
    description: null,
  },
  {
    id: 3,
    user_id: 1,
    title: "京都旅行",
    start_date: "2026-07-01",
    end_date: "2026-07-03",
    description: null,
  },
];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-08-24T12:00:00"));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => trips,
    })
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <TripListPage />
    </MemoryRouter>
  );

describe("TripListPage", () => {
  it("選択したステータスに該当する旅行だけを表示する", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    });
    expect(screen.getByText("沖縄旅行")).toBeInTheDocument();
    expect(screen.getByText("京都旅行")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "準備中" }));
    expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    expect(screen.queryByText("沖縄旅行")).not.toBeInTheDocument();
    expect(screen.queryByText("京都旅行")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "旅行中" }));
    expect(screen.queryByText("北海道旅行")).not.toBeInTheDocument();
    expect(screen.getByText("沖縄旅行")).toBeInTheDocument();
    expect(screen.queryByText("京都旅行")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "終了済み" }));
    expect(screen.queryByText("北海道旅行")).not.toBeInTheDocument();
    expect(screen.queryByText("沖縄旅行")).not.toBeInTheDocument();
    expect(screen.getByText("京都旅行")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "全て" }));
    expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    expect(screen.getByText("沖縄旅行")).toBeInTheDocument();
    expect(screen.getByText("京都旅行")).toBeInTheDocument();
  });

  it("選択したステータスに旅行がない場合は空状態を表示する", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [trips[0]],
    } as Response);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "終了済み" }));
    expect(screen.getByText("該当する旅行はありません")).toBeInTheDocument();
  });

  it("取得失敗後に再試行すると旅行一覧を表示する", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => trips,
      } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("旅行一覧を取得できませんでした");
    });

    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    await waitFor(() => {
      expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
