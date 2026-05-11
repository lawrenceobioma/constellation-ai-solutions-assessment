import { useEffect, useState } from "react";
import { apiRequest } from "./api.js";
import LoginPage from "./LoginPage.jsx";
import Dashboard from "./Dashboard.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await apiRequest("/api/me");
        setUser(data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  if (isCheckingAuth) {
    return (
      <main className="center-page">
        <p>Checking login...</p>
      </main>
    );
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
