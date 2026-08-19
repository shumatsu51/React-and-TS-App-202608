import { useNavigate } from "react-router-dom";
import { Trip } from "../pages/TripListPage";

type Props = {
  trip: Trip;
};

export const TripCard = ({ trip }: Props) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/trips/${trip.id}`)}
      className="w-full rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <h3 className="text-lg font-semibold text-gray-900">{trip.title}</h3>

      <p className="mt-2 text-sm text-gray-500">
        {trip.start_date} ～ {trip.end_date}
      </p>

      {trip.description && <p className="mt-4 text-sm text-gray-600">{trip.description}</p>}
    </button>
  );
};
