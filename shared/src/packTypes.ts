export type PackCategory = 'culture' | 'stem';
export type PackDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'mixed';
export type PackStatus = 'active' | 'archived' | 'draft';
export type PackType = 'standard' | 'narrative' | 'exam';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type ChapterType = 'intro' | 'content' | 'summary' | 'exam';
export type NarratorMood = 'neutral' | 'happy' | 'thinking' | 'excited' | 'serious';

export interface ContentPack {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: PackCategory;
  subject?: string;
  tags: string[];
  difficulty: PackDifficulty;
  gradeLevel?: string;
  curriculum?: string;
  author?: string;
  source?: string;
  sourceUrl?: string;
  license: string;
  version: number;
  coverImage?: string;
  status: PackStatus;
  packType: PackType;
  estimatedDurationMin?: number;
  totalQuestions: number;
  timesUsed: number;
  createdAt: string;
  updatedAt: string;
}

export interface PackChapter {
  id: string;
  packId: string;
  title: string;
  description?: string;
  contentText?: string;
  imageUrl?: string;
  orderIndex: number;
  chapterType: ChapterType;
}

export interface PackQuestion {
  id: string;
  packId: string;
  chapterId?: string;
  type: 'multiple-choice' | 'true-false';
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points: number;
  explanation?: string;
  topic?: string;
  difficulty?: QuestionDifficulty;
  orderIndex: number;
  mathNotation: boolean;
  answers: PackAnswerOption[];
}

export interface PackAnswerOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface PackObjective {
  id: string;
  packId: string;
  text: string;
  orderIndex: number;
}

export interface PackScene {
  id: string;
  packId: string;
  title: string;
  narratorText: string;
  backgroundImage?: string;
  narratorMood: NarratorMood;
  audioFile?: string;
  durationSeconds?: number;
  orderIndex: number;
  questionId?: string;
}

export interface ContentPackFull extends ContentPack {
  objectives: PackObjective[];
  chapters: PackChapter[];
  questions: PackQuestion[];
  scenes: PackScene[];
}

export interface ContentPackSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: PackCategory;
  subject?: string;
  tags: string[];
  difficulty: PackDifficulty;
  packType: PackType;
  totalQuestions: number;
  timesUsed: number;
  coverImage?: string;
  gradeLevel?: string;
  curriculum?: string;
  author?: string;
  estimatedDurationMin?: number;
}
