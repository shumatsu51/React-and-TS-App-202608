import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "../common/ErrorState";
import { TripPlace } from "../../types/tripPlace";
import {
  createTripPlace,
  deleteTripPlace,
  getTripPlaces,
  updateTripPlace,
} from "../../api/tripPlaces";
import { AddTripPlaceForm } from "./AddTripPlaceForm";
import { TripPlaceItem } from "./TripPlaceItem";

type Props = {
  tripId: number;
};

export const TripPlaceList = ({ tripId }: Props) => {
  const [places, setPlaces] = useState<TripPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const visitedCount = places.filter((place) => place.is_visited).length;

  const fetchPlaces = useCallback(async () => {
    try {
      const data = await getTripPlaces(tripId);
      setPlaces(data);
    } catch (error) {
      console.error(error);
      setError("行きたい場所を取得できませんでした");
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    // Fetch updates state after the request resolves; this function is also reused by retry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPlaces();
  }, [fetchPlaces]);

  const handleAdd = async (name: string) => {
    try {
      setOperationError(null);
      const newPlace = await createTripPlace(tripId, name);

      setPlaces((prev) => [...prev, newPlace]);
      return true;
    } catch (error) {
      console.error(error);
      setOperationError("場所を追加できませんでした。時間をおいて再度お試しください。");
      return false;
    }
  };

  const handleToggle = async (id: number, isVisited: boolean) => {
    try {
      setOperationError(null);
      await updateTripPlace(id, isVisited);

      setPlaces((prev) =>
        prev.map((place) => (place.id === id ? { ...place, is_visited: isVisited } : place))
      );
    } catch (error) {
      console.error(error);
      setOperationError("訪問済み状態を更新できませんでした。もう一度お試しください。");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setOperationError(null);
      await deleteTripPlace(id);

      setPlaces((prev) => prev.filter((place) => place.id !== id));
    } catch (error) {
      console.error(error);
      setOperationError("場所を削除できませんでした。もう一度お試しください。");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500">読み込み中...</p>;
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <ErrorState
          message={error}
          onRetry={() => {
            setIsLoading(true);
            setError(null);
            void fetchPlaces();
          }}
        />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-semibold text-gray-900">行きたい場所</h2>
          <p className="text-sm font-medium text-gray-700" aria-live="polite">
            {visitedCount} / {places.length}件訪問済み
          </p>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          気になる場所を追加して、訪れたらチェックしましょう。
        </p>
      </div>

      <div className="mt-5">
        <AddTripPlaceForm onAdd={handleAdd} />
      </div>

      {operationError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {operationError}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {places.length === 0 ? (
          <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            まだ行きたい場所が登録されていません。
          </p>
        ) : (
          places.map((place) => (
            <TripPlaceItem
              key={place.id}
              place={place}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </section>
  );
};
