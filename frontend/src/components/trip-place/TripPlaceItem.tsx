import { TripPlace } from "../../types/tripPlace";

type Props = {
  place: TripPlace;
  onToggle: (id: number, isVisited: boolean) => void;
  onDelete: (id: number) => void;
};

export const TripPlaceItem = ({ place, onToggle, onDelete }: Props) => {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={place.is_visited}
          onChange={(e) => onToggle(place.id, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />

        <span className={place.is_visited ? "text-gray-400 line-through" : "text-gray-800"}>
          {place.name}
        </span>
      </label>

      <button
        type="button"
        onClick={() => onDelete(place.id)}
        className="text-sm text-gray-400 hover:text-red-500"
      >
        削除
      </button>
    </div>
  );
};
