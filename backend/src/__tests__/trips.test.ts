import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type mysql from "mysql2/promise";

vi.mock("../db/index.js", () => ({ default: { query: vi.fn() } }));

import pool from "../db/index.js";
import { JWT_SECRET } from "../middleware/auth.js";
import trips from "../routes/trips.js";

const app = new Hono();
app.route("/api/trips", trips);

const createAuthHeader = async () => {
  const token = await sign({ sub: 1, email: "test@example.com" }, JWT_SECRET, "HS256");
  return { Cookie: `token=${token}`, "Content-Type": "application/json" };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PUT /api/trips/:id", () => {
  it("期間外になる旅程がある場合は409で旅行期間の更新を拒否する", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce([[{ count: 1 }], []] as unknown as [
      mysql.RowDataPacket[],
      mysql.FieldPacket[],
    ]);

    const response = await app.request("/api/trips/1", {
      method: "PUT",
      headers: await createAuthHeader(),
      body: JSON.stringify({
        title: "京都旅行",
        start_date: "2026-08-20",
        end_date: "2026-08-21",
        description: "夏休み",
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "旅行期間外になる旅程があります。先に旅程の日付を変更または削除してください",
    });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
