import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ConfirmModal } from "../components/common/ConfirmModal";
import { ErrorState } from "../components/common/ErrorState";
import { SuccessModal } from "../components/common/SuccessModal";
import { deleteTrip, getTrip } from "../api/trips";
import type { Trip } from "../types/trip";
import { TripPlaceList } from "../components/trip-place/TripPlaceList";
import { ItineraryList } from "../components/itinerary/ItineraryList";
import { ExpenseList } from "../components/expense/ExpenseList";
import { getTripStatus } from "../utils/tripStatus";
import { getTripDuration } from "../utils/tripDuration";
import { PageHeader } from "../components/common/PageHeader";

export default function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [isDeleteCompleteOpen, setIsDeleteCompleteOpen] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTrip = useCallback(async () => {
    if (!id) {
      await Promise.resolve();
      setFetchError("旅行IDを取得できませんでした");
      setIsLoading(false);
      return;
    }

    try {
      const data = await getTrip(Number(id));
      setTrip(data);
    } catch (error) {
      console.error(error);
      setFetchError("旅行情報を取得できませんでした");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Fetch updates state after the request resolves; this function is also reused by retry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTrip();
  }, [fetchTrip]);

  const handleDeleteConfirm = async () => {
    if (!trip) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);

      await deleteTrip(trip.id);

      // DB削除成功
      setIsDeleteConfirmOpen(false);

      // 画面上からも削除済みとして扱う
      // ただし完了モーダル表示のため trip 自体は保持
      setIsDeleteCompleteOpen(true);
    } catch (error) {
      console.error(error);
      setDeleteError("旅行の削除に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteError(null);
  };

  const handleDeleteComplete = () => {
    navigate("/trips");
  };

  if (isLoading) {
    return <p>読み込み中...</p>;
  }

  if (fetchError) {
    return (
      <ErrorState
        message={fetchError}
        onRetry={() => {
          setIsLoading(true);
          setFetchError(null);
          void fetchTrip();
        }}
      />
    );
  }

  if (!trip) {
    return null;
  }

  const { label, className } = getTripStatus(trip.start_date, trip.end_date);

  const duration = getTripDuration(trip.start_date, trip.end_date);

  return (
    <>
      <PageHeader backLabel="旅行一覧" title="旅行の詳細" onBack={() => navigate("/trips")} />

      <div className="mx-auto max-w-3xl py-8 sm:py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-gray-900">{trip.title}</h2>

                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
                  {label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 編集ボタン */}
              <button
                type="button"
                onClick={() => navigate(`/trips/${trip.id}/edit`)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              >
                ✏️
              </button>

              {/* 削除ボタン */}
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setIsDeleteConfirmOpen(true);
                }}
                className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                aria-label="旅行を削除"
              >
                🗑
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <p>
              {trip.start_date} ～ {trip.end_date} （{duration}日間）
            </p>

            <p className="mt-4">{trip.description || "説明はありません"}</p>
          </div>
          {trip && <TripPlaceList tripId={trip.id} />}
          <ItineraryList
            tripId={trip.id}
            tripStartDate={trip.start_date}
            tripEndDate={trip.end_date}
          />
          <ExpenseList tripId={trip.id} />
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="旅行予定の削除"
        message={`旅行予定「${trip.title}」を削除します。よろしいですか？`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={isDeleting}
        error={deleteError}
      />

      <SuccessModal
        isOpen={isDeleteCompleteOpen}
        message="☑️旅行を削除しました"
        onConfirm={handleDeleteComplete}
      />
    </>
  );
}
