import type { Trip } from "../types/trip";

const BASE_URL = "/api/trips";

export const getTrips = async (): Promise<Trip[]> => {
  const response = await fetch(BASE_URL, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("旅行一覧の取得に失敗しました");
  }

  return response.json() as Promise<Trip[]>;
};

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

export const updateTripBudget = async (id: number, budgetAmount: number | null): Promise<void> => {
  const response = await fetch(`${BASE_URL}/${id}/budget`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ budget_amount: budgetAmount }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "予算の更新に失敗しました");
  }
};
