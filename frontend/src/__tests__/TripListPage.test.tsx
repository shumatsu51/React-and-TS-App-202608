import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TripListPage from "../pages/TripListPage";
import type { Trip } from "../types/trip";

const trips: Trip[] = [
  {
    id: 1,
    user_id: 1,
    title: "北海道旅行",
    start_date: "2026-09-10",
    end_date: "2026-09-12",
    description: "札幌と小樽を巡る旅行",
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
    description: "寺社を巡る夏休み旅行",
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
  it("ステータスごとの件数を表示し、全てでは優先順位順に旅行を表示する", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "全て" })).toHaveTextContent("全て（3）");
    expect(screen.getByRole("button", { name: "準備中" })).toHaveTextContent("準備中（1）");
    expect(screen.getByRole("button", { name: "旅行中" })).toHaveTextContent("旅行中（1）");
    expect(screen.getByRole("button", { name: "終了済み" })).toHaveTextContent("終了済み（1）");

    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "沖縄旅行",
      "北海道旅行",
      "京都旅行",
    ]);
  });

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

  it("旅行名と説明文をキーワードで検索できる", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    });

    const searchInput = screen.getByRole("searchbox", { name: "キーワードで旅行を検索" });
    fireEvent.change(searchInput, { target: { value: "沖縄" } });
    expect(screen.queryByText("北海道旅行")).not.toBeInTheDocument();
    expect(screen.getByText("沖縄旅行")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "寺社" } });
    expect(screen.queryByText("北海道旅行")).not.toBeInTheDocument();
    expect(screen.queryByText("沖縄旅行")).not.toBeInTheDocument();
    expect(screen.getByText("京都旅行")).toBeInTheDocument();
  });

  it("キーワード検索に合わせてステータスごとの件数を更新する", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "キーワードで旅行を検索" }), {
      target: { value: "旅行" },
    });

    expect(screen.getByRole("button", { name: "全て" })).toHaveTextContent("全て（3）");
    expect(screen.getByRole("button", { name: "準備中" })).toHaveTextContent("準備中（1）");
    expect(screen.getByRole("button", { name: "旅行中" })).toHaveTextContent("旅行中（1）");
    expect(screen.getByRole("button", { name: "終了済み" })).toHaveTextContent("終了済み（1）");

    fireEvent.change(screen.getByRole("searchbox", { name: "キーワードで旅行を検索" }), {
      target: { value: "寺社" },
    });

    expect(screen.getByRole("button", { name: "全て" })).toHaveTextContent("全て（1）");
    expect(screen.getByRole("button", { name: "準備中" })).toHaveTextContent("準備中（0）");
    expect(screen.getByRole("button", { name: "旅行中" })).toHaveTextContent("旅行中（0）");
    expect(screen.getByRole("button", { name: "終了済み" })).toHaveTextContent("終了済み（1）");
  });

  it("キーワード検索とステータス絞り込みを組み合わせられる", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "キーワードで旅行を検索" }), {
      target: { value: "旅行" },
    });
    fireEvent.click(screen.getByRole("button", { name: "準備中" }));

    expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    expect(screen.queryByText("沖縄旅行")).not.toBeInTheDocument();
    expect(screen.queryByText("京都旅行")).not.toBeInTheDocument();
  });

  it("キーワード検索で該当する旅行がない場合は空状態を表示する", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("北海道旅行")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "キーワードで旅行を検索" }), {
      target: { value: "該当なし" },
    });

    expect(screen.getByText("該当する旅行はありません")).toBeInTheDocument();
    expect(screen.getByText("検索キーワードまたはステータスを変更してください。")).toBeInTheDocument();
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
