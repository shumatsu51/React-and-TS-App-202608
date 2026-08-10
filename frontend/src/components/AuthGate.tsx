import { useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types/user";
import { useAuth } from "../context/useAuth";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

type Props = {
  children: ReactNode;
};

// 未ログインの場合はログイン・新規登録フォームを表示し、
// ログイン済みの場合はヘッダー（ログアウトボタン付き）と children を表示する。
const AuthGate = ({ children }: Props) => {
  const { user, isLoading, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");

  // ログアウトしたら次回は常にログインフォームから始める。
  // useEffect ではなく、レンダー中に前回の user と比較して state を調整する
  // （https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes）
  const [prevUser, setPrevUser] = useState<User | null>(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (!user) {
      setMode("login");
    }
  }

  if (isLoading) {
    return <p className="text-center text-gray-400 py-10">読み込み中...</p>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        {mode === "login" ? (
          <LoginForm onSwitchToSignup={() => setMode("signup")} />
        ) : (
          <SignupForm onSwitchToLogin={() => setMode("login")} />
        )}
      </div>
    );
  }

  return (
    <div>
      <header className="flex items-center justify-between max-w-xl mx-auto px-4 pt-6 text-sm text-gray-500">
        <span>{user.email}</span>
        <button onClick={() => void logout()} className="text-blue-500 hover:underline">
          ログアウト
        </button>
      </header>
      {children}
    </div>
  );
};

export default AuthGate;
