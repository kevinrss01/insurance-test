Opal Project Requirements (MVP)
===============================

Purpose
-------
Build an MVP insurance claims intake and triage assistant. The system lets a claims agent create a structured claim, view lists/details, and manually trigger AI generation for summary + triage + missing info questions. AI must never run automatically; it only runs when a user clicks the explicit button.

Scope (must have)
-----------------
1) Create claim with required structured fields and attachments URLs.
2) View claim list with filters and detail page.
3) Manual AI generation with version history.
4) Local database, easy to start for any dev.
5) Dockerfile(s) and optional docker-compose for one-command start.

Non-goals
---------
- No login/authentication system.
- No file upload (attachments are URLs only).
- No background/cron processing.

Stack Alignment (based on repo)
-------------------------------
- Frontend: Next.js App Router + TypeScript + Tailwind + shadcn/ui.
- Backend: NestJS + TypeScript.
- DB: SQLite file stored locally (simple, zero external services).
- AI: AI SDK + AI Gateway. Model must be `google/gemini-3-flash` with low reasoning and a max reasoning token cap (see backend requirements for exact config and doc-fetch rule).

Project Structure
-----------------
- /frontend -> Next.js app
- /backend -> NestJS app
- /docs/requirements_opal.md (this file)
- /docs/requirements_backend.md
- /docs/requirements_frontend.md

Two-Developer Parallel Work Contract
------------------------------------
Backend and frontend must be buildable in parallel. The API contract below is the single source of truth for integration. Frontend must include a mock API adapter (feature flag) so UI can be built and validated without backend availability.

API Contract Summary (authoritative)
------------------------------------
Base URL: http://localhost:4000 (backend dev server)
All responses are JSON.

Endpoints:
- POST /claims
- GET /claims?type=&status=&q=&limit=&cursor=
- GET /claims/:id
- POST /claims/:id/ai:generate
- GET /claims/:id/ai
- GET /health

See /docs/requirements_backend.md for exact request/response shapes, error format, and examples.

Local Dev Setup Requirements
----------------------------
- One command start for each service.
- One command to start both (docker-compose or root-level script).
- DB auto-creates on first run with migrations.
- Seed command to add 3-5 sample claims.

MCP + Skills Usage Requirements
-------------------------------
All agents must use available MCPs and skills where applicable:
- Frontend: use Next.js MCP for runtime insight and shadcn MCP to add components and examples.
- Backend: use docs/tools MCPs if available; fetch official docs before implementing AI SDK + AI Gateway usage.
- Skills: if a task matches a listed skill, use it (per AGENTS/skills guidance). If a skill is not relevant, state why.

Acceptance Criteria
-------------------
- App runs locally with minimal setup.
- Claim creation, list, detail, and AI generation work end-to-end.
- AI generation only occurs on explicit button click.
- AI version history is visible per claim.
- No authentication present.
- Code is organized and documented enough for handoff to another developer.
