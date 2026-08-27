import { type FormEvent, useState } from "react";

import type { ItineraryItemInput } from "../../types/itineraryItem";
import type { TripPlace } from "../../types/tripPlace";

type Props = {
  tripStartDate: string;
  tripEndDate: string;
  places: TripPlace[];
  initialValues?: ItineraryItemInput;
  onSubmit: (input: ItineraryItemInput) => Promise<boolean>;
  onCancel?: () => void;
  submitLabel: string;
};

export const ItineraryItemForm = ({
  tripStartDate,
  tripEndDate,
  places,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: Props) => {
  const [scheduledDate, setScheduledDate] = useState(
    initialValues?.scheduled_date ?? tripStartDate
  );
  const [startTime, setStartTime] = useState(initialValues?.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(initialValues?.end_time?.slice(0, 5) ?? "");
  const [placeName, setPlaceName] = useState(initialValues?.place_name ?? "");
  const [tripPlaceId, setTripPlaceId] = useState(initialValues?.trip_place_id?.toString() ?? "");
  const [memo, setMemo] = useState(initialValues?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!placeName.trim()) {
      setError("場所名を入力してください");
      return;
    }
    if (startTime && endTime && endTime < startTime) {
      setError("終了時刻は開始時刻以降に設定してください");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    await onSubmit({
      scheduled_date: scheduledDate,
      start_time: startTime || null,
      end_time: endTime || null,
      place_name: placeName.trim(),
      trip_place_id: tripPlaceId || null,
      memo: memo.trim() || null,
    });
    setIsSubmitting(false);
  };

  const inputClassName =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900";
  const isPlaceNameError = error === "場所名を入力してください";
  const isTimeError = error === "終了時刻は開始時刻以降に設定してください";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-gray-50 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          日付
          <input
            type="date"
            value={scheduledDate}
            min={tripStartDate}
            max={tripEndDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            className={inputClassName}
            required
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          行きたい場所から選択
          <select
            value={tripPlaceId}
            onChange={(event) => {
              const nextId = event.target.value;
              setTripPlaceId(nextId);
              const place = places.find((item) => String(item.id) === nextId);
              if (place) setPlaceName(place.name);
            }}
            className={inputClassName}
          >
            <option value="">選択しない（自由入力）</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          開始時刻（任意）
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            aria-describedby={isTimeError ? "itinerary-form-error" : undefined}
            aria-invalid={isTimeError}
            className={inputClassName}
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          終了時刻（任意）
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            aria-describedby={isTimeError ? "itinerary-form-error" : undefined}
            aria-invalid={isTimeError}
            className={inputClassName}
          />
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        場所名
        <input
          type="text"
          value={placeName}
          onChange={(event) => setPlaceName(event.target.value)}
          maxLength={100}
          aria-describedby={isPlaceNameError ? "itinerary-form-error" : undefined}
          aria-invalid={isPlaceNameError}
          className={inputClassName}
          required
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-gray-700">
        メモ（任意）
        <textarea
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          maxLength={500}
          rows={3}
          className={`${inputClassName} resize-none`}
        />
      </label>

      {error && (
        <p id="itinerary-form-error" role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

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
