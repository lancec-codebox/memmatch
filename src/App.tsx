import { useState, useEffect, useCallback, useRef } from "react";
import { Card, createCards, allWords } from "./data/words";

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_CONFIG: Record<Difficulty, { words: number; label: string; cols: string }> = {
  easy: { words: 4, label: "Easy (4 words)", cols: "grid-cols-3 sm:grid-cols-4" },
  medium: { words: 6, label: "Medium (6 words)", cols: "grid-cols-3 sm:grid-cols-6" },
  hard: { words: 8, label: "Hard (8 words)", cols: "grid-cols-4 sm:grid-cols-6" },
};

const HIGH_SCORE_KEY = "hanzi-memory-high-scores";

function getHighScores(): Record<Difficulty, number> {
  try {
    const stored = localStorage.getItem(HIGH_SCORE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { easy: 0, medium: 0, hard: 0 };
}

function saveHighScore(difficulty: Difficulty, score: number) {
  const scores = getHighScores();
  if (score > scores[difficulty]) {
    scores[difficulty] = score;
    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case "hanzi":
      return "from-red-500 to-rose-600";
    case "pinyin":
      return "from-blue-500 to-indigo-600";
    case "english":
      return "from-emerald-500 to-teal-600";
    default:
      return "from-gray-500 to-gray-600";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "hanzi":
      return "汉字";
    case "pinyin":
      return "Pinyin";
    case "english":
      return "English";
    default:
      return "";
  }
}

function getTypeBadgeColor(type: string): string {
  switch (type) {
    case "hanzi":
      return "bg-red-100 text-red-700";
    case "pinyin":
      return "bg-blue-100 text-blue-700";
    case "english":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>(getHighScores());
  const [gameWon, setGameWon] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [combo, setCombo] = useState(0);
  const [showMessage, setShowMessage] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const messageTimeoutRef = useRef<number | null>(null);

  const initGame = useCallback((diff: Difficulty) => {
    const config = DIFFICULTY_CONFIG[diff];
    const wordIndices = Array.from({ length: allWords.length }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, config.words);
    const newCards = createCards(wordIndices);
    setCards(newCards);
    setSelectedCards([]);
    setScore(0);
    setMoves(0);
    setGameWon(false);
    setFocusedIndex(0);
    setIsLocked(false);
    setCombo(0);
    setShowMessage("");
    setGameStarted(true);
  }, []);

  useEffect(() => {
    initGame(difficulty);
  }, []);

  const displayMessage = useCallback((msg: string) => {
    setShowMessage(msg);
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = window.setTimeout(() => setShowMessage(""), 1500);
  }, []);

  const handleCardClick = useCallback(
    (cardIndex: number) => {
      if (isLocked || gameWon) return;
      const card = cards[cardIndex];
      if (card.isFaceUp || card.isMatched || card.isRemoving) return;

      // Flip the card
      const newCards = [...cards];
      newCards[cardIndex] = { ...card, isFaceUp: true };
      setCards(newCards);

      const newSelected = [...selectedCards, newCards[cardIndex]];
      setSelectedCards(newSelected);

      if (newSelected.length === 1) {
        // First card - just reveal it
        setMoves((m) => m + 1);
      } else if (newSelected.length === 2) {
        setMoves((m) => m + 1);
        // Check if second card matches the first
        if (newSelected[0].wordIndex === newSelected[1].wordIndex) {
          // Match! Keep both and wait for third
          displayMessage("✓ Match! Find the third form!");
          setCombo((c) => c + 1);
        } else {
          // No match - flip both back after delay
          setIsLocked(true);
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === newSelected[0].id || c.id === newSelected[1].id
                  ? { ...c, isFaceUp: false }
                  : c
              )
            );
            setSelectedCards([]);
            setIsLocked(false);
            setCombo(0);
          }, 1000);
        }
      } else if (newSelected.length === 3) {
        setMoves((m) => m + 1);
        // Check if third card completes the set
        if (newSelected[0].wordIndex === newSelected[2].wordIndex) {
          // Complete match! Remove all three
          const comboBonus = combo >= 2 ? combo * 10 : 0;
          const points = 100 + comboBonus;
          setScore((s) => s + points);
          displayMessage(combo >= 2 ? `🔥 Combo x${combo + 1}! +${points}` : `+${points} points!`);

          // Animate removal
          setIsLocked(true);
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                newSelected.some((s) => s.id === c.id)
                  ? { ...c, isRemoving: true }
                  : c
              )
            );
            setTimeout(() => {
              setCards((prev) =>
                prev.map((c) =>
                  newSelected.some((s) => s.id === c.id)
                    ? { ...c, isMatched: true, isFaceUp: false }
                    : c
                )
              );
              setSelectedCards([]);
              setIsLocked(false);
              setCombo((c) => c + 1);

              // Check win
              setCards((prev) => {
                const remaining = prev.filter((c) => !c.isMatched);
                if (remaining.length === 0) {
                  setGameWon(true);
                  setScore((currentScore) => {
                    saveHighScore(difficulty, currentScore);
                    setHighScores(getHighScores());
                    return currentScore;
                  });
                }
                return prev;
              });
            }, 500);
          }, 600);
        } else {
          // Wrong third card - flip all back
          setIsLocked(true);
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                newSelected.some((s) => s.id === c.id)
                  ? { ...c, isFaceUp: false }
                  : c
              )
            );
            setSelectedCards([]);
            setIsLocked(false);
            setCombo(0);
          }, 1000);
        }
      }
    },
    [cards, selectedCards, isLocked, gameWon, combo, difficulty, displayMessage]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted) return;

      const activeCards = cards.filter((c) => !c.isMatched);
      const activeIndices = activeCards.map((c) => cards.indexOf(c));

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const currentPos = activeIndices.indexOf(prev);
            if (currentPos === -1) return activeIndices[0] || 0;
            const next = (currentPos + 1) % activeIndices.length;
            return activeIndices[next];
          });
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const currentPos = activeIndices.indexOf(prev);
            if (currentPos === -1) return activeIndices[0] || 0;
            const next = (currentPos - 1 + activeIndices.length) % activeIndices.length;
            return activeIndices[next];
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const currentPos = activeIndices.indexOf(prev);
            if (currentPos === -1) return activeIndices[0] || 0;
            const cols = window.innerWidth < 640 ? 3 : (difficulty === "hard" ? 6 : difficulty === "medium" ? 6 : 4);
            const next = Math.min(currentPos + cols, activeIndices.length - 1);
            return activeIndices[next];
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const currentPos = activeIndices.indexOf(prev);
            if (currentPos === -1) return activeIndices[0] || 0;
            const cols = window.innerWidth < 640 ? 3 : (difficulty === "hard" ? 6 : difficulty === "medium" ? 6 : 4);
            const next = Math.max(currentPos - cols, 0);
            return activeIndices[next];
          });
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleCardClick(focusedIndex);
          break;
        case "r":
        case "R":
          e.preventDefault();
          initGame(difficulty);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards, focusedIndex, handleCardClick, gameStarted, difficulty, initGame]);

  const handleRestart = () => {
    initGame(difficulty);
  };

  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff);
    initGame(diff);
  };

  const activeCards = cards.filter((c) => !c.isMatched);
  const totalWords = DIFFICULTY_CONFIG[difficulty].words;
  const wordsCompleted = totalWords - Math.ceil(activeCards.length / 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="p-4 sm:p-6 text-center">
        <h1 className="text-2xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-300 to-purple-300">
          汉字记忆
        </h1>
        <p className="text-sm sm:text-base text-slate-300 mt-1">Chinese Memory Match</p>
      </header>

      {/* Score Board */}
      <div className="px-4 sm:px-6 flex flex-wrap justify-center gap-3 sm:gap-6 mb-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wide">Score</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-300">{score}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wide">Moves</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-300">{moves}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wide">High Score</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-300">{highScores[difficulty]}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wide">Words</div>
          <div className="text-xl sm:text-2xl font-bold text-rose-300">
            {wordsCompleted}/{totalWords}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 sm:px-6 flex flex-wrap justify-center gap-2 sm:gap-3 mb-4">
        {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) => (
          <button
            key={diff}
            onClick={() => handleDifficultyChange(diff)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              difficulty === diff
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </button>
        ))}
        <button
          onClick={handleRestart}
          className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium bg-rose-500/80 hover:bg-rose-500 text-white transition-all duration-200 hover:scale-105"
        >
          ↻ Restart
        </button>
      </div>

      {/* Message */}
      <div className="h-8 flex items-center justify-center mb-2">
        {showMessage && (
          <div className="animate-bounce text-lg font-bold text-amber-300 drop-shadow-lg">
            {showMessage}
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="flex-1 px-4 sm:px-6 pb-6 flex items-start justify-center" ref={boardRef}>
        <div
          className={`grid ${DIFFICULTY_CONFIG[difficulty].cols} gap-2 sm:gap-3 w-full max-w-3xl`}
        >
          {cards.map((card, index) => (
            <CardComponent
              key={card.id}
              card={card}
              index={index}
              isFocused={focusedIndex === index}
              isSelected={selectedCards.some((s) => s.id === card.id)}
              onClick={() => handleCardClick(index)}
            />
          ))}
        </div>
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-white/10 animate-[fadeIn_0.3s_ease-out]">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-rose-300">
              Congratulations!
            </h2>
            <p className="text-slate-300 mb-4">You matched all words!</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="text-2xl font-bold text-amber-300">{score}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-slate-400">Total Moves</div>
                <div className="text-2xl font-bold text-blue-300">{moves}</div>
              </div>
            </div>
            {score >= highScores[difficulty] && (
              <div className="text-emerald-400 font-bold mb-4 text-lg">⭐ New High Score! ⭐</div>
            )}
            <button
              onClick={handleRestart}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-rose-500 rounded-xl font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="px-4 sm:px-6 pb-4 text-center">
        <p className="text-xs text-slate-500">
          Match 汉字 (Hanzi) + Pinyin + English • Arrow keys to navigate • Enter/Space to flip • R to restart
        </p>
      </div>
    </div>
  );
}

