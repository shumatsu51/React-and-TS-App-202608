import type { TripId } from "./trip";

export type ItineraryItem = {
  id: TripId;
  trip_id: TripId;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  place_name: string;
  trip_place_id: TripId | null;
  memo: string | null;
  sort_order: number;
};

export type ItineraryItemInput = {
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  place_name: string;
  trip_place_id: TripId | null;
  memo: string | null;
};
