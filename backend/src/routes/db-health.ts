import { Hono } from "hono";
import pool from "../db";

const dbHealth = new Hono();

dbHealth.get("/", async (c) => {
  try {
    await pool.query("SELECT 1");

    return c.json({
      status: "ok",
      database: "ok",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return c.json(
      {
        status: "error",
        database: "error",
      },
      500
    );
  }
});

export default dbHealth;
