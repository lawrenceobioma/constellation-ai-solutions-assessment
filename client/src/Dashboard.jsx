import { useEffect, useState } from "react";
import { apiRequest } from "./api.js";

export default function Dashboard({ user, onLogout }) {
  const [tableData, setTableData] = useState(null);
  const [tableError, setTableError] = useState("");
  const [question, setQuestion] = useState("What vehicle's make and model is most offered?");
  const [chatResult, setChatResult] = useState(null);
  const [chatError, setChatError] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    async function loadTable() {
      try {
        const data = await apiRequest("/api/table");
        setTableData(data);
      } catch (error) {
        setTableError(error.message);
      }
    }

    loadTable();
  }, []);

  async function handleLogout() {
    await apiRequest("/api/logout", {
      method: "POST"
    });

    onLogout();
  }

  async function handleAsk(event) {
    event.preventDefault();
    setChatError("");
    setChatResult(null);
    setIsAsking(true);

    try {
      const data = await apiRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({ question })
      });

      setChatResult(data);
    } catch (error) {
      setChatError(error.message);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Logged in as <strong>{user.name}</strong></p>
        </div>

        <button className="secondary-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Data Table Preview</h2>
            {tableData && <p className="muted">Table: {tableData.tableName}</p>}
          </div>
        </div>

        {tableError && <p className="error">{tableError}</p>}
        {!tableData && !tableError && <p>Loading table...</p>}

        {tableData && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {tableData.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tableData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {tableData.columns.map((column) => (
                      <td key={column}>{String(row[column] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>AI-Powered Chat</h2>
        <p className="muted">
          Ask a plain-English question. The backend asks Gemini to generate SQL, validates it,
          runs it against SQLite, and returns a readable answer.
        </p>

        <form className="chat-form" onSubmit={handleAsk}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
            placeholder="Example: What vehicle's make and model is most offered?"
          />

          <button type="submit" disabled={isAsking || !question.trim()}>
            {isAsking ? "Asking..." : "Ask"}
          </button>
        </form>

        {chatError && <p className="error">{chatError}</p>}

        {chatResult && (
          <div className="chat-result">
            <h3>Answer</h3>
            <p>{chatResult.answer}</p>

            <details>
              <summary>Show generated SQL and preview rows</summary>
              <pre>{chatResult.sql}</pre>
              <pre>{JSON.stringify(chatResult.rowsPreview, null, 2)}</pre>
            </details>
          </div>
        )}
      </section>
    </main>
  );
}
