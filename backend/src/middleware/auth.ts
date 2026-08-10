import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "token";

export type JwtPayload = {
  sub: number;
  email: string;
};

export type AuthEnv = {
  Variables: {
    user: JwtPayload;
  };
};

// Cookie のトークンを検証し、ペイロードを返す。検証に失敗した場合は null を返す。
export const verifyToken = async (token: string): Promise<JwtPayload | null> => {
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
};

// ログイン必須のルートに適用するミドルウェア。
// 認証済みの場合は c.get("user") でハンドラ側からユーザー情報を参照できる。
export const requireAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const token = getCookie(c, COOKIE_NAME);

  if (!token) {
    return c.json({ message: "ログインが必要です" }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ message: "ログインが必要です" }, 401);
  }

  c.set("user", payload);
  await next();
};

export { JWT_SECRET, COOKIE_NAME };
