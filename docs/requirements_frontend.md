Frontend Requirements (Next.js + shadcn)
========================================

Goal
----
Build the UI for claims creation, list, and detail with manual AI regeneration. The UI must be buildable and testable without the backend by using a mock API adapter. Use only shadcn/ui components (no custom component libraries).

Hard Requirements
-----------------
- Framework: Next.js App Router + TypeScript.
- UI kit: shadcn/ui only. All UI components must come from shadcn/ui.
- State: local state by default; use Zustand only if cross-page global state is necessary.
- URL state: use Nuqs for query params (filters on /claims).
- AI runs only when user clicks the "Regenerate AI" button.
- No auth/login.

Required Dependencies
---------------------
- shadcn/ui (via CLI or MCP)
- tailwindcss
- react-hook-form + zod (for form validation)
- nuqs (URL query state)
- zustand (only if needed)
- sonner or shadcn toast (for feedback)

Shadcn Usage Rules
------------------
- Do not build components from scratch if shadcn provides an equivalent.
- Use shadcn for inputs, selects, calendars, tables, badges, cards, tabs, accordions, dialogs, toasts, skeletons, and buttons.
- Use shadcn MCP to add components and examples whenever possible.

Routes and Pages
----------------
1) /claims
- List of claims with filters by type and status.
- Filters stored in URL using Nuqs: `type`, `status`, `q` (search).
- Use shadcn Table for list; Badge for status; Input for search; Select for filters.
- Support loading and empty states (Skeleton + empty state card).

2) /claims/new
- Form fields:
  - policyNumber (Input, required)
  - claimType (Select, required)
  - incidentDate (Date picker using shadcn Calendar + Popover)
  - location (Input, required)
  - description (Textarea, required, 20-1000 chars)
  - estimatedAmount (Input with numeric formatting, required)
  - attachments (Textarea or dynamic Input list, each must be URL)
- Validate with zod and show inline errors.
- On submit, POST /claims and redirect to /claims/[id].

3) /claims/[id]
- Detail layout with two columns (desktop) and stacked layout (mobile).
- Left: claim details in Card sections.
- Right: AI panel with latest AI output and action button.
- "Regenerate AI" button triggers POST /claims/:id/ai:generate. Show loading state and toast.
- AI history shown in Accordion (newest first). Each item shows summary, triage, rationale, missing questions, and timestamp.

Data Fetching Contract
----------------------
Frontend must rely on the backend API contract in /docs/requirements_backend.md. Create a typed API client in `frontend/lib/api.ts` with these methods:
- createClaim(payload)
- listClaims(params)
- getClaim(id)
- generateAi(id)
- getClaimAi(id)

Mock Adapter (to avoid backend dependency)
-----------------------------------------
- Provide `frontend/lib/mockApi.ts` that matches the API client interface.
- Add `NEXT_PUBLIC_API_MODE=mock|live` (default mock) to switch.
- Provide fixture data in `frontend/lib/mockData.ts`.
- The UI should work fully in mock mode.

Type Definitions
----------------
Create shared TypeScript types aligned with backend:
- Claim
- ClaimSummary
- ClaimAiVersion
- ClaimAiResponse
- ErrorResponse

UI Behavior Details
-------------------
- Use optimistic UI for AI generation: show spinner, disable button, then refresh latest AI.
- Handle errors with toast and error boundary states.
- Keep forms accessible (labels, aria attributes from shadcn).
- Use `currency` formatting for estimatedAmount (display only).

File/Folder Expectations
------------------------
- `frontend/app/claims/page.tsx` (list)
- `frontend/app/claims/new/page.tsx` (create)
- `frontend/app/claims/[id]/page.tsx` (detail)
- `frontend/components/` for shared shadcn-wrapped components only if needed
- `frontend/lib/api.ts`, `frontend/lib/mockApi.ts`, `frontend/lib/types.ts`

MCP + Skills Usage Requirements
-------------------------------
- Use Next.js MCP for runtime inspection and route verification.
- Use shadcn MCP to add components and retrieve examples.
- Use available skills if they match tasks; otherwise state why not used.

Docker Requirements
-------------------
- Provide `frontend/Dockerfile` using Next.js production build.
- Expose port 3000.
- Accept `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_API_MODE` env vars.

Acceptance Criteria
-------------------
- UI works in mock mode without backend.
- Filters persist in URL using Nuqs.
- All UI pieces are shadcn components.
- AI only runs via explicit button click.
- Form validation is enforced client-side.
