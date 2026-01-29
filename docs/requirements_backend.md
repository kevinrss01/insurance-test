Backend Requirements (NestJS)
=============================

Goal
----
Implement the API, persistence, and AI pipeline for the claims MVP. The backend must be usable independently by the frontend team from day one via a stable, versioned API contract.

Hard Requirements
-----------------
- Framework: NestJS + TypeScript.
- Database: local SQLite file, no external services. Must be auto-created with migrations.
- AI: must use AI SDK + AI Gateway. AI is only invoked by a button-triggered endpoint (no automatic generation).
- Model: use `google/gemini-3-flash` with low reasoning and a maximum reasoning token cap. The exact config must be confirmed from official docs BEFORE implementation.
- Output: AI responses must be strict JSON conforming to a schema and validated server-side.
- No authentication.
- Dockerfile present and runnable.

Local Dev UX (must be easy)
---------------------------
- `pnpm install` then `pnpm start:dev` to run.
- One command to run migrations and seed.
- SQLite DB stored at `backend/data/opal.sqlite` (gitignored).
- Provide `.env.example` with all required variables.

Data Model (SQLite + Prisma)
----------------------------
Use Prisma for schema/migrations. Keep it simple and explicit.

Tables:
1) claims
- id: string (cuid)
- policyNumber: string
- claimType: 'auto' | 'home' | 'travel'
- incidentDate: string (ISO date, YYYY-MM-DD)
- location: string
- description: string
- estimatedAmount: number (integer cents)
- status: 'NEW' | 'IN_REVIEW' | 'RESOLVED'
- attachments: string[] (URLs)
- createdAt: datetime
- updatedAt: datetime

2) claim_ai_versions
- id: string (cuid)
- claimId: string (FK -> claims.id)
- createdAt: datetime
- model: string
- promptVersion: string (e.g. "v1")
- responseJson: json
- latencyMs: number
- tokenUsage: json (optional)

Indexes:
- claims: index on (claimType, status)
- claim_ai_versions: index on (claimId, createdAt desc)

Validation and Serialization
----------------------------
- Use Zod schemas for request validation and AI output validation.
- Convert `estimatedAmount` between dollars (API) and cents (DB).
- Reject attachments that are not valid URLs.
- Sanitize and trim strings; preserve original casing.

API Contract (authoritative)
----------------------------
Base URL: http://localhost:4000
Content-Type: application/json

Standard Error Shape (all 4xx/5xx):
{
  "error": {
    "code": "VALIDATION_ERROR" | "NOT_FOUND" | "AI_ERROR" | "INTERNAL_ERROR",
    "message": "Human readable summary",
    "details": { ... } | null
  }
}

1) POST /claims
Request:
{
  "policyNumber": "PN-12345",
  "claimType": "auto",
  "incidentDate": "2026-01-20",
  "location": "Austin, TX",
  "description": "Rear-ended at a stop light",
  "estimatedAmount": 1250.50,
  "attachments": ["https://example.com/photo1.jpg"]
}

Response 201:
{
  "id": "clm_...",
  "policyNumber": "PN-12345",
  "claimType": "auto",
  "incidentDate": "2026-01-20",
  "location": "Austin, TX",
  "description": "Rear-ended at a stop light",
  "estimatedAmount": 1250.50,
  "status": "NEW",
  "attachments": ["https://example.com/photo1.jpg"],
  "createdAt": "2026-01-29T12:00:00.000Z",
  "updatedAt": "2026-01-29T12:00:00.000Z"
}

2) GET /claims?type=&status=&q=&limit=&cursor=
- type: auto|home|travel
- status: NEW|IN_REVIEW|RESOLVED
- q: search string (policyNumber or location substring)
- limit: number (default 20, max 100)
- cursor: opaque id for pagination

Response 200:
{
  "items": [ClaimSummary],
  "nextCursor": "clm_..." | null
}

ClaimSummary:
{
  "id": "clm_...",
  "policyNumber": "PN-12345",
  "claimType": "auto",
  "incidentDate": "2026-01-20",
  "estimatedAmount": 1250.50,
  "status": "NEW",
  "createdAt": "2026-01-29T12:00:00.000Z"
}

