import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type mysql from "mysql2/promise";

vi.mock("../db/index.js", () => ({
  default: { query: vi.fn(), getConnection: vi.fn() },
}));

import pool from "../db/index.js";
import { JWT_SECRET } from "../middleware/auth.js";
import itineraryItems from "../routes/itinerary-items.js";

const app = new Hono();
app.route("/api/itinerary-items", itineraryItems);

const createAuthHeader = async () => {
  const token = await sign({ sub: 1, email: "test@example.com" }, JWT_SECRET, "HS256");
  return { Cookie: `token=${token}`, "Content-Type": "application/json" };
};

const ownedTrip = { id: 10, start_date: "2026-08-20", end_date: "2026-08-21" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("旅程の時間重複チェック", () => {
  it("作成時に同じ日の時間帯が重複すると409を返す", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce([[ownedTrip], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ])
      .mockResolvedValueOnce([[{ id: 2, place_name: "八坂神社" }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ]);

    const response = await app.request("/api/itinerary-items/trips/10", {
      method: "POST",
      headers: await createAuthHeader(),
      body: JSON.stringify({
        scheduled_date: "2026-08-20",
        start_time: "09:30",
        end_time: "10:30",
        place_name: "清水寺",
        trip_place_id: null,
        memo: null,
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "「八坂神社」と時間が重複しています",
    });
  });

  it("終了時刻が既存予定の開始時刻と一致する場合は作成できる", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce([[ownedTrip], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ])
      .mockResolvedValueOnce([[], []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]])
      .mockResolvedValueOnce([[{ next_order: 2 }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ])
      .mockResolvedValueOnce([{ insertId: 3 }, []] as unknown as [
        mysql.ResultSetHeader,
        mysql.FieldPacket[],
      ]);

    const response = await app.request("/api/itinerary-items/trips/10", {
      method: "POST",
      headers: await createAuthHeader(),
      body: JSON.stringify({
        scheduled_date: "2026-08-20",
        start_time: "10:00",
        end_time: "11:00",
        place_name: "清水寺",
        trip_place_id: null,
        memo: null,
      }),
    });

    expect(response.status).toBe(201);
  });

  it("編集時は自分自身を除外して、別の予定との重複を409で返す", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce([
        [{ id: 1, trip_id: 10, scheduled_date: "2026-08-20", sort_order: 1 }],
        [],
      ] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]])
      .mockResolvedValueOnce([[ownedTrip], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ])
      .mockResolvedValueOnce([[{ id: 2, place_name: "八坂神社" }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ]);

    const response = await app.request("/api/itinerary-items/1", {
      method: "PUT",
      headers: await createAuthHeader(),
      body: JSON.stringify({
        scheduled_date: "2026-08-20",
        start_time: "09:30",
        end_time: "10:30",
        place_name: "清水寺",
        trip_place_id: null,
        memo: null,
      }),
    });

    expect(response.status).toBe(409);
    expect(pool.query).toHaveBeenLastCalledWith(expect.stringContaining("id != ?"), [
      10,
      "2026-08-20",
      1,
      1,
      "10:30",
      "09:30",
    ]);
  });
});

describe("PUT /api/itinerary-items/trips/:tripId/order", () => {
  it("同じ日の全予定を指定するとトランザクションで順序を保存する", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      query: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    vi.mocked(pool.query)
      .mockResolvedValueOnce([[ownedTrip], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ])
      .mockResolvedValueOnce([[{ id: 1 }, { id: 2 }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ]);
    vi.mocked(pool.getConnection).mockResolvedValue(connection as never);

    const response = await app.request("/api/itinerary-items/trips/10/order", {
      method: "PUT",
      headers: await createAuthHeader(),
      body: JSON.stringify({ scheduled_date: "2026-08-20", item_ids: [2, 1] }),
    });

    expect(response.status).toBe(204);
    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.query).toHaveBeenNthCalledWith(1, expect.any(String), [
      1,
      2,
      10,
      "2026-08-20",
    ]);
    expect(connection.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      2,
      1,
      10,
      "2026-08-20",
    ]);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it("その日の予定が不足している場合は更新しない", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce([[ownedTrip], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ])
      .mockResolvedValueOnce([[{ id: 1 }, { id: 2 }], []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ]);

    const response = await app.request("/api/itinerary-items/trips/10/order", {
      method: "PUT",
      headers: await createAuthHeader(),
      body: JSON.stringify({ scheduled_date: "2026-08-20", item_ids: [1] }),
    });

    expect(response.status).toBe(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
});
