import type { Trip } from "../pages/TripListPages";

type Props = {
  trip: Trip;
};

export function TripCard({ trip }: Props) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <h2 className="mb-3 text-xl font-bold text-gray-900">{trip.title}</h2>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{trip.start_date}</span>

        <span className="text-gray-400">→</span>

        <span>{trip.end_date}</span>
      </div>
    </div>
  );
}
