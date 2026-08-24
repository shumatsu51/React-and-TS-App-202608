import { useCallback, useEffect, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";

import { TripForm } from "../components/TripForm";
import { SuccessModal } from "../components/SuccessModal";
import { ErrorState } from "../components/ErrorState";
import { UnsavedChangesModal } from "../components/UnsavedChangesModal";
import { getTrip } from "../api/trips";
import { useBeforeUnloadWarning } from "../hooks/useBeforeUnloadWarning";
import type { Trip } from "../types/trip";

export default function EditTripPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const blocker = useBlocker(isDirty);

  const fetchTrip = useCallback(async () => {
    if (!id) {
      await Promise.resolve();
      setError("旅行IDを取得できませんでした");
      setIsLoading(false);
      return;
    }

    try {
      const data = await getTrip(Number(id));

      setTrip(data);
    } catch (error) {
      console.error(error);
      setError("旅行情報を取得できませんでした");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Fetch updates state after the request resolves; this function is also reused by retry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTrip();
  }, [fetchTrip]);

  const handleSuccess = () => {
    setIsSuccessModalOpen(true);
  };

  const handleConfirm = () => {
    navigate(`/trips/${id}`);
  };

  const handleBack = () => {
    navigate(`/trips/${trip?.id}`);
  };

  useBeforeUnloadWarning(isDirty);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <ErrorState
            message={error}
            onRetry={() => {
              setIsLoading(true);
              setError(null);
              void fetchTrip();
            }}
          />
        </div>
      </main>
    );
  }

  if (!trip) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          ← 旅行詳細に戻る
        </button>

        <div className="mt-6 mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            旅行情報を編集
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">登録済みの旅行情報を変更します。</p>
        </div>

        <TripForm
          mode="edit"
          tripId={trip.id}
          initialValues={{
            title: trip.title,
            startDate: trip.start_date,
            endDate: trip.end_date,
            description: trip.description ?? "",
          }}
          onSuccess={handleSuccess}
          onDirtyChange={setIsDirty}
        />
      </div>

      <SuccessModal
        isOpen={isSuccessModalOpen}
        message="✅旅行情報を更新しました"
        onConfirm={handleConfirm}
      />

      <UnsavedChangesModal
        isOpen={blocker.state === "blocked"}
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </main>
  );
}
