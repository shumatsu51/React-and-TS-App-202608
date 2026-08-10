export type User = {
  id: number;
  email: string;
  created_at: string;
};

export type SignupRequest = {
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};
