import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const itineraryApi = vi.hoisted(() => ({
  createItineraryItem: vi.fn(),
  deleteItineraryItem: vi.fn(),
  getItineraryItems: vi.fn(),
  reorderItineraryItems: vi.fn(),
  updateItineraryItem: vi.fn(),
}));
const tripPlacesApi = vi.hoisted(() => ({ getTripPlaces: vi.fn() }));

vi.mock("../api/itineraryItems", () => itineraryApi);
vi.mock("../api/tripPlaces", () => tripPlacesApi);

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
    tripPlacesApi.getTripPlaces.mockResolvedValue([]);
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

  it("場所の変更通知を受けると、旅程フォームの選択肢を再取得する", async () => {
    tripPlacesApi.getTripPlaces
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "place-a", trip_id: 10, name: "清水寺", is_visited: false }]);
    const { rerender } = render(
      <ItineraryList
        tripId={10}
        tripStartDate="2026-08-20"
        tripEndDate="2026-08-21"
        placesVersion={0}
      />
    );

    await waitFor(() => expect(screen.getByText("清水寺")).toBeInTheDocument());
    rerender(
      <ItineraryList
        tripId={10}
        tripStartDate="2026-08-20"
        tripEndDate="2026-08-21"
        placesVersion={1}
      />
    );

    await waitFor(() => expect(tripPlacesApi.getTripPlaces).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "+ 予定を追加" }));
    expect(screen.getByRole("option", { name: "清水寺" })).toBeInTheDocument();
  });

  it("同じ日の時間帯が重なる旅程を追加できない", async () => {
    render(<ItineraryList tripId={10} tripStartDate="2026-08-20" tripEndDate="2026-08-21" />);

    await waitFor(() => expect(screen.getByText("清水寺")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "+ 予定を追加" }));
    fireEvent.change(screen.getByLabelText("開始時刻（任意）"), { target: { value: "09:30" } });
    fireEvent.change(screen.getByLabelText("終了時刻（任意）"), { target: { value: "10:30" } });
    fireEvent.change(screen.getByLabelText("場所名"), { target: { value: "八坂神社" } });
    fireEvent.click(screen.getByRole("button", { name: "予定を追加" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "同じ時間帯の旅程があります。時刻を変更してください。"
      )
    );
    expect(itineraryApi.createItineraryItem).not.toHaveBeenCalled();
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

  it("予定を上下に移動して手動の表示順を保存できる", async () => {
    const secondItem = { ...existingItem, id: 2, place_name: "八坂神社", sort_order: 2 };
    itineraryApi.getItineraryItems.mockResolvedValue([existingItem, secondItem]);
    itineraryApi.reorderItineraryItems.mockResolvedValue(undefined);
    render(<ItineraryList tripId={10} tripStartDate="2026-08-20" tripEndDate="2026-08-21" />);

    await waitFor(() => expect(screen.getByText("八坂神社")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "八坂神社を上へ移動" }));

    await waitFor(() => {
      expect(itineraryApi.reorderItineraryItems).toHaveBeenCalledWith(10, "2026-08-20", [2, 1]);
    });
    const places = screen
      .getAllByRole("heading", { level: 4 })
      .map((heading) => heading.textContent);
    expect(places).toEqual(["八坂神社", "清水寺"]);
    expect(screen.getByRole("button", { name: "八坂神社を上へ移動" })).toBeDisabled();
  });

  it("並び替えに失敗した場合は順序を変えずエラーを表示する", async () => {
    const secondItem = { ...existingItem, id: 2, place_name: "八坂神社", sort_order: 2 };
    itineraryApi.getItineraryItems.mockResolvedValue([existingItem, secondItem]);
    itineraryApi.reorderItineraryItems.mockRejectedValue(new Error("並び替えに失敗しました"));
    render(<ItineraryList tripId={10} tripStartDate="2026-08-20" tripEndDate="2026-08-21" />);

    await waitFor(() => expect(screen.getByText("八坂神社")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "八坂神社を上へ移動" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("並び替えに失敗しました")
    );
    const places = screen
      .getAllByRole("heading", { level: 4 })
      .map((heading) => heading.textContent);
    expect(places).toEqual(["清水寺", "八坂神社"]);
  });

  it("予定を削除すると確認後に一覧から除外する", async () => {
    itineraryApi.deleteItineraryItem.mockResolvedValue(undefined);
    render(<ItineraryList tripId={10} tripStartDate="2026-08-20" tripEndDate="2026-08-21" />);

    await waitFor(() => expect(screen.getByText("清水寺")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    await waitFor(() => expect(screen.queryByText("清水寺")).not.toBeInTheDocument());
    expect(itineraryApi.deleteItineraryItem).toHaveBeenCalledWith(10, 1);
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
