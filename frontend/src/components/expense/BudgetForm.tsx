import { type FormEvent, useState } from "react";

type Props = {
  budgetAmount: number | null;
  onSubmit: (budgetAmount: number | null) => Promise<boolean>;
};

export const BudgetForm = ({ budgetAmount, onSubmit }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(budgetAmount?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (amount && !/^[1-9]\d{0,8}$/.test(amount)) {
      setError("予算は1円以上999,999,999円以下の整数で入力してください");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const isSuccess = await onSubmit(amount ? Number(amount) : null);
    setIsSubmitting(false);

    if (isSuccess) setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          予算：
          <span className="font-bold text-gray-900">
            {budgetAmount === null ? "未設定" : `${budgetAmount.toLocaleString()}円`}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {budgetAmount === null ? "予算を設定" : "予算を編集"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-gray-50 p-3">
      <label htmlFor="trip-budget" className="text-sm font-medium text-gray-700">
        旅行予算
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="trip-budget"
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError(null);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "trip-budget-error" : undefined}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? "保存中..." : "保存"}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500">空欄で保存すると予算を未設定に戻せます。</p>
      {error && (
        <p id="trip-budget-error" role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setAmount(budgetAmount?.toString() ?? "");
          setError(null);
          setIsEditing(false);
        }}
        disabled={isSubmitting}
        className="mt-2 text-sm text-gray-500 hover:text-gray-900"
      >
        キャンセル
      </button>
    </form>
  );
};
