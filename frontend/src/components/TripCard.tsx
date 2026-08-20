import { useNavigate } from "react-router-dom";
import { Trip } from "../pages/TripListPage";
import { getTripStatus } from "../utils/tripStatus";

type Props = {
  trip: Trip;
};

export const TripCard = ({ trip }: Props) => {
  const navigate = useNavigate();

  const status = getTripStatus(trip.start_date, trip.end_date);

  return (
    <button
      type="button"
      onClick={() => navigate(`/trips/${trip.id}`)}
      className="flex h-56 w-full flex-col rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{trip.title}</h3>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        {trip.start_date} ～ {trip.end_date}
      </p>

      {trip.description && (
        <p className="mt-4 line-clamp-3 text-sm text-gray-600">{trip.description}</p>
      )}
    </button>
  );
};
