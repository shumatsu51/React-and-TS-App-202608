import { useContext } from "react";
import { AuthContext } from "./authContext";
import type { AuthContextValue } from "./authContext";

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth は AuthProvider の内側で使用してください");
  }
  return context;
};
