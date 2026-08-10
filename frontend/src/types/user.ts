export type User = {
  id: number;
  email: string;
  created_at: string;
};

export type SignupPayload = {
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};
