import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const itineraryApi = vi.hoisted(() => ({
  createItineraryItem: vi.fn(),
  deleteItineraryItem: vi.fn(),
  getItineraryItems: vi.fn(),
  updateItineraryItem: vi.fn(),
}));

vi.mock("../api/itineraryItems", () => itineraryApi);
vi.mock("../api/tripPlaces", () => ({ getTripPlaces: vi.fn().mockResolvedValue([]) }));

import { ItineraryList } from "../components/itinerary/ItineraryList";

const existingItem = {
  id: 1,
  trip_id: 10,
  scheduled_date: "2026-08-20",
  start_time: "09:00:00",
  end_time: "10:00:00",
  place_name: "清水寺",
  trip_place_id: null,
  memo: "朝に訪問する",
  sort_order: 1,
};

describe("ItineraryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    itineraryApi.getItineraryItems.mockResolvedValue([existingItem]);
  });

  it("日付ごとに旅程を表示する", async () => {
    render(<ItineraryList tripId={10} tripStartDate="2026-08-20" tripEndDate="2026-08-21" />);

    await waitFor(() => {
      expect(screen.getByText("清水寺")).toBeInTheDocument();
    });
    expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument();
    expect(screen.getByText("予定はありません。")).toBeInTheDocument();
  });

  it("予定を追加すると一覧へ反映する", async () => {
    const createdItem = {
      ...existingItem,
      id: 2,
      place_name: "錦市場",
      start_time: null,
      end_time: null,
    };
    itineraryApi.createItineraryItem.mockResolvedValue(createdItem);
    render(<ItineraryList tripId={10} tripStartDate="2026-08-20" tripEndDate="2026-08-21" />);

    await waitFor(() => {
      expect(screen.getByText("清水寺")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "+ 予定を追加" }));
    fireEvent.change(screen.getByLabelText("場所名"), { target: { value: "錦市場" } });
    fireEvent.click(screen.getByRole("button", { name: "予定を追加" }));

    await waitFor(() => {
      expect(screen.getByText("錦市場")).toBeInTheDocument();
    });
    expect(itineraryApi.createItineraryItem).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ place_name: "錦市場" })
    );
  });

  it("予定を編集すると表示内容を更新する", async () => {
    itineraryApi.updateItineraryItem.mockResolvedValue({ ...existingItem, place_name: "八坂神社" });
    render(<ItineraryList tripId={10} tripStartDate="2026-08-20" tripEndDate="2026-08-21" />);

    await waitFor(() => expect(screen.getByText("清水寺")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    fireEvent.change(screen.getByLabelText("場所名"), { target: { value: "八坂神社" } });
    fireEvent.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => expect(screen.getByText("八坂神社")).toBeInTheDocument());
  });

  it("予定を削除すると確認後に一覧から除外する", async () => {
    itineraryApi.deleteItineraryItem.mockResolvedValue(undefined);
    render(<ItineraryList tripId={10} tripStartDate="2026-08-20" tripEndDate="2026-08-21" />);

    await waitFor(() => expect(screen.getByText("清水寺")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    await waitFor(() => expect(screen.queryByText("清水寺")).not.toBeInTheDocument());
    expect(itineraryApi.deleteItineraryItem).toHaveBeenCalledWith(1);
  });

  it("旅程取得に失敗した場合、再試行できる", async () => {
    itineraryApi.getItineraryItems.mockRejectedValueOnce(new Error("network error"));
    render(<ItineraryList tripId={10} tripStartDate="2026-08-20" tripEndDate="2026-08-21" />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("旅程を取得できませんでした")
    );
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    await waitFor(() => expect(screen.getByText("清水寺")).toBeInTheDocument());
  });
});
