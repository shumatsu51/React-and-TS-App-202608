import { Trip } from "../pages/TripListPage";

const BASE_URL = "/api/trips";

export const getTrip = async (id: number): Promise<Trip> => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("旅行情報の取得に失敗しました");
  }

  return response.json() as Promise<Trip>;
};

export const deleteTrip = async (id: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("旅行の削除に失敗しました");
  }
};
