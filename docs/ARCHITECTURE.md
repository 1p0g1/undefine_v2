Un-Define: Architecture Overview

Overview

Un-Define is a daily word-guessing game where users try to identify a hidden word based on progressively revealed clues. Each incorrect guess reveals a new clue, following the acronym DEFINE:

D: Definition (always first)

E: Equivalents (synonyms)

F: First Letter

I: In a Sentence (usage example)

N: Number of Letters

E2: Etymology (word origin)

Players have up to 6 guesses to correctly identify the word.

🔧 Backend Architecture

Tech Stack

Node.js + Express — API server

Supabase — Postgres database & auth

TypeScript — Full type safety (front & back)

Endpoints

GET /api/word

Starts a game session and returns metadata for the word of the day:

{
gameId: string,
clues: {
D: string,
E: string[],
F: string,
I: string,
N: number,
E2: string
}
}

Clues returned in predefined order

Word is hidden from client

Creates game session row with timestamp and player ID

GET /api/random

Returns a random word and bypasses daily logic (dev only):

{
gameId: string,
clues: ClueSet,
isTest: true
}

For local testing only

Follows the same structure as /api/word

POST /api/guess

Submits a guess and updates the game state:

{
gameId: string,
guess: string
}

Response:

{
isCorrect: boolean,
guess: string,
isFuzzy: boolean,
fuzzyPositions: number[],
gameOver: boolean,
revealedClues: string[],
usedHint: boolean
}

Normalises input (lowercase, trim, unicode safe)

Tracks guesses and updates is_won, is_complete

Updates Supabase game_sessions record

🗄️ Supabase Schema

words

Column

Type

Description

id

UUID

Primary key

word

TEXT

Word to guess

definition

TEXT

Core clue

equivalents

TEXT

Comma-separated synonyms (E)

first_letter

TEXT

First letter (F)

in_a_sentence

TEXT

Usage sentence (I)

number_of_letters

INT

Word length (N)

etymology

TEXT

Origin (E2)

difficulty

TEXT

easy/medium/hard

date

DATE

When it's used as daily word

game_sessions

Column

Type

id

UUID

word_id

UUID

word

TEXT

guesses

TEXT[]

guesses_used

INT

revealed_clues

TEXT[]

clue_status

JSONB

is_complete

BOOLEAN

is_won

BOOLEAN

start_time

TIMESTAMP

end_time

TIMESTAMP

created_at

TIMESTAMP

updated_at

TIMESTAMP

state

TEXT

player_id

TEXT

scores

Column

Type

id

UUID

player_id

TEXT

word

TEXT

guesses_used

INT

used_hint

BOOLEAN

completion_time_seconds

INT

was_correct

BOOLEAN

nickname

TEXT

submitted_at

TIMESTAMP

user_stats

Column

Type

player_id

TEXT

games_played

INT

games_won

INT

current_streak

INT

longest_streak

INT

average_guesses

FLOAT

average_completion_time

FLOAT

last_played_word

TEXT

leaderboard_summary

Column

Type

id

UUID

player_id

TEXT

word

TEXT

rank

INT

was_top_10

BOOLEAN

best_time

INT

guesses_used

INT

date

DATE

🔐 Security & RLS

RLS has not yet been enabled in Supabase, but is planned for future implementation

Future rule: player_id = auth.uid() or UUID from localStorage

Currently tracked via UUID-based player_id without login

All repository methods should be written with future RLS compatibility in mind

🔀 State Normalisation Logic

const normalize = (text: string) => text.trim().toLowerCase().replace(/[​-‍]/g, '')

Used in guess comparison logic to avoid diacritic or spacing mismatches.

🔄 TypeScript Import Rules

Do not use .js in TypeScript imports

Use tsx or ts-node/esm to avoid extension issues

✅ import { foo } from './utils/foo'

🛠️ Development Notes

Game sessions use UUIDs and are player-bound

Supabase RLS ties sessions/scores to user_stats (when enabled)

LocalStorage UUID = player_id unless auth is added later

Only one session per player per day (outside dev mode)

Dev mode must ensure random word guess == backend word (no desync)

❌ Cursor Protection Rules

Do not edit:

docs/ARCHITECTURE.md

src/types.ts

src/config/db.ts

Any .env\* files

🧪 Future Improvements

Zeitgeist mode (popular words)

Word pools and categories

Real-time multiplayer guesses

Custom difficulty curves

Formal RLS policies + JWT auth for admin

📋 SQL Relationships

alter table game_sessions
add constraint fk_game_sessions_word_id foreign key (word_id) references words(id);

alter table game_sessions
add constraint fk_game_sessions_player foreign key (player_id) references user_stats(player_id);

alter table scores
add constraint fk_scores_player foreign key (player_id) references user_stats(player_id);

alter table scores
add constraint fk_scores_word_text foreign key (word) references words(word);

alter table leaderboard_summary
add constraint fk_leaderboard_player foreign key (player_id) references user_stats(player_id);

alter table leaderboard_summary
add constraint fk_leaderboard_word foreign key (word) references words(word);

✅ Status

undefine_v2 repo is the active source

Architecture & types fully documented

RLS deferred until post-MVP

Schema reflects live Supabase dashboard

Use this document as the unambiguous source of truth for any backend, schema, or API-related updates.
