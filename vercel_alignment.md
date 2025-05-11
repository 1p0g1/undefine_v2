# Vercel Alignment & Debug Log

This document tracks the alignment between our deployed frontend (`undefine-v2.vercel.app`) and backend `/api` routes, with a focus on debugging persistent fetch/session errors.

---

## ✅ Deployment Alignment (Confirmed Working)

- `@supabase/supabase-js` correctly declared in root `package.json` and installed via workspaces.
- Vercel settings:
  - **Install Command**: `npm install`
  - **Build Command**: `cd client && npm run build`
  - **Output Directory**: `client/dist`
  - **Root Directory**: _(blank — project root)_
  - ✅ "Include files outside of root directory" enabled.
- `fetch("/api/word")` confirmed working via:
  - Direct browser hit ✅
  - `curl` ✅
- `startNewGame()` runs on `App.tsx` mount via `useEffect` hook.

---

## 🐛 Current Critical Error

```json
{ "error": "Error creating game session" }
```
🔍 Diagnosis In Progress
 RLS for game_sessions confirmed enabled with "Enable all access to game_sessions" for anon.

 Exact Supabase error not yet exposed — needs logging.

 Suspect required column (start_time) or invalid/missing word_id.

🧪 Next Debug Step
Update /api/word.ts to expose actual Supabase error:

```ts
const { data, error } = await supabase
  .from("game_sessions")
  .insert([{ word_id: word.id, start_time: new Date().toISOString() }]);

if (error) {
  console.error("Supabase insert error:", error.message);
  return res.status(500).json({ error: "Error creating game session" });
}
```
After redeploy, hit /api/word and inspect Vercel function logs for full message.

🗂 Related Schema Assumptions
game_sessions.word_id is a foreign key to words.id (UUID)

start_time is required

No default value for start_time

Append all future related debugging to this file. This is the master record of alignment between Supabase, Vercel, and frontend logic.

---

## 🛠️ Implementation Log

- [x] Updated `/api/word.ts` to log and return the actual Supabase error message when game session creation fails. This will help diagnose issues with RLS, required columns, or foreign key constraints in production. 