interface CardComponentProps {
  card: Card;
  index: number;
  isFocused: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function CardComponent({ card, isFocused, isSelected, onClick }: CardComponentProps) {
  const isRevealed = card.isFaceUp;

  if (card.isMatched) {
    return <div className="aspect-[3/4] sm:aspect-[3/4]" />;
  }

  return (
    <div
      className={`aspect-[3/4] cursor-pointer perspective-1000 ${
        card.isRemoving ? "animate-[shrinkOut_0.5s_ease-in_forwards]" : ""
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={isRevealed ? `Card showing ${card.content}` : "Face down card"}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-3d ${
          isRevealed ? "rotate-y-180" : ""
        }`}
      >
        {/* Back of card (face down) */}
        <div
          className={`absolute inset-0 backface-hidden rounded-xl flex items-center justify-center
            transition-all duration-200
            ${
              isFocused
                ? "ring-3 ring-amber-400 shadow-lg shadow-amber-400/30 scale-105"
                : isSelected
                ? "ring-2 ring-purple-400"
                : "ring-1 ring-white/20"
            }
            bg-gradient-to-br from-indigo-600 to-purple-700
            hover:scale-[1.02] hover:shadow-lg
          `}
        >
          <div className="text-3xl sm:text-4xl opacity-60">🀄</div>
          <div className="absolute inset-2 border border-white/10 rounded-lg" />
        </div>

        {/* Front of card (face up) */}
        <div
          className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl flex flex-col items-center justify-center p-2
            transition-all duration-200
            ${
              isFocused
                ? "ring-3 ring-amber-400 shadow-lg shadow-amber-400/30 scale-105"
                : isSelected
                ? "ring-2 ring-purple-400"
                : "ring-1 ring-white/20"
            }
            bg-gradient-to-br ${getTypeColor(card.type)}
          `}
        >
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${getTypeBadgeColor(card.type)} bg-opacity-80`}
          >
            {getTypeLabel(card.type)}
          </span>
          <span
            className={`font-bold text-center leading-tight ${
              card.type === "hanzi"
                ? "text-2xl sm:text-3xl text-white"
                : card.type === "pinyin"
                ? "text-sm sm:text-base text-white italic"
                : "text-sm sm:text-lg text-white"
            }`}
          >
            {card.content}
          </span>
        </div>
      </div>
    </div>
  );
}
