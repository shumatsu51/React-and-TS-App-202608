import { useEffect, useState } from "react";
import { useAuth } from "./context/useAuth";
import TripListPages from "./pages/TripListPages";

type HealthResponse = {
  backend: string;
  database: string;
};

// ログイン後に表示されるメイン画面。
// ここに自分のアプリの機能を実装していく。
export default function App() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch(
          "http://localhost:3000/api/health",
        );

        if (!response.ok) {
          throw new Error("API request failed");
        }

        const data: HealthResponse = await response.json();

        setHealth(data);
      } catch (error) {
        console.error(error);
        setError("接続に失敗しました");
      }
    };

    fetchHealth();
  }, []);

  if (error) {
    return <div>{error}</div>;
  }

  if (!health) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">ようこそ！</h1>
        <p className="text-gray-600">
          {user?.email} さんとしてログイン中です。
          <br />
          ここから自分のアプリ機能を実装していきましょう。
        </p>
        <br />
        <TripListPages/>
      </div>
    </div>
  );
};