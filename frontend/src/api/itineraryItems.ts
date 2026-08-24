import type { ItineraryItem, ItineraryItemInput } from "../types/itineraryItem";

const BASE_URL = "/api/itinerary-items";

const getErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? fallback;
  } catch {
    return fallback;
  }
};

export const getItineraryItems = async (tripId: number): Promise<ItineraryItem[]> => {
  const response = await fetch(`${BASE_URL}/trips/${tripId}`, { credentials: "include" });
  if (!response.ok) throw new Error(await getErrorMessage(response, "旅程の取得に失敗しました"));
  return response.json() as Promise<ItineraryItem[]>;
};

export const createItineraryItem = async (
  tripId: number,
  input: ItineraryItemInput
): Promise<ItineraryItem> => {
  const response = await fetch(`${BASE_URL}/trips/${tripId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "旅程の追加に失敗しました"));
  return response.json() as Promise<ItineraryItem>;
};

export const updateItineraryItem = async (
  itemId: number,
  input: ItineraryItemInput
): Promise<ItineraryItem> => {
  const response = await fetch(`${BASE_URL}/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "旅程の更新に失敗しました"));
  return response.json() as Promise<ItineraryItem>;
};

export const deleteItineraryItem = async (itemId: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/${itemId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "旅程の削除に失敗しました"));
};
