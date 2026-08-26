import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { LoginPayload, SignupPayload, User } from "../types/user";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
} from "../api/auth";
import {
  firebaseLogin,
  firebaseLogout,
  firebaseSignup,
  subscribeToFirebaseAuth,
} from "../api/firebaseAuth";
import { AuthContext } from "./authContext";

const usesFirebaseAuth = import.meta.env.VITE_AUTH_PROVIDER === "firebase";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初回マウント時にログイン状態を確認する
  useEffect(() => {
    if (usesFirebaseAuth) {
      return subscribeToFirebaseAuth((currentUser) => {
        setUser(currentUser);
        setIsLoading(false);
      });
    }

    const fetchCurrentUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCurrentUser();
  }, []);

  const login = async (payload: LoginPayload) => {
    if (usesFirebaseAuth) {
      await firebaseLogin(payload);
      return;
    }

    const loggedInUser = await loginRequest(payload);
    setUser(loggedInUser);
  };

  const signup = async (payload: SignupPayload) => {
    if (usesFirebaseAuth) {
      await firebaseSignup(payload);
      return;
    }

    const createdUser = await signupRequest(payload);
    setUser(createdUser);
  };

  const logout = async () => {
    if (usesFirebaseAuth) {
      await firebaseLogout();
      return;
    }

    await logoutRequest();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
