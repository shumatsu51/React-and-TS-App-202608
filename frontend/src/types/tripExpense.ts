import type { TripId } from "./trip";

export const expenseCategories = [
  "transport",
  "accommodation",
  "food",
  "activity",
  "shopping",
  "other",
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  transport: "交通",
  accommodation: "宿泊",
  food: "食事",
  activity: "観光・体験",
  shopping: "買い物",
  other: "その他",
};

export type PaymentStatus = "unpaid" | "paid";

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: "未払い",
  paid: "支払済み",
};

export type TripExpense = {
  id: TripId;
  trip_id: TripId;
  description: string;
  category: ExpenseCategory;
  amount: number;
  payment_status: PaymentStatus;
  paid_at: string | null;
  memo: string | null;
};

export type TripExpenseInput = Omit<TripExpense, "id" | "trip_id">;

export type CategorySummary = {
  category: ExpenseCategory;
  total_amount: number;
  paid_amount: number;
};

export type TripExpenseSummary = {
  budget_amount: number | null;
  total_amount: number;
  paid_amount: number;
  remaining_budget: number | null;
  category_summaries: CategorySummary[];
  expenses: TripExpense[];
};
