export const buildSafeEdifyQuestion = (
  teacherId: string,
  syllabusData: any,
  questionText: string,
  optionsData: { A: string; B: string; C: string; D: string },
  correctAnswer: "A" | "B" | "C" | "D",
  explanationText: string = "" // 🟢 1. Accept the optional explanation
) => {
  const questionId = `tq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id: questionId,
    creatorId: teacherId,
    topicId: syllabusData?.topic?.index?.toString() || "custom",
    topic: syllabusData?.topic?.category || "Custom Topic",
    chapterId: syllabusData?.chapter?.index?.toString() || "custom",
    chapter: syllabusData?.chapter?.chapter || "Custom Chapter",
    subtopicId: syllabusData?.subtopic?.index?.toString() || "custom",
    subtopic: syllabusData?.subtopic?.name || "Custom Subtopic",
    subjectId: "01",
    subject: "Matematika",

    question: { uz: questionText, ru: "", en: "" },
    options: {
      A: { uz: optionsData.A, ru: optionsData.A, en: optionsData.A },
      B: { uz: optionsData.B, ru: optionsData.B, en: optionsData.B },
      C: { uz: optionsData.C, ru: optionsData.C, en: optionsData.C },
      D: { uz: optionsData.D, ru: optionsData.D, en: optionsData.D }
    },
    answer: correctAnswer,
    
    // 🟢 2. Package it perfectly into the Edify structure
    explanation: { 
      uz: explanationText, 
      ru: "", 
      en: "" 
    },

    difficulty: syllabusData?.difficulty?.toLowerCase() || "medium",
    uiDifficulty: syllabusData?.difficulty || "Medium",
    language: ["uz"],
    tags: ["teacher_created"],
    solutions: []
  };
};