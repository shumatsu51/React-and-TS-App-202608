import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const expensesApi = vi.hoisted(() => ({
  createTripExpense: vi.fn(),
  deleteTripExpense: vi.fn(),
  getTripExpenses: vi.fn(),
  updateTripExpense: vi.fn(),
}));
const tripsApi = vi.hoisted(() => ({ updateTripBudget: vi.fn() }));

vi.mock("../api/tripExpenses", () => expensesApi);
vi.mock("../api/trips", () => tripsApi);

import { ExpenseList } from "../components/expense/ExpenseList";

const summary = {
  budget_amount: 100000,
  total_amount: 82000,
  paid_amount: 50000,
  remaining_budget: 18000,
  category_summaries: [
    { category: "transport" as const, total_amount: 30000, paid_amount: 30000 },
    { category: "accommodation" as const, total_amount: 40000, paid_amount: 20000 },
    { category: "food" as const, total_amount: 12000, paid_amount: 0 },
    { category: "activity" as const, total_amount: 0, paid_amount: 0 },
    { category: "shopping" as const, total_amount: 0, paid_amount: 0 },
    { category: "other" as const, total_amount: 0, paid_amount: 0 },
  ],
  expenses: [
    {
      id: 1,
      trip_id: 10,
      description: "新幹線往復",
      category: "transport" as const,
      amount: 30000,
      payment_status: "paid" as const,
      paid_at: "2026-08-01",
      memo: "指定席",
    },
  ],
};

describe("ExpenseList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    expensesApi.getTripExpenses.mockResolvedValue(summary);
  });

  it("予算、全体・カテゴリ別集計、費用明細を表示する", async () => {
    render(<ExpenseList tripId={10} />);

    await waitFor(() => expect(screen.getByText("新幹線往復")).toBeInTheDocument());
    expect(screen.getByText("予定総額")).toBeInTheDocument();
    expect(screen.getByText("82,000円")).toBeInTheDocument();
    expect(screen.getAllByText("交通")).toHaveLength(2);
    expect(screen.getAllByText("支払済み")).toHaveLength(2);
  });

  it("必須項目が未入力の場合は項目別にエラーを表示する", async () => {
    render(<ExpenseList tripId={10} />);

    await waitFor(() => expect(screen.getByText("新幹線往復")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "+ 費用を追加" }));
    fireEvent.click(screen.getByRole("button", { name: "費用を追加" }));

    expect(screen.getByText("内容を入力してください")).toBeInTheDocument();
    expect(screen.getByText("カテゴリを選択してください")).toBeInTheDocument();
    expect(screen.getByText("金額を入力してください")).toBeInTheDocument();
    expect(screen.getByLabelText(/内容/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/カテゴリ/)).toHaveAttribute(
      "aria-describedby",
      "expense-category-error"
    );
  });

  it("費用を追加すると再取得して集計と明細を更新する", async () => {
    const updatedSummary = {
      ...summary,
      total_amount: 85000,
      expenses: [
        ...summary.expenses,
        {
          id: 2,
          trip_id: 10,
          description: "ホテル代",
          category: "accommodation" as const,
          amount: 3000,
          payment_status: "unpaid" as const,
          paid_at: null,
          memo: null,
        },
      ],
    };
    expensesApi.getTripExpenses
      .mockResolvedValueOnce(summary)
      .mockResolvedValueOnce(updatedSummary);
    expensesApi.createTripExpense.mockResolvedValue(updatedSummary.expenses[1]);
    render(<ExpenseList tripId={10} />);

    await waitFor(() => expect(screen.getByText("新幹線往復")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "+ 費用を追加" }));
    fireEvent.change(screen.getByLabelText(/内容/), { target: { value: "ホテル代" } });
    fireEvent.change(screen.getByLabelText(/カテゴリ/), { target: { value: "accommodation" } });
    fireEvent.change(screen.getByLabelText(/金額/), { target: { value: "3000" } });
    fireEvent.click(screen.getByRole("button", { name: "費用を追加" }));

    await waitFor(() => expect(screen.getByText("ホテル代")).toBeInTheDocument());
    expect(expensesApi.createTripExpense).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ description: "ホテル代", amount: 3000 })
    );
    expect(screen.getByText("85,000円")).toBeInTheDocument();
  });

  it("費用を削除すると確認後に再取得して明細から除外する", async () => {
    const emptySummary = { ...summary, total_amount: 0, paid_amount: 0, expenses: [] };
    expensesApi.getTripExpenses.mockResolvedValueOnce(summary).mockResolvedValueOnce(emptySummary);
    expensesApi.deleteTripExpense.mockResolvedValue(undefined);
    render(<ExpenseList tripId={10} />);

    await waitFor(() => expect(screen.getByText("新幹線往復")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    await waitFor(() => expect(screen.queryByText("新幹線往復")).not.toBeInTheDocument());
    expect(expensesApi.deleteTripExpense).toHaveBeenCalledWith(1);
  });

  it("予算の更新に失敗した場合はエラーを表示する", async () => {
    tripsApi.updateTripBudget.mockRejectedValue(new Error("予算の更新に失敗しました"));
    render(<ExpenseList tripId={10} />);

    await waitFor(() => expect(screen.getByText("新幹線往復")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "予算を編集" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("予算の更新に失敗しました")
    );
  });
});
