import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TripCard } from "../components/TripCard";

export type Trip = {
  id: number;
  user_id: number;
  title: string;
  start_date: string;
  end_date: string;
  description: string | null;
};

export default function TripListPages() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await fetch("/api/trips");

        if (!response.ok) {
          throw new Error("旅行一覧の取得に失敗しました");
        }

        const data: Trip[] = await response.json();
        setTrips(data);
      } catch (error) {
        console.error(error);
        setError("旅行一覧を取得できませんでした");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrips();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          旅行一覧を読み込んでいます...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900">旅行がまだありません</h3>

        <p className="mt-2 text-sm text-gray-500">新しい旅行を登録すると、ここに表示されます。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <button
        className="grid border px-4 py-4 hover:bg-gray-200 text-center text-red-500 bg-gray-100 rounded-md"
        onClick={() => navigate("/trips/new")}
      >
        +旅行を作成
      </button>
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
