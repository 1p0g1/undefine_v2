# Un-Define v2

Last Updated: May 2025
Reference: cursor_project_rules/README.md

Un-Define is a daily word-guessing game with progressive clue revelation, inspired by Wordle — but designed with deeper logic and richer definitions. Players receive 6 clues in sequence, each revealed after an incorrect guess. The clues spell out the acronym DEFINE:

- **D**: Definition (always shown first)
- **E**: Equivalents (synonyms)
- **F**: First Letter
- **I**: In a Sentence (usage)
- **N**: Number of Letters
- **E**: Etymology

Guess the word within 6 attempts to win. Anonymous gameplay, no login required.

## 🎮 How to Play

1. **Daily Word**: Each day features a new mystery word
2. **Use Clues**: Six different types of hints help guide your guesses
3. **Make Guesses**: You have 6 attempts to find the correct word
4. **Compete**: Compare your performance on the daily leaderboard

## 🏆 Scoring System (Quick Overview)

Un·Define uses a **positive reward system** that gives you points for good performance:

### **Base Points by Guess Number:**
- **1st guess**: 1,000 points (Perfect!)
- **2nd guess**: 900 points  
- **3rd guess**: 800 points
- **4th guess**: 700 points
- **5th guess**: 600 points
- **6th guess**: 500 points

### **Bonuses & Penalties:**
- **Fuzzy Match Bonus**: +25 points for each "close" guess (like guessing "DEFINE" when answer is "DEFIED")
- **Time Penalty**: -1 point per 10 seconds (minimal impact)
- **Hint Penalty**: -200 points if hints are used (future feature)

### **What This Means:**
- **Guess count matters most** (~90% of your score)
- **Fuzzy matches help you rank higher** than players who made random guesses
- **Time pressure is minimal** - think carefully rather than rushing

📖 **[Read the Complete Scoring Guide](docs/SCORING_SYSTEM_GUIDE.md)** for detailed explanations, examples, and strategy tips.

## Status Overview
Reference: cursor_project_rules/project_status.md
✅ Frontend deployment
✅ Backend deployment
✅ Core game logic
⚠️ RLS implementation pending
🚧 Leaderboard functionality
🚨 **CRITICAL: See `docs/LEADERBOARD_DECEMBER_2024_STATUS.md` for migration audit & action plan**

## 📁 Project Structure
Reference: cursor_project_rules/architecture.md
✅ React + Vite frontend
✅ Next.js API backend
✅ Supabase database
✅ TypeScript monorepo

### Documentation
- `docs/ARCHITECTURE.md` - System architecture and patterns
- `docs/database_schema.md` - Database schema and ERD
- `docs/leaderboard_logic.md` - Leaderboard data flow and triggers
- `docs/LEADERBOARD_DECEMBER_2024_STATUS.md` - Current leaderboard system state ⭐️ NEW
- `docs/LEADERBOARD_TROUBLESHOOTING.md` - Debugging and recovery procedures

## 🔍 API Endpoints
Reference: cursor_project_rules/api_spec.md

| Endpoint | Method | Description | Status |
|----------|--------|-------------|---------|
| `/api/word` | GET | Get daily word | ✅ Active |
| `/api/guess` | POST | Submit guess | ✅ Active |
| `/api/streak-status` | POST | Get streaks | ✅ Active |
| `/api/leaderboard` | GET | Daily rankings | 🚧 Schema Only |
| `/api/dev/reset-session` | POST | Reset state | ⚠️ Dev Only* |

\* Blocked in production (`NODE_ENV !== 'production'`)

## 🧠 Anonymous Player Model

No authentication is used. Each player is tracked by a UUID stored in localStorage:

- SSR-safe UUID generation
- Linked to `user_stats.player_id` in Supabase
- Supports incognito/private browsing
- Enables persistent player stats and streaks

## 💾 Supabase Schema

Managed through SQL migrations. Tables include:

- `words` — Stores daily words and clues
- `game_sessions` — Tracks gameplay, guesses, clue states
- `scores` — Stores final game stats
- `leaderboard_summary` — Schema ready, not yet active
- `user_stats` — Global stats per anonymous player

See `docs/ARCHITECTURE.md` and `docs/supa_alignment.md` for schema and ERD.

## 🔐 Row-Level Security (RLS)

Currently **disabled** during development and testing.

RLS will be enabled in production:
- Read/write access will require `player_id = auth.uid()` or JWT match
- All repositories are written with future RLS compatibility in mind
- Safe for development with RLS disabled

## 🧪 Testing & Dev Mode

Enable dev mode by setting:

```ini
DB_PROVIDER=mock
```

- Uses MockClient
- Shows "Test with Random Word" button in frontend
- `/api/random` endpoint available
- UUIDs reset with refresh

## 🛠️ Utility Scripts

Located in the `scripts/` directory:

- `dev.sh` — Start backend only
- `apply-migrations.sh` — Run Supabase migrations
- `test-db-client.ts` — Test Supabase connection
- `setup-testing-mode.sh` — Enable dev/test flags
- `manage_words.sh` — Seed and import word data
- `sync-vercel-env.js` — Sync .env vars to Vercel

## ⚠️ Cursor Protection

Do not allow Cursor to modify:

- `docs/ARCHITECTURE.md`
- `src/types.ts`
- `src/config/db.ts`
- `.env.*` files

Treat `ARCHITECTURE.md` as the project source of truth.

## ⚙️ Environment Variables
Reference: cursor_project_rules/env_config.md

### Frontend (`client/`)
✅ Required Variables:
| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend URL (no trailing slash) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public key |

### Backend (`root/`)
✅ Required Variables:
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access key |
| `JWT_SECRET` | Session signing (prod) |
| `DB_PROVIDER` | 'supabase' or 'mock' |
| `NODE_ENV` | 'development' or 'production' |
| `FRONTEND_URL` | CORS origin URL |

⚠️ Optional Variables:
- `PORT` (default: 3001)
- `SUPABASE_ANON_KEY` (public access)

## ✨ Styling

- Fonts: Libre Baskerville (primary), Special Elite (monospace)
- Primary Blue: `#1a237e`
- Game Over Red: `#dc2626`
- Background: `#faf7f2`
- Letter UI: 3.5rem boxes, red border + serif font when revealed

## 🎓 Getting Started

```bash
# Clone the repo
git clone https://github.com/1p0g1/undefine_v2
cd undefine_v2

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.development

# Start backend (localhost:3001)
npm run dev:backend

# Start frontend (localhost:5173)
cd client && npm run dev
```

## 🚀 Production URLs
Reference: cursor_project_rules/deployment.md
✅ Frontend: https://undefine-v2-front.vercel.app
✅ Backend: https://undefine-v2-back.vercel.app

## 🧾 License
MIT © 2025

---
## Completion Status (May 2025)
Reference: cursor_project_rules/completion_criteria.md
✅ Core functionality complete
✅ Environment configuration validated
⚠️ RLS implementation pending
🚧 Leaderboard in development
