Insurance claims assistant MVP
-----------------------------

### Context

Build an MVP for an insurance claims intake & triage assistant. The product helps a small insurer process incoming claims faster by:

1.  collecting structured claim details,
    
2.  generating a clear claim summary, and
    
3.  triaging the claim into a recommended routing (“Fast track”, “Needs adjuster”, “Potential fraud review”) with a short explanation.
    



Timebox
-------

~6–10 hours of focused work (ship an MVP, not a perfect product). If you run out of time, prefer a thin vertical slice that works end-to-end.

Tech constraints (choose your stack, but keep it coherent)
----------------------------------------------------------

Recommended (since it matches your experience):

-   Frontend: Next.js (App Router) + TypeScript
    
-   Backend: NestJS (TypeScript)
    
-   DB: Postgres (or SQLite if you want pure simplicity)
    
-   LLM API: OpenAI / Anthropic / Gemini (your choice) via server-side calls
    
-   Containerization: Docker + docker-compose (optional but appreciated)
    

You may use any UI kit you like, but keep the UI minimal and functional.

Core user stories (must-have)
-----------------------------

### 1) Create a claim (structured data)

A user (claims agent) can enter:

-   Policy number (string)
    
-   Claim type: `auto | home | travel`
    
-   Incident date
    
-   Location (free text)
    
-   Short incident description (free text)
    
-   Estimated loss amount (number)
    
-   Attachments: URLs only (no file upload required for MVP; treat them as references)
    

Persist the claim in the DB.

### 2) View claim list + claim detail

-   Claims list page with basic filtering by status / claim type
    
-   Claim detail page showing the raw data + the AI outputs (below)
    

### 3) LLM-generated outputs (server-side)

Given the claim input, generate and store:

-   Claim summary (5–8 bullet points) — concise, adjuster-friendly
    
-   Triage decision: one of
    
    -   `FAST_TRACK` (clear, low value, low complexity)
        
    -   `ADJUSTER_REVIEW` (complex / unclear / high value)
        
    -   `FRAUD_REVIEW` (signals that merit review)
        
-   Rationale: 3–5 bullets explaining why
    
-   Missing info questions: up to 5 questions to ask the claimant to unblock processing
    

Store the LLM response in the DB, linked to the claim.

### 4) “Regenerate AI” button

On the claim detail page:

-   a button triggers regeneration of AI outputs (new version)
    
-   keep a simple version history (at least store previous outputs)
    

AI requirements (important)
---------------------------

### Prompting & output format

-   Use structured outputs (JSON) from the model.
    
-   Define a strict schema, e.g.
    
    `{   "summary_bullets": ["..."],   "triage": "FAST_TRACK|ADJUSTER_REVIEW|FRAUD_REVIEW",   "rationale_bullets": ["..."],   "missing_info_questions": ["..."],   "confidence": 0.0 }`
    

### Safety & reliability guardrails

Implement at least these:

-   PII handling: assume inputs may include personal data; don’t log raw descriptions in plaintext logs.
    
-   Injection resistance: treat claim text as untrusted; keep instructions in system/developer prompt, and validate returned JSON.
    
-   Validation: if the model returns invalid JSON or missing fields, handle gracefully (retry once or return a clear error).
    
-   Cost control: basic token limits + caching (e.g., don’t regenerate automatically on every page view).
    

### Determinism note

You don’t need perfect decisions; you need a defensible, consistent pipeline and clear UX.

Minimal data model (suggestion)
-------------------------------

-   `claims`: id, policy_number, claim_type, incident_date, location, description, estimated_amount, status, created_at
    
-   `claim_ai_versions`: id, claim_id, created_at, model, prompt_version, response_json, latency_ms, token_usage (optional)
    

API endpoints (suggestion)
--------------------------

-   `POST /claims`
    
-   `GET /claims?type=&status=`
    
-   `GET /claims/:id`
    
-   `POST /claims/:id/ai:generate` (creates a new AI version)
    
-   `GET /claims/:id/ai` (latest + history)
    

Frontend pages (MVP)
--------------------

-   `/claims` list + filter
    
-   `/claims/new` create form
    
-   `/claims/[id]` detail view + AI panel + regenerate button + AI history accordion
    

Testing (pick a pragmatic level)
--------------------------------

Required:

-   2–3 unit tests for backend logic (schema validation, triage pipeline, etc.)
    
-   1 lightweight integration test (e.g., create claim → generate AI → fetch claim)
    

Nice-to-have:

-   a basic e2e test (Playwright/Cypress) for “create claim then view detail”.
    

Deliverables
------------

1.  A public Git repo (or zip) with:
    
    -   runnable code
        
    -   migration/seed instructions
        
2.  A README containing:
    
    -   how to run locally
        
    -   env vars needed (LLM key, DB url)
        
    -   brief architecture explanation (2–6 paragraphs)
        
    -   tradeoffs & what you would improve next
        
3.  Optional: short Loom/video walkthrough (2–5 min)
    

Bonus extensions (choose one if you have time)
----------------------------------------------

1.  Fraud signals heuristics: add deterministic checks (e.g., loss amount thresholds, repeated policy number claims) and blend with LLM rationale.
    
2.  LLM citations: have the model output “which input fields drove the decision” (not external sources).
    
3.  Role-based access: very lightweight auth (passwordless magic link mock, or simple JWT), just enough to demonstrate structure.