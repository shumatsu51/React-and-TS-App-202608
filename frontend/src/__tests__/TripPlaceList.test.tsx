import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const tripPlacesApi = vi.hoisted(() => ({
  createTripPlace: vi.fn(),
  deleteTripPlace: vi.fn(),
  getTripPlaces: vi.fn(),
  updateTripPlace: vi.fn(),
}));

vi.mock("../api/tripPlaces", () => tripPlacesApi);

import { TripPlaceList } from "../components/trip-place/TripPlaceList";

const places = [
  { id: 1, trip_id: 10, name: "清水寺", is_visited: true },
  { id: 2, trip_id: 10, name: "錦市場", is_visited: false },
];

describe("TripPlaceList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tripPlacesApi.getTripPlaces.mockResolvedValue(places);
  });

  it("訪問済み数と総数を表示し、訪問状態の変更後に更新する", async () => {
    tripPlacesApi.updateTripPlace.mockResolvedValue(undefined);
    render(<TripPlaceList tripId={10} />);

    await waitFor(() => expect(screen.getByText("1 / 2件訪問済み")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("checkbox", { name: "錦市場" }));

    await waitFor(() => expect(screen.getByText("2 / 2件訪問済み")).toBeInTheDocument());
  });

  it("登録場所がない場合は 0 / 0件訪問済みと表示する", async () => {
    tripPlacesApi.getTripPlaces.mockResolvedValue([]);
    render(<TripPlaceList tripId={10} />);

    await waitFor(() => expect(screen.getByText("0 / 0件訪問済み")).toBeInTheDocument());
  });
});
