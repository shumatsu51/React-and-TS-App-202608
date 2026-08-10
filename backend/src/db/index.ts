import mysql from "mysql2/promise";
import type { PoolConnection } from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  database: process.env.DATABASE_NAME ?? "appdb",
  user: process.env.DATABASE_USER ?? "appuser",
  password: process.env.DATABASE_PASSWORD ?? "apppassword",
  waitForConnections: true,
  connectionLimit: 10,
});

// pool.on('connection') は新しい TCP 接続が確立されたタイミングで発火する。
// charset オプションが環境によって無視されるケースがあるため、
// ここで SET NAMES を明示的に実行して文字コードを確実に utf8mb4 に設定する。
pool.on("connection", (connection: PoolConnection): void => {
  void connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
});

export default pool;
