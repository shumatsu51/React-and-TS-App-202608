import { Hono } from "hono";
import mysql from "mysql2/promise";

import pool from "../db/index.js";
import { requireAuth, type AuthEnv } from "../middleware/auth.js";

const tripPlaces = new Hono<AuthEnv>();

tripPlaces.use("/*", requireAuth);

// GET /api/trips/:tripid
tripPlaces.get("/trips/:tripid", async (c) => {
  try {
    const user = c.get("user");
    const userId = Number(user.sub);
    const tripId = Number(c.req.param("tripid"));

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `
      SELECT
        tp.id,
        tp.trip_id,
        tp.name,
        tp.is_visited
      FROM trip_places tp
      INNER JOIN trips t
        ON tp.trip_id = t.id
      WHERE tp.trip_id = ?
        AND t.user_id = ?
      ORDER BY tp.id
      `,
      [tripId, userId]
    );
    return c.json(rows);
  } catch (error) {
    console.error(error);

    return c.json({ message: "場所一覧の取得に失敗しました" }, 500);
  }
});

// POST  /api/trips/:tripId/places
tripPlaces.post("/trips/:tripId", async (c) => {
  try {
    const user = c.get("user");
    const userId = Number(user.sub);
    const tripId = Number(c.req.param("tripId"));

    const body = await c.req.json();
    const name = body.name?.trim();

    if (!name) {
      return c.json({ message: "場所名を入力してください" }, 400);
    }

    const [tripRows] = await pool.query<mysql.RowDataPacket[]>(
      `
      SELECT id
      FROM trips
      WHERE id = ?
        AND user_id = ?
      `,
      [tripId, userId]
    );

    if (tripRows.length === 0) {
      return c.json({ message: "旅行が見つかりません" }, 404);
    }

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `
        INSERT INTO trip_places (
          trip_id,
          name
        )
        VALUES (?, ?)
        `,
      [tripId, name]
    );

    return c.json(
      {
        id: result.insertId,
        trip_id: tripId,
        name,
        is_visited: false,
      },
      201
    );
  } catch (error) {
    console.error(error);

    return c.json({ message: "場所の追加に失敗しました" }, 500);
  }
});

// PUT /api/trip-places/:id
tripPlaces.put("/:id", async (c) => {
  try {
    const user = c.get("user");
    const userId = Number(user.sub);
    const placeId = Number(c.req.param("id"));

    const body = await c.req.json();

    const isVisited = Boolean(body.is_visited);

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `
        UPDATE trip_places tp
        INNER JOIN trips t
          ON tp.trip_id = t.id
        SET tp.is_visited = ?
        WHERE tp.id = ?
          AND t.user_id = ?
        `,
      [isVisited, placeId, userId]
    );

    if (result.affectedRows === 0) {
      return c.json({ message: "場所が見つかりません" }, 404);
    }

    return c.json({
      id: placeId,
      is_visited: isVisited,
    });
  } catch (error) {
    console.error(error);

    return c.json({ message: "場所の更新に失敗しました" }, 500);
  }
});

//DELETE /api/trip-places/:id
tripPlaces.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    const userId = Number(user.sub);
    const placeId = Number(c.req.param("id"));

    const [result] = await pool.query<mysql.ResultSetHeader>(
      `
        DELETE tp
        FROM trip_places tp
        INNER JOIN trips t
          ON tp.trip_id = t.id
        WHERE tp.id = ?
          AND t.user_id = ?
        `,
      [placeId, userId]
    );

    if (result.affectedRows === 0) {
      return c.json({ message: "場所が見つかりません" }, 404);
    }

    return c.body(null, 204);
  } catch (error) {
    console.error(error);

    return c.json({ message: "場所の削除に失敗しました" }, 500);
  }
});

export default tripPlaces;
