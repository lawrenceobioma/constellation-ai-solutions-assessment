import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import sqlite3Package from "sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const sqlite3 = sqlite3Package.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const SERVER_PORT = 5000;
const CLIENT_ORIGIN = "http://localhost:3000";
const JWT_SECRET = crypto.randomBytes(64).toString("hex");
const DB_PATH = process.env.SQLITE_DB_PATH;
const GEMINI_MODEL = "gemini-2.5-flash";

if (!DB_PATH) {
  throw new Error("SQLITE_DB_PATH is required in server/.env");
}

const HARD_CODED_EMAIL = "example@helloconstellation.com";
const HARD_CODED_PASSWORD = "ConstellationInterview123!";
const HARD_CODED_USER = {
  name: "Example User",
  email: HARD_CODED_EMAIL
};

const resolvedDbPath = path.isAbsolute(DB_PATH)
  ? DB_PATH
  : path.resolve(__dirname, "..", DB_PATH);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true
  })
);

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function openDatabase(databasePath) {
  return new sqlite3.Database(databasePath);
}

function runStatement(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function handleRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve(this);
    });
  });
}

function runAll(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function closeDatabase(database) {
  return new Promise((resolve, reject) => {
    database.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function createSampleDatabaseIfMissing(databasePath) {
  if (fs.existsSync(databasePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const sampleDb = openDatabase(databasePath);

  await runStatement(
    sampleDb,
    `CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      signup_date TEXT NOT NULL,
      revenue REAL NOT NULL
    )`
  );

  const sampleRows = [
    ["Ava Thompson", "New York", "NY", "2024-01-15", 250.75],
    ["Marcus Lee", "Philadelphia", "PA", "2024-02-03", 125.4],
    ["Nina Patel", "New York", "NY", "2024-03-22", 480.1],
    ["David Kim", "Boston", "MA", "2024-04-12", 310.0],
    ["Sophia Brown", "Chicago", "IL", "2024-04-29", 95.25],
    ["Ethan Davis", "Philadelphia", "PA", "2024-05-06", 210.6],
    ["Maya Johnson", "New York", "NY", "2024-06-18", 700.8],
    ["Daniel Garcia", "Miami", "FL", "2024-07-11", 180.5]
  ];

  for (const row of sampleRows) {
    await runStatement(
      sampleDb,
      "INSERT INTO customers (name, city, state, signup_date, revenue) VALUES (?, ?, ?, ?, ?)",
      row
    );
  }

  await closeDatabase(sampleDb);
}

await createSampleDatabaseIfMissing(resolvedDbPath);
const db = openDatabase(resolvedDbPath);

function requireAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function getTableNames() {
  const rows = await runAll(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );

  return rows.map((row) => row.name);
}

async function getFirstTableName() {
  const tableNames = await getTableNames();

  if (!tableNames.length) {
    throw new Error("No user tables found in SQLite database");
  }

  return tableNames[0];
}

async function getSchemaText() {
  const tableNames = await getTableNames();
  const schemaParts = [];

  for (const tableName of tableNames) {
    const safeTableName = quoteIdentifier(tableName);
    const columns = await runAll(db, `PRAGMA table_info(${safeTableName})`);
    const columnText = columns
      .map((column) => `${column.name} ${column.type || "UNKNOWN"}`)
      .join(", ");

    schemaParts.push(`${tableName}(${columnText})`);
  }

  return schemaParts.join("\n");
}

function cleanModelText(response) {
  if (!response) {
    return "";
  }

  if (typeof response.text === "function") {
    return response.text();
  }

  return response.text || "";
}

function extractJsonObject(text) {
  const cleaned = String(text)
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Model did not return valid JSON");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function validateReadOnlySql(sql) {
  const trimmed = String(sql || "").trim().replace(/;+\s*$/g, "");

  if (!/^select\b/i.test(trimmed)) {
    throw new Error("Only SELECT queries are allowed");
  }

  if (trimmed.includes(";")) {
    throw new Error("Only one SQL statement is allowed");
  }

  const forbiddenPattern = /\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma|vacuum|reindex|begin|commit|rollback)\b/i;

  if (forbiddenPattern.test(trimmed)) {
    throw new Error("The generated SQL contains a forbidden keyword");
  }

  return trimmed;
}

async function generateSqlFromQuestion(question) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from server/.env");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const schemaText = await getSchemaText();

  const prompt = `You are a SQLite SQL generator for a local data analysis app.

Use only this database schema:
${schemaText}

Rules:
- Return only JSON.
- The JSON shape must be: {"sql":"SELECT ..."}
- Generate exactly one read-only SQLite SELECT statement.
- Do not use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, PRAGMA, ATTACH, DETACH, or multiple statements.
- Do not invent tables or columns.
- For list-style questions, limit the result to 50 rows unless the user asks for a smaller limit.
- Prefer aggregate queries for count, average, minimum, maximum, and grouped questions.

User question: ${question}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: 0
    }
  });

  const rawText = cleanModelText(response);
  const parsed = extractJsonObject(rawText);
  const sql = validateReadOnlySql(parsed.sql);

  return sql;
}

async function generateAnswerFromRows(question, sql, rows) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from server/.env");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const rowsForPrompt = rows.slice(0, 50);
  const wasTruncated = rows.length > rowsForPrompt.length;

  const prompt = `Answer the user's data question clearly and briefly.

User question:
${question}

SQL that was executed:
${sql}

Query result rows as JSON:
${JSON.stringify(rowsForPrompt)}

Was the result truncated before sending to you? ${wasTruncated ? "Yes" : "No"}

Rules:
- Base the answer only on the query result rows.
- If the answer is a count, average, sum, min, or max, state it directly.
- If rows were truncated, mention that only the first ${rowsForPrompt.length} rows are shown.
- Do not mention implementation details unless necessary.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: 0.2
    }
  });

  return cleanModelText(response).trim();
}

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};

  const isValid = email === HARD_CODED_EMAIL && password === HARD_CODED_PASSWORD;

  if (!isValid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign(HARD_CODED_USER, JWT_SECRET, {
    expiresIn: "2h"
  });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 2 * 60 * 60 * 1000
  });

  return res.json({ user: HARD_CODED_USER });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ success: true });
});

