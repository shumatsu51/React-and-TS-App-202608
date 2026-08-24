import { useState } from "react";

import type {
  ItineraryItem as ItineraryItemType,
  ItineraryItemInput,
} from "../../types/itineraryItem";
import type { TripPlace } from "../../types/tripPlace";
import { ItineraryItemForm } from "./ItineraryItemForm";

type Props = {
  item: ItineraryItemType;
  tripStartDate: string;
  tripEndDate: string;
  places: TripPlace[];
  onUpdate: (id: number, input: ItineraryItemInput) => Promise<boolean>;
  onDelete: (item: ItineraryItemType) => void;
};

export const ItineraryItem = ({
  item,
  tripStartDate,
  tripEndDate,
  places,
  onUpdate,
  onDelete,
}: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const time = item.start_time
    ? `${item.start_time.slice(0, 5)}${item.end_time ? ` - ${item.end_time.slice(0, 5)}` : ""}`
    : "時刻未定";

  if (isEditing) {
    return (
      <ItineraryItemForm
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        places={places}
        initialValues={item}
        submitLabel="変更を保存"
        onCancel={() => setIsEditing(false)}
        onSubmit={async (input) => {
          const isSuccess = await onUpdate(item.id, input);
          if (isSuccess) setIsEditing(false);
          return isSuccess;
        }}
      />
    );
  }

  return (
    <article className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div>
        <p className="text-xs font-semibold text-gray-500">{time}</p>
        <h4 className="mt-1 font-semibold text-gray-900">{item.place_name}</h4>
        {item.memo && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{item.memo}</p>}
      </div>
      <div className="flex shrink-0 gap-2 text-sm">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-gray-500 hover:text-gray-900"
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="text-red-500 hover:text-red-700"
        >
          削除
        </button>
      </div>
    </article>
  );
};
