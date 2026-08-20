import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { useAuth } from "./context/useAuth";

type HealthResponse = {
  backend: string;
  database: string;
};

export default function App() {
  const { user } = useAuth();

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/health");

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm font-medium text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">My trip, Your trip</h1>

            <p className="mt-1 text-sm text-gray-500">旅行の予定を管理しましょう</p>
          </div>

          {user?.email && (
            <div className="hidden rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600 sm:block">
              {user.email}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-32 pb-10 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
