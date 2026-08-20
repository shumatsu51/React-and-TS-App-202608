import { useEffect, useState } from "react";
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

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const data = await getTripPlaces(tripId);
        setPlaces(data);
      } catch (error) {
        console.error(error);
        setError("行きたい場所を取得できませんでした");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, [tripId]);

  const handleAdd = async (name: string) => {
    const newPlace = await createTripPlace(tripId, name);

    setPlaces((prev) => [...prev, newPlace]);
  };

  const handleToggle = async (id: number, isVisited: boolean) => {
    await updateTripPlace(id, isVisited);

    setPlaces((prev) =>
      prev.map((place) => (place.id === id ? { ...place, is_visited: isVisited } : place))
    );
  };

  const handleDelete = async (id: number) => {
    await deleteTripPlace(id);

    setPlaces((prev) => prev.filter((place) => place.id !== id));
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500">読み込み中...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">行きたい場所</h2>
        <p className="mt-1 text-sm text-gray-500">
          気になる場所を追加して、訪れたらチェックしましょう。
        </p>
      </div>

      <div className="mt-5">
        <AddTripPlaceForm onAdd={handleAdd} />
      </div>

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
