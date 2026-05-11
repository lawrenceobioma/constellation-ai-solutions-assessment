<div align="center">
  <img src="constellationsoftware-icon.png" alt="Constellation" width="220" />
  <br /><br />
</div>

# AI Solutions Analyst — Technical Assessment

Please use the following repository as a template: [Constellation-Engineering/ai-tigers-technical](https://github.com/Constellation-Engineering/ai-tigers-technical)

Welcome to the Constellation AI Solutions Analyst technical assessment. We are excited to see your skills in action.

This assessment is designed to evaluate a range of practical skills you will use day-to-day as an AI Solutions Analyst: authentication fundamentals, working with external APIs, basic prompt engineering, and the ability to ship functional software quickly. Everyone here leverages AI tooling to accelerate development — we expect you to do the same.

> **Note on UI/UX:** This project is judged purely on functionality. Do not spend time polishing the interface. We care about robust backend logic, correct data flow, and problem-solving ability.

---

## The Task

Build a locally-runnable web application in any language/framework of your choosing. The application must satisfy the following three areas of functionality.

---

## Features to Implement

### 1. Authentication

Implement a basic login screen with a simple hardcoded credential check. No real authentication infrastructure is expected (no password hashing, no user database, no OAuth, etc.). The login should accept **only** these exact credentials:

| Field    | Value                            |
| -------- | -------------------------------- |
| Email    | `example@helloconstellation.com` |
| Password | `ConstellationInterview123!`     |

- A plain string comparison against the hardcoded values above is sufficient.
- On successful login, generate and store a **JWT token** to manage the session.
- The authenticated user's name (e.g., "Example User") must be visible in the UI after login.
- All routes beyond the login screen must be protected — unauthenticated requests should redirect to login.

---

### 2. Data Table Preview

You will be provided with a `.db` file (SQLite) containing a dataset. Once authenticated, the user must be able to:

- View the data in a **scrollable table** that previews all rows and columns.
- The table must load the data directly from the provided `.db` file — no external database setup required.

---

### 3. AI-Powered Chat Interface

Below the data table, implement a plain-English chat input. The user should be able to type a question about the data (e.g., *"How many records are from New York?"* or *"What is the average value in column X?"*) and receive a response.

**Requirements:**

- Use the **Google Gemini API** as the underlying model. Your API key must be read from an environment variable — **do not hardcode or commit it**.
- The AI agent must translate the user's natural language question into a SQL query, run it against the `.db` file, and return a clear, human-readable answer.
- The parsing, querying, and response logic must be handled programmatically — no passing raw HTML or full table dumps to the model.

---

## Submission Requirements

Your submission consists of three parts:

### (1) Infrastructure Writeup

In your README, provide a brief writeup (a few paragraphs is fine) covering:

- What technologies and libraries you chose and why.
- How the authentication flow works end-to-end (login → JWT → protected routes).
- How the AI chat pipeline works (user query → SQL generation → execution → response).

### (2) Scale & Production Design

In the same document, address the following (again, a few paragraphs is sufficient):

- If this application were deployed to support **hundreds of monthly active users**, what architectural changes would you make?
- How would you handle **security** at scale (token management, secrets, rate limiting, etc.)?
- What observability or monitoring would you add?

### (3) Public GitHub Repository

Use the **"Use this template"** button on this repository to create your own public repo, then build your solution there. Your repository must include:

- A new `README.md` (replacing this one) with clear instructions to run the project locally.
- All required environment variables documented (names, purpose, and where to obtain them — but not the values themselves).
- The hardcoded credentials listed above so the reviewer can log in without any additional setup.
- A working application reachable at `localhost:3000` (or equivalent) after following your README.

Submit the link to your repository when complete.

---

## Evaluation Criteria

| Area                        | What We Are Looking For                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------- |
| Authentication & JWT        | Correct implementation of login flow and token-based session management                 |
| Data Handling               | Ability to read from a SQLite file and surface data cleanly                             |
| AI Integration              | Structured prompting, SQL generation, and clean response formatting via Gemini          |
| Code Quality & Organization | Readable, organized code — not perfect, but maintainable                                |
| Version Control             | Meaningful commits, clean repo structure                                                |
| Documentation               | Clear README, infrastructure writeup, and scale discussion                              |

---

## Notes

- **AI use is not only allowed, but strongly encouraged.** A large part of this role is the ability to leverage tools like Cursor, GitHub Copilot, and AI agents to ship quickly. This project would take significantly longer than necessary without them.
- Do not worry about deploying the application — local execution is sufficient.
- If you have any questions about the requirements, use your best judgment and document your assumptions.

---

*Good luck — we look forward to reviewing your solution.*
