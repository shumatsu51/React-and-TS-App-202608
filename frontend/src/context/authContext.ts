import { createContext } from "react";
import type { LoginPayload, SignupPayload, User } from "../types/user";

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
