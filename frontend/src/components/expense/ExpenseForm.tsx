import { type FormEvent, useState } from "react";

import {
  expenseCategories,
  expenseCategoryLabels,
  paymentStatusLabels,
  type ExpenseCategory,
  type PaymentStatus,
  type TripExpenseInput,
} from "../../types/tripExpense";

type Props = {
  initialValues?: TripExpenseInput;
  submitLabel: string;
  onSubmit: (input: TripExpenseInput) => Promise<boolean>;
  onCancel?: () => void;
};

type FormErrors = {
  description?: string;
  category?: string;
  amount?: string;
  paymentStatus?: string;
  paidAt?: string;
};

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

export const ExpenseForm = ({ initialValues, submitLabel, onSubmit, onCancel }: Props) => {
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [category, setCategory] = useState<ExpenseCategory | "">(initialValues?.category ?? "");
  const [amount, setAmount] = useState(initialValues?.amount.toString() ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">(
    initialValues?.payment_status ?? "unpaid"
  );
  const [paidAt, setPaidAt] = useState(initialValues?.paid_at ?? "");
  const [memo, setMemo] = useState(initialValues?.memo ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!description.trim()) nextErrors.description = "内容を入力してください";
    else if (description.trim().length > 100)
      nextErrors.description = "内容は100文字以内で入力してください";

    if (!category) nextErrors.category = "カテゴリを選択してください";
    if (!amount) nextErrors.amount = "金額を入力してください";
    else if (!/^[1-9]\d{0,8}$/.test(amount)) {
      nextErrors.amount = "金額は1円以上999,999,999円以下の整数で入力してください";
    }
    if (!paymentStatus) nextErrors.paymentStatus = "支払状況を選択してください";
    if (paidAt && !isValidDate(paidAt)) nextErrors.paidAt = "有効な支払日を入力してください";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate() || !category || !paymentStatus) return;

    setIsSubmitting(true);
    await onSubmit({
      description: description.trim(),
      category,
      amount: Number(amount),
      payment_status: paymentStatus,
      paid_at: paidAt || null,
      memo: memo.trim() || null,
    });
    setIsSubmitting(false);
  };

  const inputClassName =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-gray-50 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="expense-description" className="text-sm font-medium text-gray-700">
            内容
            <span className="ml-1 text-xs font-normal text-red-400">*必須</span>
          </label>
          <input
            id="expense-description"
            type="text"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setErrors((previous) => ({ ...previous, description: undefined }));
            }}
            maxLength={100}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? "expense-description-error" : undefined}
            className={inputClassName}
          />
          {errors.description && (
            <p id="expense-description-error" role="alert" className="mt-2 text-sm text-red-600">
              {errors.description}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="expense-category" className="text-sm font-medium text-gray-700">
            カテゴリ
            <span className="ml-1 text-xs font-normal text-red-400">*必須</span>
          </label>
          <select
            id="expense-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as ExpenseCategory | "");
              setErrors((previous) => ({ ...previous, category: undefined }));
            }}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? "expense-category-error" : undefined}
            className={inputClassName}
          >
            <option value="">選択してください</option>
            {expenseCategories.map((item) => (
              <option key={item} value={item}>
                {expenseCategoryLabels[item]}
              </option>
            ))}
          </select>
          {errors.category && (
            <p id="expense-category-error" role="alert" className="mt-2 text-sm text-red-600">
              {errors.category}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="expense-amount" className="text-sm font-medium text-gray-700">
            金額
            <span className="ml-1 text-xs font-normal text-red-400">*必須</span>
          </label>
          <input
            id="expense-amount"
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setErrors((previous) => ({ ...previous, amount: undefined }));
            }}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? "expense-amount-error" : undefined}
            className={inputClassName}
          />
          {errors.amount && (
            <p id="expense-amount-error" role="alert" className="mt-2 text-sm text-red-600">
              {errors.amount}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="expense-payment-status" className="text-sm font-medium text-gray-700">
            支払状況
            <span className="ml-1 text-xs font-normal text-red-400">*必須</span>
          </label>
          <select
            id="expense-payment-status"
            value={paymentStatus}
            onChange={(event) => {
              setPaymentStatus(event.target.value as PaymentStatus | "");
              setErrors((previous) => ({ ...previous, paymentStatus: undefined }));
            }}
            aria-invalid={Boolean(errors.paymentStatus)}
            aria-describedby={errors.paymentStatus ? "expense-payment-status-error" : undefined}
            className={inputClassName}
          >
            <option value="unpaid">{paymentStatusLabels.unpaid}</option>
            <option value="paid">{paymentStatusLabels.paid}</option>
          </select>
          {errors.paymentStatus && (
            <p id="expense-payment-status-error" role="alert" className="mt-2 text-sm text-red-600">
              {errors.paymentStatus}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="expense-paid-at" className="text-sm font-medium text-gray-700">
          支払日
          <span className="ml-1 text-xs font-normal text-gray-400">（任意）</span>
        </label>
        <input
          id="expense-paid-at"
          type="date"
          value={paidAt}
          onChange={(event) => {
            setPaidAt(event.target.value);
            setErrors((previous) => ({ ...previous, paidAt: undefined }));
          }}
          aria-invalid={Boolean(errors.paidAt)}
          aria-describedby={errors.paidAt ? "expense-paid-at-error" : undefined}
          className={inputClassName}
        />
        {errors.paidAt && (
          <p id="expense-paid-at-error" role="alert" className="mt-2 text-sm text-red-600">
            {errors.paidAt}
          </p>
        )}
      </div>

      <label htmlFor="expense-memo" className="mt-4 block text-sm font-medium text-gray-700">
        メモ
        <span className="ml-1 text-xs font-normal text-gray-400">（任意）</span>
      </label>
      <textarea
        id="expense-memo"
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
        maxLength={500}
        rows={3}
        className={`${inputClassName} resize-none`}
      />

      <div className="mt-4 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
};
