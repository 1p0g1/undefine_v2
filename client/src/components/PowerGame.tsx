import React, { useState } from "react";
import { DefineBoxes } from "./DefineBoxes";
import { MultipleChoiceOption } from "./MultipleChoiceOption";

// TODO: Replace MOCK_WORDS with fetch from Supabase for 6 random words in production.
const MOCK_WORDS = [
  {
    word: "sweet",
    definition: "Having the pleasant taste characteristic of sugar or honey.",
    correctOption: "sweet",
    redHerrings: ["bitter", "sour"],
  },
  {
    word: "brave",
    definition: "Ready to face and endure danger or pain; showing courage.",
    correctOption: "brave",
    redHerrings: ["timid", "lazy"],
  },
  {
    word: "quick",
    definition: "Moving fast or doing something in a short time.",
    correctOption: "quick",
    redHerrings: ["slow", "late"],
  },
  {
    word: "sharp",
    definition: "Having an edge or point that is able to cut or pierce something.",
    correctOption: "sharp",
    redHerrings: ["dull", "flat"],
  },
  {
    word: "calm",
    definition: "Not showing or feeling nervousness, anger, or other strong emotions.",
    correctOption: "calm",
    redHerrings: ["anxious", "wild"],
  },
  {
    word: "proud",
    definition: "Feeling deep pleasure or satisfaction as a result of achievements.",
    correctOption: "proud",
    redHerrings: ["ashamed", "sad"],
  },
];

function shuffle(array: string[]) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export default function PowerGame() {
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const current = MOCK_WORDS[roundIndex];
  const options = shuffle([
    current.correctOption,
    ...current.redHerrings,
  ]);

  function handleOption(option: string) {
    setSelectedOption(option);
    if (option === current.correctOption) {
      setScore((s) => s + 1);
      if (roundIndex === MOCK_WORDS.length - 1) {
        setGameOver(true);
        setShowConfetti(true);
      } else {
        setTimeout(() => {
          setRoundIndex((i) => i + 1);
          setSelectedOption(null);
        }, 600);
      }
    } else {
      setTimeout(() => {
        setRoundIndex((i) => i + 1);
        setSelectedOption(null);
      }, 600);
    }
  }

  function handlePlayAgain() {
    setRoundIndex(0);
    setScore(0);
    setGameOver(false);
    setShowConfetti(false);
    setSelectedOption(null);
  }

  return (
    <div className="power-game-container">
      <div className="flex flex-col items-center py-4">
        <div className="my-2">
          <DefineBoxes
            gameState={{} as any}
            revealedClues={[]}
            guessStatus={Array(6)
              .fill(null)
              .map((_, i) =>
                i < roundIndex
                  ? "correct"
                  : i === roundIndex
                  ? "active"
                  : "empty"
              )}
          />
        </div>
        {!gameOver ? (
          <>
            <div className="text-lg font-serif text-center mb-4">
              {current.definition}
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
              {options.map((option) => (
                <MultipleChoiceOption
                  key={option}
                  option={option}
                  onSelect={handleOption}
                  isSelected={selectedOption === option}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center mt-6">
            {showConfetti && <div id="confetti" />}
            <div className="text-2xl font-bold mb-2">You finished!</div>
            <div className="mb-4">Score: {score} / 6</div>
            <button
              className="rounded-lg border border-navy bg-navy text-white py-2 px-6 text-lg font-semibold shadow-sm hover:bg-white hover:text-navy transition-colors"
              onClick={handlePlayAgain}
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 