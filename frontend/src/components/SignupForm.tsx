import { useState } from "react";
import { useAuth } from "../context/useAuth";

type Props = {
  onSwitchToLogin: () => void;
};

const SignupForm = ({ onSwitchToLogin }: Props) => {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signup({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 max-w-sm mx-auto">
      <h2 className="text-xl font-bold text-gray-800 text-center">新規登録</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
        required
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード（8文字以上）"
        required
        minLength={8}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? "登録中..." : "登録する"}
      </button>
      <p className="text-center text-sm text-gray-500">
        アカウントをお持ちの方は{" "}
        <button type="button" onClick={onSwitchToLogin} className="text-blue-500 hover:underline">
          ログイン
        </button>
      </p>
    </form>
  );
};

export default SignupForm;
