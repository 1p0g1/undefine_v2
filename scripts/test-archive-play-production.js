/**
 * Production smoke test: archive play end-to-end
 *
 * Flow:
 * 1) Fetch a playable archive date via /api/archive/available-dates
 * 2) Start an archive game via /api/word?date=YYYY-MM-DD
 * 3) Submit the correct guess via /api/guess
 *
 * Notes:
 * - Uses production backend URL by default.
 * - Creates a real game_session row and (on win) score row for a test player id.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://undefine-v2-back.vercel.app';
const TEST_PLAYER_ID = process.env.TEST_PLAYER_ID || '6e3f1d44-6dd9-49b6-9b28-8a94b2b4c4d5';

function toDateString(date) {
  return date.toISOString().split('T')[0];
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}) from ${url}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

async function getPlayableArchiveDate() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 45);

  const startDate = toDateString(start);
  const endDate = toDateString(end);

  const url = `${BACKEND_URL}/api/archive/available-dates?start_date=${startDate}&end_date=${endDate}`;
  const data = await fetchJson(url);

  const dates = Array.isArray(data.dates) ? data.dates : [];
  const today = toDateString(new Date());
  const candidate = dates.find((d) => d?.hasWord && d?.date && d.date !== today);
  if (!candidate) {
    throw new Error(`No playable archive dates found in range ${startDate}..${endDate}`);
  }
  return candidate.date;
}

async function startArchiveGame(date) {
  const url = `${BACKEND_URL}/api/word?date=${date}`;
  const data = await fetchJson(url, {
    method: 'GET',
    headers: { 'player-id': TEST_PLAYER_ID },
  });

  if (!data?.gameId || !data?.start_time || !data?.word?.id || !data?.word?.word) {
    throw new Error(`Invalid /api/word response shape: ${JSON.stringify(data).slice(0, 300)}`);
  }

  return data;
}

async function submitCorrectGuess({ gameId, word }) {
  const url = `${BACKEND_URL}/api/guess`;
  const body = {
    gameId,
    wordId: word.id,
    guess: word.word,
    start_time: '', // populated below
  };

  return { url, body };
}

async function main() {
  console.log('[archive-smoke] Backend:', BACKEND_URL);
  console.log('[archive-smoke] Player:', TEST_PLAYER_ID);

  const date = await getPlayableArchiveDate();
  console.log('[archive-smoke] Picked archive date:', date);

  const started = await startArchiveGame(date);
  console.log('[archive-smoke] Started game:', {
    gameId: started.gameId,
    wordId: started.word.id,
    isArchivePlay: started.isArchivePlay,
    gameDate: started.gameDate,
  });

  if (started.isArchivePlay !== true) {
    throw new Error(`Expected isArchivePlay=true but got: ${started.isArchivePlay}`);
  }

  const guessReq = await submitCorrectGuess({ gameId: started.gameId, word: started.word });
  guessReq.body.start_time = started.start_time;

  const guessRes = await fetchJson(guessReq.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'player-id': TEST_PLAYER_ID,
    },
    body: JSON.stringify(guessReq.body),
  });

  console.log('[archive-smoke] Guess result:', {
    isCorrect: guessRes?.isCorrect,
    isFuzzy: guessRes?.isFuzzy,
    gameOver: guessRes?.gameOver,
  });

  if (guessRes?.gameOver !== true || guessRes?.isCorrect !== true) {
    throw new Error(`Expected winning gameOver=true & isCorrect=true; got: ${JSON.stringify(guessRes).slice(0, 300)}`);
  }

  console.log('[archive-smoke] ✅ Archive play smoke test passed');
}

main().catch((err) => {
  console.error('[archive-smoke] ❌ FAILED:', err);
  process.exitCode = 1;
});


