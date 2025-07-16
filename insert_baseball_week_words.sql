-- Baseball Week Words: July 14-20, 2025
-- Theme: Baseball terminology and concepts

-- 1. Pitch - July 14, 2025 (Monday)
INSERT INTO words (
    date, 
    word, 
    definition, 
    etymology, 
    first_letter, 
    in_a_sentence, 
    number_of_letters, 
    equivalents, 
    difficulty, 
    theme,
    created_at
) VALUES (
    '2025-07-14',
    'PITCH',
    'A word that can refer to the act of throwing something or presenting an idea to persuade.',
    'From Old English pic (tar) and Middle English pichen (to thrust or throw).',
    'P',
    'He gave a compelling PITCH during the business meeting.',
    5,
    'Throw, proposal',
    'medium',
    'Baseball',
    NOW()
);

-- 2. Strike - July 15, 2025 (Tuesday)
INSERT INTO words (
    date, 
    word, 
    definition, 
    etymology, 
    first_letter, 
    in_a_sentence, 
    number_of_letters, 
    equivalents, 
    difficulty, 
    theme,
    created_at
) VALUES (
    '2025-07-15',
    'STRIKE',
    'To hit forcibly or to stop working as a form of protest.',
    'From Old English strīcan meaning to stroke or move quickly.',
    'S',
    'The workers voted to go on STRIKE next week.',
    6,
    'Hit, protest',
    'medium',
    'Baseball',
    NOW()
);

-- 3. Diamond - July 16, 2025 (Wednesday)
INSERT INTO words (
    date, 
    word, 
    definition, 
    etymology, 
    first_letter, 
    in_a_sentence, 
    number_of_letters, 
    equivalents, 
    difficulty, 
    theme,
    created_at
) VALUES (
    '2025-07-16',
    'DIAMOND',
    'A valuable gem or a four-sided figure often used to describe field shapes.',
    'From Greek adamas (invincible, untameable), Latin diamantem.',
    'D',
    'The bride chose a ring with a large DIAMOND.',
    7,
    'Gem, rhombus',
    'medium',
    'Baseball',
    NOW()
);

-- 4. Base - July 17, 2025 (Thursday)
INSERT INTO words (
    date, 
    word, 
    definition, 
    etymology, 
    first_letter, 
    in_a_sentence, 
    number_of_letters, 
    equivalents, 
    difficulty, 
    theme,
    created_at
) VALUES (
    '2025-07-17',
    'BASE',
    'A foundation or starting point, or a safe zone to reach in a game.',
    'From Latin basis via Greek basis meaning pedestal or step.',
    'B',
    'Trust is the BASE of every healthy relationship.',
    4,
    'Foundation, station',
    'easy',
    'Baseball',
    NOW()
);

-- 5. Shortstop - July 18, 2025 (Friday)
INSERT INTO words (
    date, 
    word, 
    definition, 
    etymology, 
    first_letter, 
    in_a_sentence, 
    number_of_letters, 
    equivalents, 
    difficulty, 
    theme,
    created_at
) VALUES (
    '2025-07-18',
    'SHORTSTOP',
    'A player positioned between second and third base, key in fielding.',
    'Coined in 19th-century baseball to describe a fielder who stops short hits.',
    'S',
    'The ball was snagged by the SHORTSTOP just before it reached the outfield.',
    9,
    'Infielder, defender',
    'hard',
    'Baseball',
    NOW()
);

-- 6. Outfield - July 19, 2025 (Saturday)
INSERT INTO words (
    date, 
    word, 
    definition, 
    etymology, 
    first_letter, 
    in_a_sentence, 
    number_of_letters, 
    equivalents, 
    difficulty, 
    theme,
    created_at
) VALUES (
    '2025-07-19',
    'OUTFIELD',
    'The grassy area beyond the infield where outfielders play.',
    'From "out" + "field"; "field" from Old English feld (open land).',
    'O',
    'She chased the fly ball deep into the OUTFIELD.',
    8,
    'Backfield, boundary',
    'medium',
    'Baseball',
    NOW()
);

-- 7. Inning - July 20, 2025 (Sunday)
INSERT INTO words (
    date, 
    word, 
    definition, 
    etymology, 
    first_letter, 
    in_a_sentence, 
    number_of_letters, 
    equivalents, 
    difficulty, 
    theme,
    created_at
) VALUES (
    '2025-07-20',
    'INNING',
    'One of the divisions of play in baseball where each team takes a turn batting.',
    'From Old English innian (to get within, to enter); 18th-century sports usage.',
    'I',
    'The team scored three runs in the final INNING.',
    6,
    'Turn, round',
    'medium',
    'Baseball',
    NOW()
);

-- Verify the inserts
SELECT 
    date,
    word,
    number_of_letters,
    first_letter,
    theme,
    difficulty
FROM words 
WHERE date BETWEEN '2025-07-14' AND '2025-07-20'
ORDER BY date; 