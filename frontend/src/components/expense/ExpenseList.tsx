import { useCallback, useEffect, useState } from "react";

import { updateTripBudget } from "../../api/trips";
import {
  createTripExpense,
  deleteTripExpense,
  getTripExpenses,
  updateTripExpense,
} from "../../api/tripExpenses";
import type { TripExpense, TripExpenseInput, TripExpenseSummary } from "../../types/tripExpense";
import type { TripId } from "../../types/trip";
import { ConfirmModal } from "../common/ConfirmModal";
import { ErrorState } from "../common/ErrorState";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseItem } from "./ExpenseItem";
import { ExpenseSummary } from "./ExpenseSummary";

type Props = {
  tripId: TripId;
};

export const ExpenseList = ({ tripId }: Props) => {
  const [summary, setSummary] = useState<TripExpenseSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<TripExpense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await getTripExpenses(tripId);
      setSummary(data);
    } catch (error) {
      console.error(error);
      setFetchError("費用情報を取得できませんでした");
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    // Fetch updates state after the request resolves; this function is also reused by retry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchExpenses();
  }, [fetchExpenses]);

  const refreshExpenses = async () => {
    const data = await getTripExpenses(tripId);
    setSummary(data);
  };

  const handleBudgetUpdate = async (budgetAmount: number | null) => {
    try {
      setActionError(null);
      await updateTripBudget(tripId, budgetAmount);
      await refreshExpenses();
      return true;
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "予算の更新に失敗しました");
      return false;
    }
  };

  const handleCreate = async (input: TripExpenseInput) => {
    try {
      setActionError(null);
      await createTripExpense(tripId, input);
      await refreshExpenses();
      setIsAddFormOpen(false);
      return true;
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "費用の追加に失敗しました");
      return false;
    }
  };

  const handleUpdate = async (expenseId: number, input: TripExpenseInput) => {
    try {
      setActionError(null);
      await updateTripExpense(expenseId, input);
      await refreshExpenses();
      return true;
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "費用の更新に失敗しました");
      return false;
    }
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;

    try {
      setIsDeleting(true);
      setActionError(null);
      await deleteTripExpense(expenseToDelete.id);
      await refreshExpenses();
      setExpenseToDelete(null);
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "費用の削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <p className="mt-6 text-sm text-gray-500">費用情報を読み込み中...</p>;

  if (fetchError || !summary) {
    return (
      <ErrorState
        message={fetchError ?? "費用情報を取得できませんでした"}
        onRetry={() => {
          setIsLoading(true);
          setFetchError(null);
          void fetchExpenses();
        }}
      />
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">費用・予算</h2>
          <p className="mt-1 text-sm text-gray-500">旅行の予算と支出をまとめて確認できます。</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddFormOpen((open) => !open)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
        >
          {isAddFormOpen ? "追加を閉じる" : "+ 費用を追加"}
        </button>
      </div>

      <div className="mt-5">
        <ExpenseSummary summary={summary} onUpdateBudget={handleBudgetUpdate} />
      </div>

      {isAddFormOpen && (
        <div className="mt-5">
          <ExpenseForm
            submitLabel="費用を追加"
            onCancel={() => setIsAddFormOpen(false)}
            onSubmit={handleCreate}
          />
        </div>
      )}

      {actionError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-bold text-gray-700">費用明細</h3>
        {summary.expenses.length === 0 ? (
          <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            まだ費用が登録されていません。
          </p>
        ) : (
          summary.expenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onUpdate={handleUpdate}
              onDelete={setExpenseToDelete}
            />
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={expenseToDelete !== null}
        title="費用の削除"
        message={`「${expenseToDelete?.description ?? ""}」を削除します。よろしいですか？`}
        onConfirm={handleDelete}
        onCancel={() => setExpenseToDelete(null)}
        isLoading={isDeleting}
        error={null}
      />
    </section>
  );
};
