import type { TripPlace } from "../types/tripPlace";

const BASE_URL = "/api/trip-places";

export const getTripPlaces = async (tripId: number): Promise<TripPlace[]> => {
  const response = await fetch(`${BASE_URL}/trips/${tripId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("行きたい場所の取得に失敗しました");
  }

  return response.json() as Promise<TripPlace[]>;
};

export const createTripPlace = async (tripId: number, name: string): Promise<TripPlace> => {
  const response = await fetch(`${BASE_URL}/trips/${tripId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error("行きたい場所の追加に失敗しました");
  }

  return response.json() as Promise<TripPlace>;
};

export const updateTripPlace = async (id: number, isVisited: boolean): Promise<void> => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      is_visited: isVisited,
    }),
  });

  if (!response.ok) {
    throw new Error("行きたい場所の更新に失敗しました");
  }
};

export const deleteTripPlace = async (id: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("行きたい場所の削除に失敗しました");
  }
};
