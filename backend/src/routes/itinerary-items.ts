import { Hono } from "hono";
import mysql from "mysql2/promise";

import pool from "../db/index.js";
import { requireAuth, type AuthEnv } from "../middleware/auth.js";

const itineraryItems = new Hono<AuthEnv>();

itineraryItems.use("/*", requireAuth);

type TripRow = mysql.RowDataPacket & {
  id: number;
  start_date: string;
  end_date: string;
};

type ItineraryItemBody = {
  scheduled_date?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  place_name?: unknown;
  trip_place_id?: unknown;
  memo?: unknown;
};

type ReorderBody = {
  scheduled_date?: unknown;
  item_ids?: unknown;
};

type ValidatedItineraryItem = {
  scheduledDate: string;
  startTime: string | null;
  endTime: string | null;
  placeName: string;
  tripPlaceId: number | null;
  memo: string | null;
};

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

const isValidTime = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);

const getOwnedTrip = async (tripId: number, userId: number): Promise<TripRow | null> => {
  const [rows] = await pool.query<TripRow[]>(
    `
      SELECT id, start_date, end_date
      FROM trips
      WHERE id = ? AND user_id = ?
    `,
    [tripId, userId]
  );

  return rows[0] ?? null;
};

const validateBody = async (
  body: ItineraryItemBody,
  trip: TripRow
): Promise<{ value: ValidatedItineraryItem } | { message: string }> => {
  const scheduledDate = typeof body.scheduled_date === "string" ? body.scheduled_date : "";
  const placeName = typeof body.place_name === "string" ? body.place_name.trim() : "";
  const startTime = typeof body.start_time === "string" && body.start_time ? body.start_time : null;
  const endTime = typeof body.end_time === "string" && body.end_time ? body.end_time : null;
  const memo = typeof body.memo === "string" && body.memo.trim() ? body.memo.trim() : null;
  const tripPlaceId = body.trip_place_id == null ? null : Number(body.trip_place_id);

  if (!isValidDate(scheduledDate)) {
    return { message: "有効な日付を入力してください" };
  }

  if (scheduledDate < trip.start_date || scheduledDate > trip.end_date) {
    return { message: "旅程の日付は旅行期間内に設定してください" };
  }

  if (!placeName || placeName.length > 100) {
    return { message: "場所名は1文字以上100文字以内で入力してください" };
  }

  if ((startTime && !isValidTime(startTime)) || (endTime && !isValidTime(endTime))) {
    return { message: "有効な時刻を入力してください" };
  }

  if (startTime && endTime && endTime < startTime) {
    return { message: "終了時刻は開始時刻以降に設定してください" };
  }

  if (memo && memo.length > 500) {
    return { message: "メモは500文字以内で入力してください" };
  }

  if (tripPlaceId !== null) {
    if (!Number.isInteger(tripPlaceId)) {
      return { message: "不正な場所IDです" };
    }

    const [placeRows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id FROM trip_places WHERE id = ? AND trip_id = ?",
      [tripPlaceId, trip.id]
    );

    if (placeRows.length === 0) {
      return { message: "指定した行きたい場所が見つかりません" };
    }
  }

  return {
    value: {
      scheduledDate,
      startTime,
      endTime,
      placeName,
      tripPlaceId,
      memo,
    },
  };
};

const findOverlappingItem = async (
  tripId: number,
  scheduledDate: string,
  startTime: string | null,
  endTime: string | null,
  excludedItemId?: number
) => {
  if (!startTime || !endTime) {
    return null;
  }

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `
      SELECT id, place_name
      FROM itinerary_items
      WHERE trip_id = ?
        AND scheduled_date = ?
        AND start_time IS NOT NULL
        AND end_time IS NOT NULL
        AND (? IS NULL OR id != ?)
        AND start_time < ?
        AND end_time > ?
      LIMIT 1
    `,
    [tripId, scheduledDate, excludedItemId ?? null, excludedItemId ?? null, endTime, startTime]
  );

  return rows[0] ?? null;
};

