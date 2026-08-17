import { type ChangeEvent, type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

type FormErrors = {
  title?: string;
  startDate?: string;
  endDate?: string;
  tripPeriod?: string;
};

export const TripForm = () => {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  // const [isSubmitting, setIsSubmitting] = useState(false);
  // const [submitError, setSubmitError] = useState<string | null>(null);

  const navigate = useNavigate();

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
      newErrors.title = "項目を入力してください";
    }

    if (!startDate) {
      newErrors.startDate = "項目を入力してください";
    }

    if (!endDate) {
      newErrors.endDate = "項目を入力してください";
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

    const isValid = validate();

    if (!isValid) {
      return;
    }

    try {
      // setIsSubmitting(true);
      // setSubmitError(null);

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          start_date: startDate,
          end_date: endDate,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error("旅行の登録に失敗しました");
      }

      navigate("/trips");
    } catch (error) {
      console.error(error);
      // setSubmitError("旅行の登録に失敗しました");
    } finally {
      // setIsSubmitting(false);
    }

    // console.log({
    //   title,
    //   startDate,
    //   endDate,
    //   description,
    // });
  };

  const inputClassName =
    "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900">旅行の基本情報</h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            旅行名と日程を入力してください。旅行期間は最大14日間です。
          </p>
        </div>

        <div className="space-y-6">
          {/* 旅行名 */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="title" className="text-sm font-medium text-gray-700">
                旅行名
                <span className="ml-1 text-red-500">*</span>
              </label>

              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>

            <input
              id="title"
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="例：秋の京都・大阪旅行"
              className={inputClassName}
            />
          </div>

          {/* 開始日・終了日 */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                  開始日
                  <span className="ml-1 text-red-500">*</span>
                </label>

                {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
              </div>

              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);

                  setErrors((prev) => ({
                    ...prev,
                    startDate: undefined,
                  }));
                }}
                className={inputClassName}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                  終了日
                  <span className="ml-1 text-red-500">*</span>
                </label>

                {errors.endDate && <p className="text-sm text-red-500">{errors.endDate}</p>}
              </div>

              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);

                  setErrors((prev) => ({
                    ...prev,
                    endDate: undefined,
                    tripPeriod: undefined,
                  }));
                }}
                className={inputClassName}
              />
            </div>
          </div>

          {/* 旅行期間エラー */}
          {errors.tripPeriod && (
            <p className="text-sm font-medium text-red-500">{errors.tripPeriod}</p>
          )}

          {/* 説明 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              説明
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
        </div>

        <div className="mt-8 flex items-center justify-end border-t border-gray-100 pt-6">
          <button
            type="submit"
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            旅行を作成
          </button>
        </div>
      </form>
    </div>
  );
};
