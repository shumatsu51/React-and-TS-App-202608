import { Hono } from "hono";
import mysql from "mysql2/promise";

import pool from "../db/index.js";
import { requireAuth, type AuthEnv } from "../middleware/auth.js";

const trips = new Hono<AuthEnv>();

// ログイン必須
trips.use("/*", requireAuth);

// GET /api/trips
trips.get("/", async (c) => {
  try {
    const user = c.get("user");
    const userId = Number(user.sub);

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `
      SELECT
        id,
        user_id,
        title,
        start_date,
        end_date,
        description
      FROM trips
      WHERE user_id = ?
      ORDER BY start_date
      `,
      [userId]
    );

    return c.json(rows);
  } catch (error) {
    console.error(error);

    return c.json(
      {
        message: "Failed to fetch trips",
      },
      500
    );
  }
});

// POST /api/trips
trips.post("/", async (c) => {
  try {
    const user = c.get("user");
    const userId = Number(user.sub);

    const body = await c.req.json();

    const { title, start_date, end_date, description } = body;

    // 必須チェック
    if (!title?.trim() || !start_date || !end_date) {
      return c.json(
        {
          message: "必須項目が入力されていません",
        },
        400
      );
    }

    const start = new Date(`${start_date}T00:00:00`);
    const end = new Date(`${end_date}T00:00:00`);

    // 終了日が開始日より前
    if (end < start) {
      return c.json(
        {
          message: "終了日は開始日以降の日付を設定してください",
        },
        400
      );
    }

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    if (diffDays > 14) {
      return c.json(
        {
          message: "旅行期間は14日間以内に収まるように設定してください",
        },
        400
      );
    }

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `
      INSERT INTO trips (
        user_id,
        title,
        start_date,
        end_date,
        description
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [userId, title.trim(), start_date, end_date, description?.trim() || null]
    );

    return c.json(
      {
        id: result.insertId,
        user_id: userId,
        title: title.trim(),
        start_date,
        end_date,
        description: description?.trim() || null,
      },
      201
    );
  } catch (error) {
    console.error(error);

    return c.json(
      {
        message: "Failed to create trip",
      },
      500
    );
  }
});

// GET /api/trips/:id
trips.get("/:id", async (c) => {
  try {
    const user = c.get("user");
    const userId = Number(user.sub);

    const tripId = Number(c.req.param("id"));

    if (!Number.isInteger(tripId)) {
      return c.json({ message: "不正な旅行IDです" }, 400);
    }

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `
      SELECT
        id,
        user_id,
        title,
        start_date,
        end_date,
        description
      FROM trips
      WHERE id = ?
        AND user_id = ?
      `,
      [tripId, userId]
    );

    const trip = rows[0];

    if (!trip) {
      return c.json({ message: "旅行が見つかりません" }, 404);
    }

    return c.json(trip);
  } catch (error) {
    console.error(error);

    return c.json({ message: "Failed to fetch trip" }, 500);
  }
});

// PUT /api/trips/:id
trips.put("/:id", async (c) => {
  try {
    const user = c.get("user");
    const userId = Number(user.sub);

    const tripId = Number(c.req.param("id"));

    if (!Number.isInteger(tripId)) {
      return c.json({ message: "不正な旅行IDです" }, 400);
    }

    const body = await c.req.json();

    const { title, start_date, end_date, description } = body;

    // 必須チェック
    if (!title?.trim() || !start_date || !end_date) {
      return c.json(
        {
          message: "必須項目が入力されていません",
        },
        400
      );
    }

    const start = new Date(`${start_date}T00:00:00`);
    const end = new Date(`${end_date}T00:00:00`);

    // 終了日が開始日より前
    if (end < start) {
      return c.json(
        {
          message: "終了日は開始日以降の日付を設定してください",
        },
        400
      );
    }

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    if (diffDays > 14) {
      return c.json(
        {
          message: "旅行期間は14日間以内に収まるように設定してください",
        },
        400
      );
    }

    const [itineraryRows] = await pool.query<mysql.RowDataPacket[]>(
      `
        SELECT COUNT(*) AS count
        FROM itinerary_items
        WHERE trip_id = ?
          AND (scheduled_date < ? OR scheduled_date > ?)
      `,
      [tripId, start_date, end_date]
    );

    if (Number(itineraryRows[0].count) > 0) {
      return c.json(
        {
          message: "旅行期間外になる旅程があります。先に旅程の日付を変更または削除してください",
        },
        409
      );
    }

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `
      UPDATE trips
      SET
        title = ?,
        start_date = ?,
        end_date = ?,
        description = ?
      WHERE id = ?
        AND user_id = ?
      `,
      [title.trim(), start_date, end_date, description?.trim() || null, tripId, userId]
    );

    if (result.affectedRows === 0) {
      return c.json({ message: "旅行が見つかりません" }, 404);
    }

    return c.json({
      id: tripId,
      user_id: userId,
      title: title.trim(),
      start_date,
      end_date,
      description: description?.trim() || null,
    });
  } catch (error) {
    console.error(error);

    return c.json(
      {
        message: "Failed to update trip",
      },
      500
    );
  }
});

// DELETE /api/trips/:id
trips.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    const userId = Number(user.sub);

    const tripId = Number(c.req.param("id"));

    if (!Number.isInteger(tripId)) {
      return c.json({ message: "不正な旅行IDです" }, 400);
    }

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `
      DELETE FROM trips
      WHERE id = ?
        AND user_id = ?
      `,
      [tripId, userId]
    );

    if (result.affectedRows === 0) {
      return c.json({ message: "旅行が見つかりません" }, 404);
    }

    return c.body(null, 204);
  } catch (error) {
    console.error(error);

    return c.json({ message: "Failed to delete trip" }, 500);
  }
});

export default trips;
