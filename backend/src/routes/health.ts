import { Hono } from "hono";

const health = new Hono();

// GET /api/health - ALB のヘルスチェックや死活監視用のエンドポイント
// DB 接続には依存させず、サーバープロセスが応答できるかだけを確認する
health.get("/", (c) => c.json({ status: "ok" }));

export default health;
