// types/math.ts

export type Lang = 'uz' | 'ru' | 'en';

export type DifficultyId = 1 | 2 | 3; // 1 = easy, 2 = medium, 3 = hard
export type DifficultyKey = 'easy' | 'medium' | 'hard';

export interface LocalizedText {
  uz: string;
  ru: string;
  en: string;
}

// ─── Precomputed structure doc (metadata/mathStructure) ───────────────────
// One document that replaces N reads of questions1 when rendering the page.

export interface ChapterStructure {
  chapterId: string;
  name: string; // chapter title as stored on the question docs
  subtopicId: string;
  subtopic: string;
  counts: Record<DifficultyKey, number>;
  total: number;
}

export interface TopicStructure {
  topicId: string;
  name: string; // e.g. "Algebra", "Geometriya"
  chapters: ChapterStructure[];
  total: number;
}

export interface SubjectStructure {
  subjectId: string;
  name: string; // e.g. "Matematika"
  topics: TopicStructure[];
  total: number;
}

export interface MathStructureDoc {
  subjects: SubjectStructure[];
  updatedAt: number;
}

// ─── questions1 collection document shape ──────────────────────────────────

export interface QuestionOption {
  uz: string;
  ru: string;
  en: string;
}

export interface QuestionSolution {
  final_answer: string;
  method: string;
  steps: string[];
}

export interface QuestionDoc {
  id: string;
  number: string;
  subjectId: string;
  subject: string;
  topicId: string;
  topic: string;
  subtopicId: string;
  subtopic: string;
  chapterId: string;
  chapter: string;
  difficultyId: DifficultyId;
  difficulty: string;
  question: LocalizedText;
  options: Record<'A' | 'B' | 'C' | 'D', QuestionOption>;
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: LocalizedText;
  solutions: QuestionSolution[];
  tags: string[];
  language: Lang[];
}