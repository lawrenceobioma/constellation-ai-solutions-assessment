import { useState } from "react";
import { apiRequest } from "./api.js";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      onLogin(data.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="center-page">
      <section className="card login-card">
        <h1>Constellation Login</h1>
        <p className="muted">Sign in to preview the data and ask questions.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="credentials-note">
          <strong>Authentication is required for access</strong>
        </div>
      </section>
    </main>
  );
}
