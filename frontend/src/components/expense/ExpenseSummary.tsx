import { expenseCategoryLabels, type TripExpenseSummary } from "../../types/tripExpense";
import { BudgetForm } from "./BudgetForm";

type Props = {
  summary: TripExpenseSummary;
  onUpdateBudget: (budgetAmount: number | null) => Promise<boolean>;
};

const formatCurrency = (amount: number) => `${amount.toLocaleString()}円`;

export const ExpenseSummary = ({ summary, onUpdateBudget }: Props) => {
  const isOverBudget = summary.remaining_budget !== null && summary.remaining_budget < 0;

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <BudgetForm budgetAmount={summary.budget_amount} onSubmit={onUpdateBudget} />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs font-medium text-gray-500">予定総額</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {formatCurrency(summary.total_amount)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs font-medium text-gray-500">支払済み</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {formatCurrency(summary.paid_amount)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs font-medium text-gray-500">予算残額</p>
          <p
            className={`mt-1 text-lg font-bold ${isOverBudget ? "text-red-600" : "text-gray-900"}`}
          >
            {summary.remaining_budget === null
              ? "予算未設定"
              : formatCurrency(summary.remaining_budget)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-bold text-gray-700">カテゴリ別</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {summary.category_summaries.map((item) => (
            <div
              key={item.category}
              className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
            >
              <span className="text-gray-600">{expenseCategoryLabels[item.category]}</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(item.total_amount)}
                <span className="ml-1 text-xs font-normal text-gray-500">
                  （支払済み {formatCurrency(item.paid_amount)}）
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
