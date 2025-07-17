// Update the Emotion interface in lib/emotions.ts to match types/types.ts
export interface Emotion {
  id: string;
  name: string;
  emoji: string;
  text: string;
  textKey: string;
}

// Elimina el 'as const' y define el array como Emotion[]
export const emotions: Emotion[] = [
  { emoji: "😊", text: "Me siento feliz", textKey: "happy", id: "1", name: "Me siento feliz" },
  { emoji: "🎉", text: "Me siento orgulloso/a", textKey: "proud", id: "2", name: "Me siento orgulloso/a" },
  { emoji: "🚀", text: "Me siento motivado/a", textKey: "motivated", id: "3", name: "Me siento motivado/a" },
  { emoji: "😐", text: "Me siento neutral", textKey: "neutral", id: "4", name: "Me siento neutral" },
  { emoji: "", text: "Me siento frustrado/a", textKey: "frustrated", id: "5", name: "Me siento frustrado/a" },
  { emoji: "😫", text: "Me siento cansado/a", textKey: "tired", id: "6", name: "Me siento cansado/a" },
  { emoji: "😰", text: "Me siento ansioso/a", textKey: "anxious", id: "7", name: "Me siento ansioso/a" },
];

// Helper function to get emotion text by emoji
export const getEmotionByEmoji = (emoji: string) => {
  return emotions.find(emotion => emotion.emoji === emoji);
};

// Helper function to get emoji by emotion text
export const getEmojiByText = (text: string) => {
  return emotions.find(emotion => emotion.text === text)?.emoji;
};

// Helper function to validate if an emoji is valid
export const isValidEmotion = (emoji: string) => {
  return emotions.some(emotion => emotion.emoji === emoji);
};