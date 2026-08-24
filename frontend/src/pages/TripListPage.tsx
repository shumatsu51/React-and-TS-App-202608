import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { TripCard } from "../components/TripCard";
import { getTrips } from "../api/trips";
import type { Trip } from "../types/trip";
import { getTripStatus, type TripStatus } from "../utils/tripStatus";

type TripStatusFilter = "all" | TripStatus;

const statusFilters: { value: TripStatusFilter; label: string }[] = [
  { value: "all", label: "全て" },
  { value: "upcoming", label: "準備中" },
  { value: "ongoing", label: "旅行中" },
  { value: "completed", label: "終了済み" },
];

export default function TripListPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [statusFilter, setStatusFilter] = useState<TripStatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  const filteredTrips = trips.filter((trip) => {
    const matchesStatus =
      statusFilter === "all" || getTripStatus(trip.start_date, trip.end_date).key === statusFilter;
    const matchesKeyword =
      normalizedKeyword === "" ||
      trip.title.toLocaleLowerCase().includes(normalizedKeyword) ||
      trip.description?.toLocaleLowerCase().includes(normalizedKeyword);

    return matchesStatus && matchesKeyword;
  });

  const fetchTrips = useCallback(async () => {
    try {
      const data = await getTrips();
      setTrips(data);
    } catch (error) {
      console.error(error);
      setError("旅行一覧を取得できませんでした");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch updates state after the request resolves; this function is also reused by retry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTrips();
  }, [fetchTrips]);

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
      <ErrorState
        message={error}
        onRetry={() => {
          setIsLoading(true);
          setError(null);
          void fetchTrips();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3">
          <label className="sr-only" htmlFor="trip-keyword">
            キーワードで旅行を検索
          </label>
          <input
            id="trip-keyword"
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="旅行名・説明文で検索"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 sm:max-w-md"
          />

          <div className="flex flex-wrap gap-2" role="group" aria-label="旅行ステータスで絞り込み">
            {statusFilters.map((filter) => {
              const isSelected = statusFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-gray-300 bg-white text-gray-600 hover:border-red-300 hover:text-red-600"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 一覧右上の作成ボタン */}
        <button
          type="button"
          onClick={() => navigate("/trips/new")}
          className="rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
        >
          +旅行を作成
        </button>
      </div>

      {/* 旅行が0件の場合 */}
      {trips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900">旅行がまだありません</h3>

          <p className="mt-2 text-sm text-gray-500">新しい旅行を登録すると、ここに表示されます。</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900">該当する旅行はありません</h3>

          <p className="mt-2 text-sm text-gray-500">検索キーワードまたはステータスを変更してください。</p>
        </div>
      ) : (
        /* カード一覧 */
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
