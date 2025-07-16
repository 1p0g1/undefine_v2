-- Fishing Week Words: July 28 - August 3, 2025
-- Theme: Fishing terminology with deliberate progression from red herrings to on-theme
-- 🟦 Total red herrings → 🟨 Bridging clues → 🟥 On-theme reveal

-- 1. Keeper - July 28, 2025 (Monday) 🟦 TOTAL RED HERRING
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
    '2025-07-28',
    'KEEPER',
    'Someone who looks after or guards something.',
    'From Old English cepan, "to seize, hold".',
    'K',
    'The lighthouse KEEPER lived alone for most of the year.',
    6,
    'guardian, custodian, warden',
    'medium',
    'Fishing',
    NOW()
);

-- 2. Angle - July 29, 2025 (Tuesday) 🟦 MATHS/RED HERRING - SNEAKY DOUBLE MEANING
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
    '2025-07-29',
    'ANGLE',
    'The space between two intersecting lines or surfaces at a point.',
    'From Latin angulus, "corner".',
    'A',
    'The triangle has an internal ANGLE of 90 degrees.',
    5,
    'corner, slant, degree',
    'medium',
    'Fishing',
    NOW()
);

-- 3. School - July 30, 2025 (Wednesday) 🟦 GROUP, NOT AQUATIC... YET
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
    '2025-07-30',
    'SCHOOL',
    'An institution for educating children or a group with shared learning.',
    'Greek skholē, "leisure" → "place of discussion".',
    'S',
    'The SCHOOL organised a trip to the local museum.',
    6,
    'academy, group, institute',
    'easy',
    'Fishing',
    NOW()
);

-- 4. Cast - July 31, 2025 (Thursday) 🟨 BRIDGING CLUE
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
    '2025-07-31',
    'CAST',
    'To throw something forcefully or deliberately.',
    'From Old Norse kasta, "to throw".',
    'C',
    'She CAST the rope across the gap with precision.',
    4,
    'throw, toss, hurl',
    'medium',
    'Fishing',
    NOW()
);

-- 5. Line - August 1, 2025 (Friday) 🟨 FISHING REFERENCE EMERGING
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
    '2025-08-01',
    'LINE',
    'A long, thin mark or cord used to connect or measure.',
    'From Latin linea, "string, thread".',
    'L',
    'He followed the dotted LINE on the form.',
    4,
    'thread, cord, path',
    'easy',
    'Fishing',
    NOW()
);

-- 6. Perch - August 2, 2025 (Saturday) 🟥 ON-THEME, SUBTLE FISH
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
    '2025-08-02',
    'PERCH',
    'A spot where a bird rests or a type of freshwater fish.',
    'From Latin perca, via Old French perche.',
    'P',
    'The hawk found a PERCH high on the branch.',
    5,
    'roost, position, fish',
    'medium',
    'Fishing',
    NOW()
);

-- 7. Catch - August 3, 2025 (Sunday) 🟥 THEMATIC PAYOFF
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
    '2025-08-03',
    'CATCH',
    'To seize or capture something that is moving.',
    'From Latin captiare, "to try to seize".',
    'C',
    'It was the biggest CATCH he had landed all summer.',
    5,
    'grab, snare, haul',
    'medium',
    'Fishing',
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
WHERE date BETWEEN '2025-07-28' AND '2025-08-03'
ORDER BY date; 