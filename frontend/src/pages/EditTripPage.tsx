import { useCallback, useEffect, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";

import { TripForm } from "../components/trip/TripForm";
import { SuccessModal } from "../components/common/SuccessModal";
import { ErrorState } from "../components/common/ErrorState";
import { UnsavedChangesModal } from "../components/common/UnsavedChangesModal";
import { getTrip } from "../api/trips";
import { useBeforeUnloadWarning } from "../hooks/useBeforeUnloadWarning";
import type { Trip } from "../types/trip";
import { PageHeader } from "../components/common/PageHeader";

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
      const data = await getTrip(id);

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
      <div className="mx-auto max-w-3xl py-8 sm:py-12">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-8 sm:py-12">
        <ErrorState
          message={error}
          onRetry={() => {
            setIsLoading(true);
            setError(null);
            void fetchTrip();
          }}
        />
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  return (
    <>
      <PageHeader
        backLabel="旅行の詳細"
        title="旅行を編集"
        description="登録した旅行の情報を変更します。"
        onBack={handleBack}
      />
      <div className="mx-auto max-w-3xl py-8 sm:py-12">
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
    </>
  );
}
