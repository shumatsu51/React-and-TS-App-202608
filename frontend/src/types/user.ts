export type User = {
  id: string;
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
