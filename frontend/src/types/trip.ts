export type TripId = string | number;

export type Trip = {
  id: TripId;
  user_id: TripId;
  title: string;
  start_date: string;
  end_date: string;
  description: string | null;
};

export type TripInput = {
  title: string;
  startDate: string;
  endDate: string;
  description: string;
};
