export interface WordSet {
  hanzi: string;
  pinyin: string;
  english: string;
}

export const allWords: WordSet[] = [
  { hanzi: "你好", pinyin: "nǐ hǎo", english: "hello" },
  { hanzi: "谢谢", pinyin: "xiè xiè", english: "thank you" },
  { hanzi: "再见", pinyin: "zài jiàn", english: "goodbye" },
  { hanzi: "朋友", pinyin: "péng yǒu", english: "friend" },
  { hanzi: "学习", pinyin: "xué xí", english: "study" },
  { hanzi: "老师", pinyin: "lǎo shī", english: "teacher" },
  { hanzi: "学生", pinyin: "xué shēng", english: "student" },
  { hanzi: "中国", pinyin: "zhōng guó", english: "China" },
  { hanzi: "喜欢", pinyin: "xǐ huān", english: "like" },
  { hanzi: "吃饭", pinyin: "chī fàn", english: "eat" },
  { hanzi: "喝水", pinyin: "hē shuǐ", english: "drink water" },
  { hanzi: "工作", pinyin: "gōng zuò", english: "work" },
  { hanzi: "快乐", pinyin: "kuài lè", english: "happy" },
  { hanzi: "美丽", pinyin: "měi lì", english: "beautiful" },
  { hanzi: "家庭", pinyin: "jiā tíng", english: "family" },
  { hanzi: "时间", pinyin: "shí jiān", english: "time" },
];

export type CardType = "hanzi" | "pinyin" | "english";

export interface Card {
  id: string;
  wordIndex: number;
  type: CardType;
  content: string;
  isFaceUp: boolean;
  isMatched: boolean;
}

export function createCards(wordIndices: number[]): Card[] {
  const cards: Card[] = [];
  
  wordIndices.forEach((wordIndex) => {
    const word = allWords[wordIndex];
    cards.push({
      id: `${wordIndex}-hanzi`,
      wordIndex,
      type: "hanzi",
      content: word.hanzi,
      isFaceUp: false,
      isMatched: false,
    });
    cards.push({
      id: `${wordIndex}-pinyin`,
      wordIndex,
      type: "pinyin",
      content: word.pinyin,
      isFaceUp: false,
      isMatched: false,
    });
    cards.push({
      id: `${wordIndex}-english`,
      wordIndex,
      type: "english",
      content: word.english,
      isFaceUp: false,
      isMatched: false,
    });
  });

  return shuffleArray(cards);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
