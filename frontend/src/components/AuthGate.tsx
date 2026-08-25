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
// ログイン済みの場合は children を表示する。
// アカウント操作は App の固定ヘッダーで提供する。
const AuthGate = ({ children }: Props) => {
  const { user, isLoading } = useAuth();
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

  return <>{children}</>;
};

export default AuthGate;
