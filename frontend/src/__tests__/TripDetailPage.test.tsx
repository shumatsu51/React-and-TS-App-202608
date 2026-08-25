import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const tripsApi = vi.hoisted(() => ({ getTrip: vi.fn(), deleteTrip: vi.fn() }));

vi.mock("../api/trips", () => tripsApi);
vi.mock("../components/trip-place/TripPlaceList", () => ({
  TripPlaceList: ({ tripId }: { tripId: number }) => <p>行きたい場所: {tripId}</p>,
}));
vi.mock("../components/itinerary/ItineraryList", () => ({
  ItineraryList: ({
    tripId,
    tripStartDate,
    tripEndDate,
  }: {
    tripId: number;
    tripStartDate: string;
    tripEndDate: string;
  }) => (
    <p>
      旅程: {tripId} / {tripStartDate} - {tripEndDate}
    </p>
  ),
}));

import TripDetailPage from "../pages/TripDetailPage";

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
      { path: "/trips/:id", element: <TripDetailPage /> },
      { path: "/trips", element: <p>旅行一覧</p> },
    ],
    { initialEntries: ["/trips/1"] }
  );
  render(<RouterProvider router={router} />);
};

describe("TripDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tripsApi.getTrip.mockResolvedValue(trip);
  });

  it("旅行詳細と行きたい場所・旅程を統合表示する", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("京都旅行")).toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1, name: "旅行の詳細" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← 旅行一覧" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 }).closest("div.sticky")).toHaveClass(
      "top-24"
    );
    expect(screen.getByText("夏休みの旅行")).toBeInTheDocument();
    expect(screen.getByText("行きたい場所: 1")).toBeInTheDocument();
    expect(screen.getByText("旅程: 1 / 2026-08-20 - 2026-08-22")).toBeInTheDocument();
  });

  it("取得失敗後に再試行できる", async () => {
    tripsApi.getTrip.mockRejectedValueOnce(new Error("network error"));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("旅行情報を取得できませんでした")
    );
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    await waitFor(() => expect(screen.getByText("京都旅行")).toBeInTheDocument());
  });

  it("削除成功後に完了モーダルを表示する", async () => {
    tripsApi.deleteTrip.mockResolvedValue(undefined);
    renderPage();

    await waitFor(() => expect(screen.getByText("京都旅行")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "旅行を削除" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    await waitFor(() => expect(screen.getByText("☑️旅行を削除しました")).toBeInTheDocument());
    expect(tripsApi.deleteTrip).toHaveBeenCalledWith(1);
  });
});
