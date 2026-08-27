import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "../lib/firebase";
import {
  expenseCategories,
  type ExpenseCategory,
  type TripExpense,
  type TripExpenseInput,
  type TripExpenseSummary,
} from "../types/tripExpense";
import type { TripId } from "../types/trip";

const BASE_URL = "/api/trip-expenses";
const usesFirebaseData = import.meta.env.VITE_AUTH_PROVIDER === "firebase";

const getFirebaseUserId = () => {
  const userId = getFirebaseAuth().currentUser?.uid;
  if (!userId) throw new Error("ログイン状態を確認できませんでした");
  return userId;
};

const getTripReference = (userId: string, tripId: TripId) =>
  doc(getFirebaseFirestore(), "users", userId, "trips", String(tripId));

type FirestoreExpense = {
  description: string;
  category: ExpenseCategory;
  amount: number;
  paymentStatus: "unpaid" | "paid";
  paidAt: string | null;
  memo: string | null;
};

const toExpense = (id: string, tripId: TripId, data: FirestoreExpense): TripExpense => ({
  id,
  trip_id: tripId,
  description: data.description,
  category: data.category,
  amount: data.amount,
  payment_status: data.paymentStatus,
  paid_at: data.paidAt,
  memo: data.memo,
});

const firebaseExpenseData = (input: TripExpenseInput) => ({
  description: input.description.trim(),
  category: input.category,
  amount: input.amount,
  paymentStatus: input.payment_status,
  paidAt: input.paid_at,
  memo: input.memo?.trim() || null,
});

const createSummary = (
  budgetAmount: number | null,
  expenses: TripExpense[]
): TripExpenseSummary => {
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paidAmount = expenses
    .filter((expense) => expense.payment_status === "paid")
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    budget_amount: budgetAmount,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    remaining_budget: budgetAmount === null ? null : budgetAmount - totalAmount,
    category_summaries: expenseCategories.map((category) => {
      const categoryExpenses = expenses.filter((expense) => expense.category === category);
      return {
        category,
        total_amount: categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0),
        paid_amount: categoryExpenses
          .filter((expense) => expense.payment_status === "paid")
          .reduce((sum, expense) => sum + expense.amount, 0),
      };
    }),
    expenses: [...expenses].sort((first, second) =>
      String(first.id).localeCompare(String(second.id))
    ),
  };
};

const getErrorMessage = async (response: Response, fallback: string) => {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
};

export const getTripExpenses = async (tripId: TripId): Promise<TripExpenseSummary> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    const tripReference = getTripReference(userId, tripId);
    const [tripSnapshot, expenseSnapshot] = await Promise.all([
      getDoc(tripReference),
      getDocs(collection(tripReference, "expenses")),
    ]);
    if (!tripSnapshot.exists()) throw new Error("旅行情報が見つかりません");
    const tripData = tripSnapshot.data() as { budgetAmount: number | null };
    const expenses = expenseSnapshot.docs.map((expense) =>
      toExpense(expense.id, tripId, expense.data() as FirestoreExpense)
    );
    return createSummary(tripData.budgetAmount, expenses);
  }

  const response = await fetch(`${BASE_URL}/trips/${tripId}`, { credentials: "include" });
  if (!response.ok)
    throw new Error(await getErrorMessage(response, "費用情報の取得に失敗しました"));
  return response.json() as Promise<TripExpenseSummary>;
};

export const createTripExpense = async (
  tripId: TripId,
  input: TripExpenseInput
): Promise<TripExpense> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    const data = firebaseExpenseData(input);
    const reference = await addDoc(collection(getTripReference(userId, tripId), "expenses"), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return toExpense(reference.id, tripId, data);
  }

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
  tripId: TripId,
  expenseId: TripId,
  input: TripExpenseInput
): Promise<TripExpense> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    const data = firebaseExpenseData(input);
    await updateDoc(doc(getTripReference(userId, tripId), "expenses", String(expenseId)), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return toExpense(String(expenseId), tripId, data);
  }

  const response = await fetch(`${BASE_URL}/${expenseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "費用の更新に失敗しました"));
  return response.json() as Promise<TripExpense>;
};

export const deleteTripExpense = async (tripId: TripId, expenseId: TripId): Promise<void> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    await deleteDoc(doc(getTripReference(userId, tripId), "expenses", String(expenseId)));
    return;
  }

  const response = await fetch(`${BASE_URL}/${expenseId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "費用の削除に失敗しました"));
};