// GET /api/itinerary-items/trips/:tripId
itineraryItems.get("/trips/:tripId", async (c) => {
  try {
    const tripId = Number(c.req.param("tripId"));
    const userId = Number(c.get("user").sub);

    if (!Number.isInteger(tripId)) {
      return c.json({ message: "不正な旅行IDです" }, 400);
    }

    if (!(await getOwnedTrip(tripId, userId))) {
      return c.json({ message: "旅行が見つかりません" }, 404);
    }

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `
        SELECT id, trip_id, scheduled_date, start_time, end_time, place_name, trip_place_id, memo, sort_order
        FROM itinerary_items
        WHERE trip_id = ?
        ORDER BY scheduled_date, sort_order, id
      `,
      [tripId]
    );

    return c.json(rows);
  } catch (error) {
    console.error(error);
    return c.json({ message: "旅程の取得に失敗しました" }, 500);
  }
});

// POST /api/itinerary-items/trips/:tripId
itineraryItems.post("/trips/:tripId", async (c) => {
  try {
    const tripId = Number(c.req.param("tripId"));
    const userId = Number(c.get("user").sub);

    if (!Number.isInteger(tripId)) {
      return c.json({ message: "不正な旅行IDです" }, 400);
    }

    const trip = await getOwnedTrip(tripId, userId);
    if (!trip) {
      return c.json({ message: "旅行が見つかりません" }, 404);
    }

    const validated = await validateBody((await c.req.json()) as ItineraryItemBody, trip);
    if ("message" in validated) {
      return c.json({ message: validated.message }, 400);
    }

    const value = validated.value;
    const overlappingItem = await findOverlappingItem(
      tripId,
      value.scheduledDate,
      value.startTime,
      value.endTime
    );
    if (overlappingItem) {
      return c.json({ message: `「${overlappingItem.place_name}」と時間が重複しています` }, 409);
    }

    const [orderRows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM itinerary_items WHERE trip_id = ? AND scheduled_date = ?",
      [tripId, value.scheduledDate]
    );
    const sortOrder = Number(orderRows[0].next_order);

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `
        INSERT INTO itinerary_items
          (trip_id, scheduled_date, start_time, end_time, place_name, trip_place_id, memo, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        tripId,
        value.scheduledDate,
        value.startTime,
        value.endTime,
        value.placeName,
        value.tripPlaceId,
        value.memo,
        sortOrder,
      ]
    );

    return c.json(
      {
        id: result.insertId,
        trip_id: tripId,
        scheduled_date: value.scheduledDate,
        start_time: value.startTime,
        end_time: value.endTime,
        place_name: value.placeName,
        trip_place_id: value.tripPlaceId,
        memo: value.memo,
        sort_order: sortOrder,
      },
      201
    );
  } catch (error) {
    console.error(error);
    return c.json({ message: "旅程の追加に失敗しました" }, 500);
  }
});

// PUT /api/itinerary-items/:id
itineraryItems.put("/:id", async (c) => {
  try {
    const itemId = Number(c.req.param("id"));
    const userId = Number(c.get("user").sub);

    if (!Number.isInteger(itemId)) {
      return c.json({ message: "不正な旅程IDです" }, 400);
    }

    const [itemRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT ii.id, ii.trip_id, ii.scheduled_date, ii.sort_order FROM itinerary_items ii INNER JOIN trips t ON ii.trip_id = t.id WHERE ii.id = ? AND t.user_id = ?`,
      [itemId, userId]
    );
    if (itemRows.length === 0) {
      return c.json({ message: "旅程が見つかりません" }, 404);
    }

    const trip = await getOwnedTrip(Number(itemRows[0].trip_id), userId);
    if (!trip) {
      return c.json({ message: "旅行が見つかりません" }, 404);
    }

    const validated = await validateBody((await c.req.json()) as ItineraryItemBody, trip);
    if ("message" in validated) {
      return c.json({ message: validated.message }, 400);
    }

    const value = validated.value;
    const overlappingItem = await findOverlappingItem(
      trip.id,
      value.scheduledDate,
      value.startTime,
      value.endTime,
      itemId
    );
    if (overlappingItem) {
      return c.json({ message: `「${overlappingItem.place_name}」と時間が重複しています` }, 409);
    }

    let sortOrder = Number(itemRows[0].sort_order);
    if (itemRows[0].scheduled_date !== value.scheduledDate) {
      const [orderRows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM itinerary_items WHERE trip_id = ? AND scheduled_date = ?",
        [trip.id, value.scheduledDate]
      );
      sortOrder = Number(orderRows[0].next_order);
    }

    await pool.query(
      `UPDATE itinerary_items SET scheduled_date = ?, start_time = ?, end_time = ?, place_name = ?, trip_place_id = ?, memo = ?, sort_order = ? WHERE id = ?`,
      [
        value.scheduledDate,
        value.startTime,
        value.endTime,
        value.placeName,
        value.tripPlaceId,
        value.memo,
        sortOrder,
        itemId,
      ]
    );

    return c.json({
      id: itemId,
      trip_id: trip.id,
      scheduled_date: value.scheduledDate,
      start_time: value.startTime,
      end_time: value.endTime,
      place_name: value.placeName,
      trip_place_id: value.tripPlaceId,
      memo: value.memo,
      sort_order: sortOrder,
    });
  } catch (error) {
    console.error(error);
    return c.json({ message: "旅程の更新に失敗しました" }, 500);
  }
});

