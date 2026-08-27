import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";

import { useAuth } from "./context/useAuth";

const usesFirebaseAuth = import.meta.env.VITE_AUTH_PROVIDER === "firebase";

export default function App() {
  const { user, logout } = useAuth();

  const [isBackendReady, setIsBackendReady] = useState(usesFirebaseAuth);
  const [error, setError] = useState<string | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (usesFirebaseAuth) {
      return;
    }

    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/health");

        if (!response.ok) {
          throw new Error("API request failed");
        }

        setIsBackendReady(true);
      } catch (error) {
        console.error(error);
        setError("接続に失敗しました");
      }
    };

    fetchHealth();
  }, []);

  useEffect(() => {
    const closeMenuWhenClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    if (isAccountMenuOpen) {
      document.addEventListener("mousedown", closeMenuWhenClickOutside);
    }

    return () => document.removeEventListener("mousedown", closeMenuWhenClickOutside);
  }, [isAccountMenuOpen]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!isBackendReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm font-medium text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 z-50 h-24 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/trips" className="group cursor-pointer">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 transition-colors group-hover:text-blue-600">
              Triply
            </h1>

            <p className="mt-1 text-sm text-gray-500 transition-colors group-hover:text-gray-700">
              旅行の予定を管理しましょう
            </p>
          </Link>
          {user && (
            <div
              ref={accountMenuRef}
              className="relative"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsAccountMenuOpen(false);
                }
              }}
            >
              <button
                type="button"
                aria-label="アカウントメニューを開く"
                aria-expanded={isAccountMenuOpen}
                aria-controls="account-menu"
                onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current stroke-2"
                >
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5.5 20c.6-3.2 3.2-5 6.5-5s5.9 1.8 6.5 5" />
                </svg>
              </button>

              {isAccountMenuOpen && (
                <div
                  id="account-menu"
                  role="menu"
                  aria-label="アカウントメニュー"
                  className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-lg"
                >
                  <p className="break-all px-3 py-2 text-sm text-gray-600">{user.email}</p>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void logout()}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-24 pb-10 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
