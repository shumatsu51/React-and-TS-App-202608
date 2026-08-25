import type { TripExpense, TripExpenseInput, TripExpenseSummary } from "../types/tripExpense";

const BASE_URL = "/api/trip-expenses";

const getErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? fallback;
  } catch {
    return fallback;
  }
};

export const getTripExpenses = async (tripId: number): Promise<TripExpenseSummary> => {
  const response = await fetch(`${BASE_URL}/trips/${tripId}`, { credentials: "include" });
  if (!response.ok)
    throw new Error(await getErrorMessage(response, "費用情報の取得に失敗しました"));
  return response.json() as Promise<TripExpenseSummary>;
};

export const createTripExpense = async (
  tripId: number,
  input: TripExpenseInput
): Promise<TripExpense> => {
  const response = await fetch(`${BASE_URL}/trips/${tripId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "費用の追加に失敗しました"));
  return response.json() as Promise<TripExpense>;
};

export const updateTripExpense = async (
  expenseId: number,
  input: TripExpenseInput
): Promise<TripExpense> => {
  const response = await fetch(`${BASE_URL}/${expenseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "費用の更新に失敗しました"));
  return response.json() as Promise<TripExpense>;
};

export const deleteTripExpense = async (expenseId: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/${expenseId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "費用の削除に失敗しました"));
};