// PUT /api/itinerary-items/trips/:tripId/order
itineraryItems.put("/trips/:tripId/order", async (c) => {
  try {
    const tripId = Number(c.req.param("tripId"));
    const userId = Number(c.get("user").sub);

    if (!Number.isInteger(tripId)) {
      return c.json({ message: "不正な旅行IDです" }, 400);
    }

    const trip = await getOwnedTrip(tripId, userId);
    if (!trip) {
      return c.json({ message: "旅行が見つかりません" }, 404);
    }

    const body = (await c.req.json()) as ReorderBody;
    const scheduledDate = typeof body.scheduled_date === "string" ? body.scheduled_date : "";
    const itemIds = Array.isArray(body.item_ids) ? body.item_ids.map(Number) : [];

    if (
      !isValidDate(scheduledDate) ||
      scheduledDate < trip.start_date ||
      scheduledDate > trip.end_date
    ) {
      return c.json({ message: "旅行期間内の有効な日付を指定してください" }, 400);
    }

    if (
      !Array.isArray(body.item_ids) ||
      itemIds.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(itemIds).size !== itemIds.length
    ) {
      return c.json({ message: "並び替える旅程IDが不正です" }, 400);
    }

    const [existingRows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id FROM itinerary_items WHERE trip_id = ? AND scheduled_date = ? ORDER BY sort_order, id",
      [tripId, scheduledDate]
    );
    const existingIds = existingRows.map((row) => Number(row.id));
    const hasSameItems =
      existingIds.length === itemIds.length && existingIds.every((id) => itemIds.includes(id));

    if (!hasSameItems) {
      return c.json({ message: "指定された日付の旅程をすべて指定してください" }, 400);
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const [index, itemId] of itemIds.entries()) {
        await connection.query(
          "UPDATE itinerary_items SET sort_order = ? WHERE id = ? AND trip_id = ? AND scheduled_date = ?",
          [index + 1, itemId, tripId, scheduledDate]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return c.body(null, 204);
  } catch (error) {
    console.error(error);
    return c.json({ message: "旅程の並び替えに失敗しました" }, 500);
  }
});

// DELETE /api/itinerary-items/:id
itineraryItems.delete("/:id", async (c) => {
  try {
    const itemId = Number(c.req.param("id"));
    const userId = Number(c.get("user").sub);

    if (!Number.isInteger(itemId)) {
      return c.json({ message: "不正な旅程IDです" }, 400);
    }

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `DELETE ii FROM itinerary_items ii INNER JOIN trips t ON ii.trip_id = t.id WHERE ii.id = ? AND t.user_id = ?`,
      [itemId, userId]
    );

    if (result.affectedRows === 0) {
      return c.json({ message: "旅程が見つかりません" }, 404);
    }

    return c.body(null, 204);
  } catch (error) {
    console.error(error);
    return c.json({ message: "旅程の削除に失敗しました" }, 500);
  }
});

export default itineraryItems;
