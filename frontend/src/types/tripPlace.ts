import type { TripId } from "./trip";

export type TripPlace = {
  id: TripId;
  trip_id: TripId;
  name: string;
  is_visited: boolean;
};
