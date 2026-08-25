import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type mysql from "mysql2/promise";

vi.mock("../db/index.js", () => ({ default: { query: vi.fn() } }));

import pool from "../db/index.js";
import { JWT_SECRET } from "../middleware/auth.js";
import tripExpenses from "../routes/trip-expenses.js";

const app = new Hono();
app.route("/api/trip-expenses", tripExpenses);

const createAuthHeader = async () => {
  const token = await sign({ sub: 1, email: "test@example.com" }, JWT_SECRET, "HS256");
  return { Cookie: `token=${token}`, "Content-Type": "application/json" };
};

const validExpense = {
  description: "新幹線往復",
  category: "transport",
  amount: 30000,
  payment_status: "paid",
  paid_at: "2026-08-01",
  memo: "指定席",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/trip-expenses/trips/:tripId", () => {
  it("費用を作成して201を返す", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce([[{ id: 10, budget_amount: null }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ])
      .mockResolvedValueOnce([{ insertId: 3 }, []] as unknown as [
        mysql.ResultSetHeader,
        mysql.FieldPacket[],
      ]);

    const response = await app.request("/api/trip-expenses/trips/10", {
      method: "POST",
      headers: await createAuthHeader(),
      body: JSON.stringify(validExpense),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 3, trip_id: 10, ...validExpense });
  });

  it("内容が未入力の場合は400を返す", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce([[{ id: 10 }], []] as unknown as [
      mysql.RowDataPacket[],
      mysql.FieldPacket[],
    ]);

    const response = await app.request("/api/trip-expenses/trips/10", {
      method: "POST",
      headers: await createAuthHeader(),
      body: JSON.stringify({ ...validExpense, description: "" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "内容を入力してください" });
  });

  it("不正な金額・カテゴリ・支払状況を拒否する", async () => {
    for (const body of [
      { ...validExpense, amount: "100.5" },
      { ...validExpense, category: "invalid" },
      { ...validExpense, payment_status: "processing" },
    ]) {
      vi.mocked(pool.query).mockResolvedValueOnce([[{ id: 10 }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ]);
      const response = await app.request("/api/trip-expenses/trips/10", {
        method: "POST",
        headers: await createAuthHeader(),
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
    }
  });
});

describe("GET /api/trip-expenses/trips/:tripId", () => {
  it("予算・全体集計・カテゴリ別集計・明細を返す", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce([[{ id: 10, budget_amount: 100000 }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ])
      .mockResolvedValueOnce([[{ total_amount: 82000, paid_amount: 50000 }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ])
      .mockResolvedValueOnce([
        [{ category: "transport", total_amount: 30000, paid_amount: 30000 }],
        [],
      ] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]])
      .mockResolvedValueOnce([[{ id: 1, trip_id: 10, ...validExpense }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ]);

    const response = await app.request("/api/trip-expenses/trips/10", {
      headers: await createAuthHeader(),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      budget_amount: 100000,
      total_amount: 82000,
      paid_amount: 50000,
      remaining_budget: 18000,
      category_summaries: expect.arrayContaining([
        { category: "transport", total_amount: 30000, paid_amount: 30000 },
        { category: "accommodation", total_amount: 0, paid_amount: 0 },
      ]),
      expenses: [{ id: 1, trip_id: 10, ...validExpense }],
    });
  });
});

describe("PUT /api/trip-expenses/:id", () => {
  it("所有する費用だけを更新する", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce([[{ id: 1, trip_id: 10 }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []] as unknown as [
        mysql.ResultSetHeader,
        mysql.FieldPacket[],
      ]);

    const response = await app.request("/api/trip-expenses/1", {
      method: "PUT",
      headers: await createAuthHeader(),
      body: JSON.stringify({ ...validExpense, amount: 32000 }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: 1, trip_id: 10, amount: 32000 });
  });

  it("所有していない費用は更新できない", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce([[], []] as unknown as [
      mysql.RowDataPacket[],
      mysql.FieldPacket[],
    ]);

    const response = await app.request("/api/trip-expenses/1", {
      method: "PUT",
      headers: await createAuthHeader(),
      body: JSON.stringify(validExpense),
    });

    expect(response.status).toBe(404);
    expect(pool.query).toHaveBeenCalledOnce();
  });
});

describe("DELETE /api/trip-expenses/:id", () => {
  it("所有していない費用は削除できない", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce([{ affectedRows: 0 }, []] as unknown as [
      mysql.ResultSetHeader,
      mysql.FieldPacket[],
    ]);

    const response = await app.request("/api/trip-expenses/1", {
      method: "DELETE",
      headers: await createAuthHeader(),
    });

    expect(response.status).toBe(404);
  });
});