app.get("/api/me", requireAuth, (req, res) => {
  return res.json({
    user: {
      name: req.user.name,
      email: req.user.email
    }
  });
});

app.get("/api/table", requireAuth, async (req, res) => {
  try {
    const tableName = req.query.table || (await getFirstTableName());
    const tableNames = await getTableNames();

    if (!tableNames.includes(tableName)) {
      return res.status(400).json({ error: "Unknown table name" });
    }

    const safeTableName = quoteIdentifier(tableName);
    const columnsInfo = await runAll(db, `PRAGMA table_info(${safeTableName})`);
    const columns = columnsInfo.map((column) => column.name);
    const rows = await runAll(db, `SELECT * FROM ${safeTableName}`);

    return res.json({
      tableName,
      tableNames,
      columns,
      rows
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to read SQLite database",
      details: error.message
    });
  }
});

app.post("/api/chat", requireAuth, async (req, res) => {
  try {
    const { question } = req.body || {};

    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const sql = await generateSqlFromQuestion(String(question).trim());
    const rows = await runAll(db, sql);
    const answer = await generateAnswerFromRows(String(question).trim(), sql, rows);

    return res.json({
      question,
      sql,
      answer,
      rowCount: rows.length,
      rowsPreview: rows.slice(0, 20)
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to process chat question",
      details: error.message
    });
  }
});

app.get("/api/health", (req, res) => {
  return res.json({
    ok: true,
    databasePath: resolvedDbPath
  });
});

app.listen(SERVER_PORT, () => {
  console.log(`Server running on http://localhost:${SERVER_PORT}`);
  console.log(`SQLite database path: ${resolvedDbPath}`);
});
