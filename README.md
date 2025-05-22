Un-Define

A daily word-guessing game where players try to identify a hidden word based on six progressively revealed linguistic clues.

📚 Documentation

Project Architecture - Technical design & schema

Project Tracker - Task tracking

Release Notes - Version changelog

Testing Guide - How to test

Deployment Guide - Deploy to Render

Clean Up Checklist - Build fixes and cleanup

Import Guide - Adding new words

🤖 Project Context

This is the undefine_v2 repo — a full rebuild with a fresh architecture, codebase, and logic.

Game logic is built cleanly from scratch

All existing types and database contracts are preserved

Project aims to be render-deployable and test-ready from day one

🧠 Anonymous User Tracking (Wordle-style)

No login required. Each player is tracked via a UUID stored in localStorage.
- Secure, browser-safe player ID generation with SSR support
- Fallback handling for private browsing and localStorage restrictions
- Consistent player tracking across game sessions
- Automatic UUID generation for new players

Linked to user_stats.player_id

Tracks stats, games played, and leaderboard performance

Supports persistent state with no authentication overhead

🔍 Game Rules

Each incorrect guess reveals a new clue, in DEFINE order:

D: Definition (always shown first)

E: Equivalents (synonyms)

F: First Letter

I: In a Sentence (usage)

N: Number of Letters

E2: Etymology

Guess the word correctly within 6 guesses to win. Game ends when all 6 guesses are used or the correct word is guessed.

🚀 Project Structure

This is a TypeScript monorepo using workspace modules:

client/ — React + Vite frontend

server/ — Express + Node backend

scripts/ — Utilities and dev tooling

supabase/ — SQL schema, migrations

docs/ — Markdown documentation

data/ — CSV imports for word bank

💲 Supabase Schema

See docs/ARCHITECTURE.md for table-level SQL and relationships.
All constraints, RLS policies, and foreign keys are managed via migrations.

😐 Random Word Testing

When in development mode, you can bypass the daily word logic:

Use DB_PROVIDER=mock to enable MockClient

Frontend will show a "Test with Random Word" button

Or access via /api/random

🛠️ Utility Scripts

Located in the scripts/ directory:

dev.sh — Start backend only

apply-migrations.sh — Apply Supabase migrations

test-db-client.ts — Test Supabase connection

setup-testing-mode.sh — Set testing flags

manage_words.sh — Seed and import word data

sync-render-env.js — Push env vars to Render

🚫 Cursor Protection

Do not allow Cursor to overwrite these files:

docs/ARCHITECTURE.md

src/types.ts

src/config/db.ts

.env.\* files

Treat ARCHITECTURE.md as the project source of truth.

⚖️ Environment Variables

Name | Required | Description
--- | --- | ---
NODE_ENV | No | development or production
PORT | No | Defaults to 3001
SUPABASE_URL | Yes | Supabase project URL
SUPABASE_ANON_KEY | Yes | Supabase anon key
DB_PROVIDER | Yes | supabase or mock
JWT_SECRET | Yes (prod) | JWT signing secret
VITE_API_BASE_URL | Yes | Base URL for backend API (https://undefine-v2-back.vercel.app) - no trailing slash

🛡️ RLS Status

Supabase Row Level Security (RLS) is enabled on all tables

Current rule: read/write allowed only where player_id = auth.uid() or JWT matches

Safe to enable post-MVP; not mandatory for local development

✨ Styling

Font: Libre Baskerville + Special Elite (Google Fonts)

Colours: Primary blue #1a237e, red #dc2626, off-white #faf7f2

Letter UI: 3.5rem boxes, serif text, red when revealed

🎓 Getting Started

# 1. Clone the repo

$ git clone https://github.com/1p0g1/undefine_v2
$ cd undefine_v2

# 2. Install deps

$ npm install

# 3. Set up env vars

$ cp .env.example .env.development

# 4. Start dev mode

$ npm run dev

🔄 Available Scripts

npm run dev — Start frontend & backend in dev

npm run simple:dev — Backend only

npm run build — Production build

✉️ License

MIT

---

_Update: Minor edit to trigger a new commit for deployment sync._

_Update: Another minor edit to trigger a new commit for deployment sync._

_Update: Trigger commit for proxy config confirmation._

_Update: Confirmed monorepo audit and Vercel deploy checklist._

## Backend API

The backend uses Next.js API routes located in `/pages/api/`. Each endpoint is configured as a serverless function and automatically deployed by Vercel.

### API Configuration
- **Production Backend**: https://undefine-v2-back.vercel.app
- **Development Backend**: http://localhost:3001
- **Frontend URL**: https://undefine-v2-front.vercel.app

### Available Endpoints
- `/api/word` - Get today's word
- `/api/guess` - Submit a guess
- `/api/streak-status` - Get user streak status
- `/api/leaderboard` - Get game leaderboard
- `/api/dev/reset-session` - (Development only) Reset session state

### Environment Configuration
- Production uses stable Vercel project URLs
- Development uses local server
- No preview deployment URLs used
- Environment variables properly configured in Vercel dashboard

Note: All API routes are properly configured and verified for Vercel serverless deployment. The project includes a root page component to ensure correct Next.js framework detection.