3) GET /claims/:id
Response 200:
{
  "claim": ClaimFull,
  "latestAi": ClaimAiVersion | null
}

ClaimFull:
{
  "id": "clm_...",
  "policyNumber": "PN-12345",
  "claimType": "auto",
  "incidentDate": "2026-01-20",
  "location": "Austin, TX",
  "description": "Rear-ended at a stop light",
  "estimatedAmount": 1250.50,
  "status": "NEW",
  "attachments": ["https://example.com/photo1.jpg"],
  "createdAt": "2026-01-29T12:00:00.000Z",
  "updatedAt": "2026-01-29T12:00:00.000Z"
}

ClaimAiVersion:
{
  "id": "aiv_...",
  "claimId": "clm_...",
  "createdAt": "2026-01-29T12:05:00.000Z",
  "model": "gemini-...",
  "promptVersion": "v1",
  "response": {
    "summary_bullets": ["..."],
    "triage": "FAST_TRACK" | "ADJUSTER_REVIEW" | "FRAUD_REVIEW",
    "rationale_bullets": ["..."],
    "missing_info_questions": ["..."],
    "confidence": 0.0
  },
  "latencyMs": 1234,
  "tokenUsage": { "prompt": 123, "completion": 456, "total": 579 }
}

4) POST /claims/:id/ai:generate
- This endpoint is ONLY called when the user clicks the button.
Request body: empty {}

Response 201: ClaimAiVersion (same shape as above)

5) GET /claims/:id/ai
Response 200:
{
  "latest": ClaimAiVersion | null,
  "history": [ClaimAiVersion]
}

6) GET /health
Response 200:
{ "status": "ok" }

AI Pipeline Requirements
------------------------
- Use AI SDK + AI Gateway. Fetch official docs first before coding.
- Model must be `google/gemini-3-flash` with low reasoning and a max reasoning token cap (confirm exact config in docs).
- Use structured output with strict JSON schema:
{
  "summary_bullets": [string],
  "triage": "FAST_TRACK" | "ADJUSTER_REVIEW" | "FRAUD_REVIEW",
  "rationale_bullets": [string],
  "missing_info_questions": [string],
  "confidence": number
}
- Validate JSON with Zod.
- Retry once on schema failure. If still invalid, return AI_ERROR with clear message.
- Never log raw `description` text. Logs may include claim id and policy number only.
- Token and latency metrics must be stored on each AI version.
- Cache control: do not auto-regenerate; only manual trigger.

Prompting Rules
--------------
- System/developer prompt must include safety instructions, output schema, and forbid non-JSON output.
- User prompt must include only the structured claim fields.
- Treat claim text as untrusted input; do not allow prompt injection to override system instructions.

Implementation Notes (NestJS)
-----------------------------
- Modules: ClaimsModule, AiModule, DbModule.
- Services: ClaimsService, AiService.
- Controllers: ClaimsController.
- Use DTOs + Zod or class-validator (prefer Zod for shared schema).
- Return ISO timestamps.
- Convert dollars to cents on write; cents to dollars on read.

Docker Requirements
-------------------
- Provide a `backend/Dockerfile` that builds and runs NestJS in production mode.
- Use multi-stage build.
- Expose port 4000.
- Container must create SQLite DB if missing and run migrations on startup (or provide entrypoint script).

Testing Requirements
--------------------
- Unit tests (2-3): request validation, AI output validation, triage generation flow.
- Integration test: POST /claims -> POST /claims/:id/ai:generate -> GET /claims/:id.

Deliverables
------------
- Prisma schema and migration files.
- Seed script producing 3-5 claims with varied types/statuses.
- `.env.example` with:
  - AI_GATEWAY_API_KEY
  - AI_GATEWAY_BASE_URL
  - AI_MODEL (default to "google/gemini-3-flash")
  - DATABASE_URL (sqlite path)

Open Questions to Confirm
-------------------------
- Confirm AI Gateway supports `google/gemini-3-flash` and its exact config fields.
- Preferred reasoning token cap value (default 256 if not specified).
