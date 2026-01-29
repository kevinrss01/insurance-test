Opal Claims MVP
===============

Quick Start (Local Dev)
-----------------------
Prereqs:
- Node.js 20+
- pnpm

Backend (NestJS + SQLite)
-------------------------
```bash
cd backend
pnpm install
cp .env.example .env
# Set AI_GATEWAY_API_KEY in backend/.env
pnpm db:setup
pnpm start:dev
```
Backend runs on http://localhost:4000

Frontend (Next.js)
-------------------
```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```
Frontend runs on http://localhost:3000

API Mode (Mock vs Live)
-----------------------
By default the frontend uses a local mock API (including mock AI responses),
so it will work even if the backend is down.

To use the real backend:
- Set `NEXT_PUBLIC_API_MODE=live`
- (Optional) Set `NEXT_PUBLIC_API_BASE_URL` (defaults to http://localhost:4000)

Run Both
--------
Open two terminals and run the backend and frontend commands above.

Docker (Backend only)
---------------------
```bash
# from repo root
# ensure backend/.env includes AI_GATEWAY_API_KEY
docker compose up -d --build backend
```
Backend runs on http://localhost:4000
