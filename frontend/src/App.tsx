import { useAuth } from "./context/useAuth";

// ログイン後に表示されるメイン画面。
// ここに自分のアプリの機能を実装していく。
const App = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">ようこそ！</h1>
        <p className="text-gray-600">
          {user?.email} さんとしてログイン中です。
          <br />
          ここから自分のアプリ機能を実装していきましょう。
        </p>
      </div>
    </div>
  );
};

export default App;
