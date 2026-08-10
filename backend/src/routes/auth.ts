import { Hono, type Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import pool from "../db/index.js";
import { COOKIE_NAME, JWT_SECRET, requireAuth, type AuthEnv } from "../middleware/auth.js";
import type { LoginRequest, SignupRequest, User } from "../types/user.js";

const auth = new Hono<AuthEnv>();

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7日間

// メールアドレスの簡易フォーマットチェック
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const setAuthCookie = async (c: Context, user: { id: number; email: string }) => {
  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    },
    JWT_SECRET
  );

  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
};

// POST /api/auth/signup - 新規ユーザー登録
auth.post("/signup", async (c) => {
  const body = await c.req.json<SignupRequest>();
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!isValidEmail(email)) {
    return c.json({ message: "メールアドレスの形式が正しくありません" }, 400);
  }
  if (password.length < 8) {
    return c.json({ message: "パスワードは8文字以上で入力してください" }, 400);
  }

  const [existing] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT id FROM users WHERE email = ?",
    [email]
  );
  if (existing.length > 0) {
    return c.json({ message: "このメールアドレスは既に登録されています" }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query<mysql.ResultSetHeader>(
    "INSERT INTO users (email, password_hash) VALUES (?, ?)",
    [email, passwordHash]
  );

  await setAuthCookie(c, { id: result.insertId, email });

  const user: User = {
    id: result.insertId,
    email,
    created_at: new Date().toISOString(),
  };
  return c.json(user, 201);
});

// POST /api/auth/login - ログイン
auth.post("/login", async (c) => {
  const body = await c.req.json<LoginRequest>();
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT id, email, password_hash, created_at FROM users WHERE email = ?",
    [email]
  );
  const row = rows[0];

  // ユーザーが存在しない場合とパスワード不一致の場合で同じエラーを返す（メールアドレス存在の漏洩を防ぐ）
  if (!row || !(await bcrypt.compare(password, row.password_hash as string))) {
    return c.json({ message: "メールアドレスまたはパスワードが正しくありません" }, 401);
  }

  await setAuthCookie(c, { id: row.id as number, email: row.email as string });

  const user: User = {
    id: row.id as number,
    email: row.email as string,
    created_at: String(row.created_at),
  };
  return c.json(user);
});

// POST /api/auth/logout - ログアウト
auth.post("/logout", (c) => {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
  return c.body(null, 204);
});

// GET /api/auth/me - 現在ログイン中のユーザー情報を取得する
auth.get("/me", requireAuth, async (c) => {
  const payload = c.get("user");

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT id, email, created_at FROM users WHERE id = ?",
    [payload.sub]
  );
  const row = rows[0];
  if (!row) {
    return c.json({ message: "ユーザーが見つかりません" }, 404);
  }

  const user: User = {
    id: row.id as number,
    email: row.email as string,
    created_at: String(row.created_at),
  };
  return c.json(user);
});

export default auth;
