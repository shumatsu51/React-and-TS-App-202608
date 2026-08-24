export type ItineraryItem = {
  id: number;
  trip_id: number;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  place_name: string;
  trip_place_id: number | null;
  memo: string | null;
  sort_order: number;
};

export type ItineraryItemInput = {
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  place_name: string;
  trip_place_id: number | null;
  memo: string | null;
};
