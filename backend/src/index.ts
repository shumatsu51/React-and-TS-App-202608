import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth.js";
import health from "./routes/health.js";
import dbHealth from "./routes/db-health.js";
import trips from "./routes/trips.js";
import tripPlaces from "./routes/trip-places.js";

const app = new Hono();

// CORS 設定（開発環境ではフロントエンドの開発サーバーからのリクエストを許可）
// credentials: true でログイン用 Cookie をクロスオリジンでも送受信できるようにする
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    credentials: true,
  })
);

// ルーターを登録
app.route("/api/auth", auth);
app.route("/api/health", health);
app.route("/api/db-health", dbHealth);
app.route("/api/trips", trips);
app.route("/api/trip-places", tripPlaces);

// サーバーの起動
const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
