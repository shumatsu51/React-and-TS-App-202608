import { useState } from "react";

import {
  expenseCategoryLabels,
  paymentStatusLabels,
  type TripExpense,
  type TripExpenseInput,
} from "../../types/tripExpense";
import { ExpenseForm } from "./ExpenseForm";
import type { TripId } from "../../types/trip";

type Props = {
  expense: TripExpense;
  onUpdate: (id: TripId, input: TripExpenseInput) => Promise<boolean>;
  onDelete: (expense: TripExpense) => void;
};

export const ExpenseItem = ({ expense, onUpdate, onDelete }: Props) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <ExpenseForm
        initialValues={expense}
        submitLabel="変更を保存"
        onCancel={() => setIsEditing(false)}
        onSubmit={async (input) => {
          const isSuccess = await onUpdate(expense.id, input);
          if (isSuccess) setIsEditing(false);
          return isSuccess;
        }}
      />
    );
  }

  return (
    <article className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
            {expenseCategoryLabels[expense.category]}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              expense.payment_status === "paid"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {paymentStatusLabels[expense.payment_status]}
          </span>
          {expense.paid_at && <span className="text-xs text-gray-500">{expense.paid_at}</span>}
        </div>
        <h4 className="mt-2 font-semibold text-gray-900">{expense.description}</h4>
        {expense.memo && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{expense.memo}</p>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-3">
        <p className="font-bold text-gray-900">{expense.amount.toLocaleString()}円</p>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-gray-500 hover:text-gray-900"
          >
            編集
          </button>
          <button
            type="button"
            onClick={() => onDelete(expense)}
            className="text-red-500 hover:text-red-700"
          >
            削除
          </button>
        </div>
      </div>
    </article>
  );
};
