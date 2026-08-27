import type { LoginPayload, SignupPayload, User } from "../types/user";

const BASE_URL = "/api/auth";

type LocalUserResponse = {
  id: number;
  email: string;
  created_at: string;
};

const toUser = (user: LocalUserResponse): User => ({
  ...user,
  id: String(user.id),
});

// 現在ログイン中のユーザー情報を取得する（未ログインの場合は null を返す）
export const getCurrentUser = async (): Promise<User | null> => {
  const res = await fetch(`${BASE_URL}/me`, { credentials: "include" });
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch current user: ${res.status}`);
  }
  return res.json().then(toUser) as Promise<User>;
};

// 新規ユーザー登録
export const signup = async (payload: SignupPayload): Promise<User> => {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Failed to signup: ${res.status}`);
  }
  return res.json().then(toUser) as Promise<User>;
};

// ログイン
export const login = async (payload: LoginPayload): Promise<User> => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Failed to login: ${res.status}`);
  }
  return res.json().then(toUser) as Promise<User>;
};

// ログアウト
export const logout = async (): Promise<void> => {
  const res = await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to logout: ${res.status}`);
  }
};
