import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";

type TripFormData = {
  title: string;
  startDate: string;
  endDate: string;
  description: string;
};

type TripFormProps = {
  onSuccess: () => void;
  initialValues?: TripFormData;
  mode?: "create" | "edit";
  tripId?: number;
  onDirtyChange?: (isDirty: boolean) => void;
};

type FormErrors = {
  title?: string;
  startDate?: string;
  endDate?: string;
  tripPeriod?: string;
};

const getEndDateMax = (startDate: string) => {
  if (!startDate) return undefined;

  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 13));
  return date.toISOString().slice(0, 10);
};

export const TripForm = ({
  onSuccess,
  initialValues,
  mode = "create",
  tripId,
  onDirtyChange,
}: TripFormProps) => {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [savedValues, setSavedValues] = useState(() => ({
    title: initialValues?.title ?? "",
    startDate: initialValues?.startDate ?? "",
    endDate: initialValues?.endDate ?? "",
    description: initialValues?.description ?? "",
  }));

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isDirty = useMemo(
    () =>
      title !== savedValues.title ||
      startDate !== savedValues.startDate ||
      endDate !== savedValues.endDate ||
      description !== savedValues.description,
    [description, endDate, savedValues, startDate, title]
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const isSaveDisabled = isSubmitting || (mode === "edit" && !isDirty);

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);

    if (e.target.value.trim()) {
      setErrors((prev) => ({
        ...prev,
        title: undefined,
      }));
    }
  };

  const validate = () => {
    const newErrors: FormErrors = {};

    // 入力の有無をチェック
    if (!title.trim()) {
      newErrors.title = "旅行名を入力してください";
    }

    if (!startDate) {
      newErrors.startDate = "開始日を入力してください";
    }

    if (!endDate) {
      newErrors.endDate = "終了日を入力してください";
    }

    // 旅行期間をチェック
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);

      if (end < start) {
        newErrors.tripPeriod = "終了日は開始日以降の日付を設定してください";
      }

      if (end >= start) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24) + 1;

        if (diffDays > 14) {
          newErrors.tripPeriod = "旅行期間は14日間以内に収まるように設定してください";
        }
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const isEditMode = mode === "edit";

      const response = await fetch(isEditMode ? `/api/trips/${tripId}` : "/api/trips", {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          start_date: startDate,
          end_date: endDate,
          description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        console.error("API error:", {
          status: response.status,
          data: errorData,
        });

        throw new Error(
          errorData.message ??
            (isEditMode ? "旅行情報の更新に失敗しました" : "旅行情報の登録に失敗しました")
        );
      }

      setSavedValues({ title, startDate, endDate, description });
      onSuccess();
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError(
          mode === "edit" ? "旅行情報の更新に失敗しました" : "旅行情報の登録に失敗しました"
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
    >
      {/* フォームタイトル */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900">旅行の基本情報</h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          旅行名と日程を入力してください。旅行期間は最大14日間です。
        </p>
      </div>
      <div className="space-y-7">
        {/* 旅行名 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            旅行名
            <span className="ml-1 text-xs font-normal text-red-400">*必須</span>
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="例：秋の京都・大阪旅行"
            aria-describedby={errors.title ? "title-error" : undefined}
            aria-invalid={Boolean(errors.title)}
            className={inputClassName}
          />

          {errors.title && (
            <p id="title-error" role="alert" className="mt-2 text-sm text-red-500">
              {errors.title}
            </p>
          )}
        </div>

        {/* 開始日・終了日 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              開始日
              <span className="ml-1 text-xs font-normal text-red-400">*必須</span>
            </label>

            <input
              id="startDate"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => {
                const nextStartDate = e.target.value;
                setStartDate(nextStartDate);

                if (endDate && nextStartDate && endDate < nextStartDate) {
                  setEndDate("");
                  setErrors((prev) => ({
                    ...prev,
                    endDate: "開始日より前の終了日をクリアしました。終了日を選択してください。",
                    tripPeriod: undefined,
                  }));
                  return;
                }

                if (nextStartDate) {
                  setErrors((prev) => ({
                    ...prev,
                    startDate: undefined,
                    tripPeriod: undefined,
                  }));
                }
              }}
              aria-describedby={
                errors.startDate || errors.tripPeriod
                  ? [
                      errors.startDate && "start-date-error",
                      errors.tripPeriod && "trip-period-error",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : undefined
              }
              aria-invalid={Boolean(errors.startDate || errors.tripPeriod)}
              className={inputClassName}
            />

            {errors.startDate && (
              <p id="start-date-error" role="alert" className="mt-2 text-sm text-red-500">
                {errors.startDate}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              終了日
              <span className="ml-1 text-xs font-normal text-red-400">*必須</span>
            </label>

            <input
              id="endDate"
              type="date"
              value={endDate}
              min={startDate || undefined}
              max={getEndDateMax(startDate)}
              onChange={(e) => {
                setEndDate(e.target.value);

                if (e.target.value) {
                  setErrors((prev) => ({
                    ...prev,
                    endDate: undefined,
                    tripPeriod: undefined,
                  }));
                }
              }}
              aria-describedby={
                errors.endDate || errors.tripPeriod
                  ? [errors.endDate && "end-date-error", errors.tripPeriod && "trip-period-error"]
                      .filter(Boolean)
                      .join(" ")
                  : undefined
              }
              aria-invalid={Boolean(errors.endDate || errors.tripPeriod)}
              className={inputClassName}
            />

            {errors.endDate && (
              <p id="end-date-error" role="alert" className="mt-2 text-sm text-red-500">
                {errors.endDate}
              </p>
            )}
          </div>
        </div>

        {/* 旅行期間エラー */}
        {errors.tripPeriod && (
          <div className="rounded-lg bg-red-50 px-4 py-3">
            <p id="trip-period-error" role="alert" className="text-sm font-medium text-red-600">
              {errors.tripPeriod}
            </p>
          </div>
        )}

        {/* 説明 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            説明
            <span className="ml-1 text-xs font-normal text-gray-400">（任意）</span>
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="行きたい場所や旅行の目的などを入力してください"
            rows={5}
            maxLength={500}
            className={`${inputClassName} resize-none`}
          />

          <div className="mt-2 flex justify-end">
            <span className="text-xs text-gray-400">{description.length} / 500</span>
          </div>
        </div>

        {/* API送信エラー */}
        {submitError && (
          <div className="rounded-lg bg-red-50 px-4 py-3">
            <p
              id="trip-form-submit-error"
              role="alert"
              className="text-sm font-medium text-red-600"
            >
              {submitError}
            </p>
          </div>
        )}
      </div>
      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isSaveDisabled}
        className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? mode === "edit"
            ? "更新中..."
            : "登録中..."
          : mode === "edit"
            ? isDirty
              ? "変更を保存"
              : "変更なし"
            : "旅行を作成"}
      </button>
    </form>
  );
};
