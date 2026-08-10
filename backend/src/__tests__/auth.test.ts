import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

// mysql2/promise の pool をモックする
vi.mock("../db/index.js", () => {
  return {
    default: {
      query: vi.fn(),
    },
  };
});

import pool from "../db/index.js";
import auth from "../routes/auth.js";

type RowsResult<T> = [T[], mysql.FieldPacket[]];
type HeaderResult = [mysql.ResultSetHeader, mysql.FieldPacket[]];

const app = new Hono();
app.route("/api/auth", auth);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/signup", () => {
  it("新しいユーザーを作成して 201 を返す", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce([[], []] as unknown as RowsResult<mysql.RowDataPacket>) // 既存チェック
      .mockResolvedValueOnce([
        { insertId: 1, affectedRows: 1 } as mysql.ResultSetHeader,
        [],
      ] as unknown as HeaderResult); // INSERT

    const res = await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }),
    });

    expect(res.status).toBe(201);
    expect(res.headers.get("set-cookie")).toContain("token=");
  });

  it("メールアドレスが既に登録済みの場合 409 を返す", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce([
      [{ id: 1 }],
      [],
    ] as unknown as RowsResult<mysql.RowDataPacket>);

    const res = await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }),
    });

    expect(res.status).toBe(409);
  });

  it("パスワードが短い場合 400 を返す", async () => {
    const res = await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "short" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("正しい認証情報でログインできる", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    vi.mocked(pool.query).mockResolvedValueOnce([
      [{ id: 1, email: "test@example.com", password_hash: passwordHash, created_at: "2026-01-01" }],
      [],
    ] as unknown as RowsResult<mysql.RowDataPacket>);

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("token=");
  });

  it("パスワードが誤っている場合 401 を返す", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    vi.mocked(pool.query).mockResolvedValueOnce([
      [{ id: 1, email: "test@example.com", password_hash: passwordHash, created_at: "2026-01-01" }],
      [],
    ] as unknown as RowsResult<mysql.RowDataPacket>);

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "wrong-password" }),
    });

    expect(res.status).toBe(401);
  });

  it("存在しないユーザーの場合 401 を返す", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce([
      [],
      [],
    ] as unknown as RowsResult<mysql.RowDataPacket>);

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.com", password: "password123" }),
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("未ログインの場合 401 を返す", async () => {
    const res = await app.request("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("ログアウトすると Cookie が削除される", async () => {
    const res = await app.request("/api/auth/logout", { method: "POST" });
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toContain("token=;");
  });
});
