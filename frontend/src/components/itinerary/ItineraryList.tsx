import { useCallback, useEffect, useMemo, useState } from "react";

import { ConfirmModal } from "../common/ConfirmModal";
import { ErrorState } from "../common/ErrorState";
import {
  createItineraryItem,
  deleteItineraryItem,
  getItineraryItems,
  reorderItineraryItems,
  updateItineraryItem,
} from "../../api/itineraryItems";
import { getTripPlaces } from "../../api/tripPlaces";
import type { ItineraryItem, ItineraryItemInput } from "../../types/itineraryItem";
import type { TripPlace } from "../../types/tripPlace";
import { ItineraryItemForm } from "./ItineraryItemForm";
import { ItineraryItem as ItineraryItemView } from "./ItineraryItem";

type Props = {
  tripId: number;
  tripStartDate: string;
  tripEndDate: string;
};

const getTripDates = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const current = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

const formatDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

const sortItems = (items: ItineraryItem[]) =>
  [...items].sort(
    (first, second) =>
      first.scheduled_date.localeCompare(second.scheduled_date) ||
      first.sort_order - second.sort_order ||
      first.id - second.id
  );

export const ItineraryList = ({ tripId, tripStartDate, tripEndDate }: Props) => {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [places, setPlaces] = useState<TripPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItineraryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reorderingDate, setReorderingDate] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const [itineraryItems, tripPlaces] = await Promise.all([
        getItineraryItems(tripId),
        getTripPlaces(tripId),
      ]);
      setItems(itineraryItems);
      setPlaces(tripPlaces);
    } catch (error) {
      console.error(error);
      setFetchError("旅程を取得できませんでした");
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    // Fetch updates state after the request resolves; this function is also reused by retry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchItems();
  }, [fetchItems]);

  const groupedItems = useMemo(() => {
    const byDate = new Map(items.map((item) => [item.scheduled_date, [] as ItineraryItem[]]));
    items.forEach((item) => byDate.get(item.scheduled_date)?.push(item));
    return byDate;
  }, [items]);

  const handleCreate = async (input: ItineraryItemInput) => {
    try {
      setActionError(null);
      const item = await createItineraryItem(tripId, input);
      setItems((previous) => sortItems([...previous, item]));
      setIsAddFormOpen(false);
      return true;
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "旅程の追加に失敗しました");
      return false;
    }
  };

  const handleUpdate = async (id: number, input: ItineraryItemInput) => {
    try {
      setActionError(null);
      const updatedItem = await updateItineraryItem(id, input);
      setItems((previous) =>
        sortItems(previous.map((item) => (item.id === id ? updatedItem : item)))
      );
      return true;
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "旅程の更新に失敗しました");
      return false;
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      setActionError(null);
      await deleteItineraryItem(itemToDelete.id);
      setItems((previous) => previous.filter((item) => item.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "旅程の削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (scheduledDate: string, itemId: number, direction: -1 | 1) => {
    const dayItems = sortItems(items.filter((item) => item.scheduled_date === scheduledDate));
    const currentIndex = dayItems.findIndex((item) => item.id === itemId);
    const targetIndex = currentIndex + direction;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= dayItems.length) return;

    const reorderedDayItems = [...dayItems];
    [reorderedDayItems[currentIndex], reorderedDayItems[targetIndex]] = [
      reorderedDayItems[targetIndex],
      reorderedDayItems[currentIndex],
    ];

    try {
      setReorderingDate(scheduledDate);
      setActionError(null);
      await reorderItineraryItems(
        tripId,
        scheduledDate,
        reorderedDayItems.map((item) => item.id)
      );

      const sortOrderById = new Map(reorderedDayItems.map((item, index) => [item.id, index + 1]));
      setItems((previous) =>
        sortItems(
          previous.map((item) =>
            item.scheduled_date === scheduledDate
              ? { ...item, sort_order: sortOrderById.get(item.id) ?? item.sort_order }
              : item
          )
        )
      );
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "旅程の並び替えに失敗しました");
    } finally {
      setReorderingDate(null);
    }
  };

  if (isLoading) return <p className="mt-6 text-sm text-gray-500">旅程を読み込み中...</p>;

  if (fetchError) {
    return (
      <ErrorState
        message={fetchError}
        onRetry={() => {
          setIsLoading(true);
          setFetchError(null);
          void fetchItems();
        }}
      />
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">旅程</h2>
          <p className="mt-1 text-sm text-gray-500">
            日ごとの予定を登録して、旅行の流れを整理しましょう。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddFormOpen((open) => !open)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
        >
          {isAddFormOpen ? "追加を閉じる" : "+ 予定を追加"}
        </button>
      </div>

      {isAddFormOpen && (
        <div className="mt-5">
          <ItineraryItemForm
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            places={places}
            submitLabel="予定を追加"
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

      <div className="mt-6 space-y-6">
        {getTripDates(tripStartDate, tripEndDate).map((date) => {
          const dayItems = groupedItems.get(date) ?? [];
          return (
            <section key={date}>
              <h3 className="border-b border-gray-100 pb-2 text-sm font-bold text-gray-700">
                {formatDate(date)}
              </h3>
              <div className="mt-3 space-y-3">
                {dayItems.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    予定はありません。
                  </p>
                ) : (
                  dayItems.map((item) => (
                    <ItineraryItemView
                      key={item.id}
                      item={item}
                      tripStartDate={tripStartDate}
                      tripEndDate={tripEndDate}
                      places={places}
                      onUpdate={handleUpdate}
                      onDelete={setItemToDelete}
                      onMoveUp={() => void handleMove(date, item.id, -1)}
                      onMoveDown={() => void handleMove(date, item.id, 1)}
                      isMoveUpDisabled={dayItems[0].id === item.id || reorderingDate === date}
                      isMoveDownDisabled={
                        dayItems[dayItems.length - 1].id === item.id || reorderingDate === date
                      }
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={itemToDelete !== null}
        title="旅程の削除"
        message={`「${itemToDelete?.place_name ?? ""}」を削除します。よろしいですか？`}
        onConfirm={handleDelete}
        onCancel={() => setItemToDelete(null)}
        isLoading={isDeleting}
        error={null}
      />
    </section>
  );
};
