-- Add sample themed words for testing theme guessing feature
-- Theme: "emotions" for Dec 9-15, 2024

INSERT INTO words (
  id,
  word,
  definition,
  first_letter,
  in_a_sentence,
  equivalents,
  number_of_letters,
  etymology,
  difficulty,
  date,
  theme
) VALUES 
  (
    gen_random_uuid(),
    'HAPPY',
    'Feeling or showing pleasure or contentment',
    'H',
    'She felt ______ when she received the good news',
    'joyful,cheerful,content',
    5,
    'From Middle English hap (chance, fortune)',
    'Easy',
    '2024-12-09',
    'emotions'
  ),
  (
    gen_random_uuid(),
    'ANGRY',
    'Having a strong feeling of displeasure or hostility',
    'A', 
    'He became ______ when he heard the unfair decision',
    'mad,furious,irate',
    5,
    'From Old Norse angr (grief)',
    'Easy',
    '2024-12-10',
    'emotions'
  ),
  (
    gen_random_uuid(),
    'EXCITED',
    'Very enthusiastic and eager',
    'E',
    'The children were ______ about the upcoming trip',
    'thrilled,enthusiastic,eager',
    7,
    'From Latin excitare (to call out, rouse)',
    'Medium',
    '2024-12-11', 
    'emotions'
  ),
  (
    gen_random_uuid(),
    'NERVOUS',
    'Easily agitated or alarmed; anxious',
    'N',
    'She felt ______ before her big presentation',
    'anxious,worried,tense',
    7,
    'From Latin nervus (sinew, nerve)',
    'Medium',
    '2024-12-12',
    'emotions'
  ),
  (
    gen_random_uuid(),
    'CALM',
    'Not showing or feeling nervousness or excitement',
    'C',
    'He remained ______ during the emergency',
    'peaceful,serene,tranquil',
    4,
    'From Latin calmus (heat)',
    'Easy',
    '2024-12-13',
    'emotions'
  ),
  (
    gen_random_uuid(),
    'JEALOUS',
    'Feeling resentment against someone because of their advantages',
    'J',
    'She felt ______ of her friend''s success',
    'envious,resentful,covetous',
    7,
    'From Old French jalos',
    'Medium',
    '2024-12-14',
    'emotions'
  ),
  (
    gen_random_uuid(),
    'PROUD',
    'Feeling satisfaction from one''s achievements',
    'P',
    'They were ______ of their team''s victory',
    'satisfied,pleased,gratified',
    5,
    'From Old French prou (brave)',
    'Easy',
    '2024-12-15',
    'emotions'
  )
ON CONFLICT (date) DO NOTHING; 