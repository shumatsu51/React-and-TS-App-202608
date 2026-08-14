import { useEffect, useState } from "react";

type HealthResponse = {
  backend: string;
  database: string;
};

export default function App() {
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
    <main>
      <h1>Connection Test</h1>
      <p>Backend: {health.backend}</p>
      <p>Database: {health.database}</p>
    </main>
  );
};

