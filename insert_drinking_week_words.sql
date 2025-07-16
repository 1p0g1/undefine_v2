-- Drinking Week Words: July 21-27, 2025
-- Theme: Drinking terminology with deliberate progression from red herrings to on-theme
-- 🟩 Red herrings → 🟨 Ambiguous → 🟧 On-theme begins → 🟥 Strongly on-theme

-- 1. Glass - July 21, 2025 (Monday) 🟩 RED HERRING
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
    '2025-07-21',
    'GLASS',
    'A hard, brittle substance made from silica, often transparent.',
    'From Old English glæs, of Germanic origin.',
    'G',
    'The vase shattered into pieces of GLASS on the floor.',
    5,
    'crystal, pane, tumbler',
    'easy',
    'Drinking',
    NOW()
);

-- 2. Time - July 22, 2025 (Tuesday) 🟩 SUBTLE DOUBLE MEANING
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
    '2025-07-22',
    'TIME',
    'The indefinite continued progress of existence and events.',
    'From Old English tīma, meaning "period or season".',
    'T',
    'We were running out of TIME before the performance began.',
    4,
    'duration, moment, hour',
    'easy',
    'Drinking',
    NOW()
);

-- 3. Shot - July 23, 2025 (Wednesday) 🟨 AMBIGUOUS - STILL RED HERRING
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
    '2025-07-23',
    'SHOT',
    'An attempt or action in sport or photography; a firing of a weapon.',
    'From Old English sceot, meaning "a missile or the act of shooting".',
    'S',
    'He took a SHOT at the target from twenty metres away.',
    4,
    'try, attempt, blast',
    'medium',
    'Drinking',
    NOW()
);

-- 4. Crawl - July 24, 2025 (Thursday) 🟨 BRIDGING HINT - RED HERRING ON SURFACE
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
    '2025-07-24',
    'CRAWL',
    'To move slowly with the body close to the ground.',
    'From Old Norse krafla, meaning "to claw or scratch".',
    'C',
    'The baby began to CRAWL across the carpet.',
    5,
    'creep, inch, slither',
    'medium',
    'Drinking',
    NOW()
);

-- 5. Server - July 25, 2025 (Friday) 🟧 ON-THEME BEGINS
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
    '2025-07-25',
    'SERVER',
    'A person who brings food or drink to customers.',
    'From Latin servire, "to serve".',
    'S',
    'The SERVER took our orders with a smile.',
    6,
    'waiter, attendant, staff',
    'easy',
    'Drinking',
    NOW()
);

-- 6. Round - July 26, 2025 (Saturday) 🟥 STRONGLY ON-THEME
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
    '2025-07-26',
    'ROUND',
    'A set of drinks bought for a group of people at once.',
    'From Latin rotundus, "circular".',
    'R',
    'It was his turn to buy the ROUND at the bar.',
    5,
    'order, batch, set',
    'medium',
    'Drinking',
    NOW()
);

-- 7. Toast - July 27, 2025 (Sunday) 🟥 CLIMACTIC CLUE - CELEBRATION
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
    '2025-07-27',
    'TOAST',
    'A ritual expression of goodwill while drinking.',
    'From a custom of flavouring wine with spiced toast (16th century).',
    'T',
    'They raised their glasses in a TOAST to friendship.',
    5,
    'salute, cheer, tribute',
    'medium',
    'Drinking',
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
WHERE date BETWEEN '2025-07-21' AND '2025-07-27'
ORDER BY date; 