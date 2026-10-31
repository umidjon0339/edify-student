"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft, CheckCircle2, FolderTree, Lightbulb, ListChecks, PencilLine, Plus, Save, Sparkles, X,
} from "lucide-react";
import toast from "react-hot-toast";

import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useTeacherLanguage } from "@/app/teacher/layout";
import { SUBJECTS, findSubject, findTopic } from "@/lib/questionTopics";
import RichQuestionInput from "@/app/teacher/create/_components/RichQuestionInput";
import { backWithQuestion, safeBackTo } from "@/app/teacher/create/_components/returnTo";
import ImagePicker from "./_components/ImagePicker";
import CreatedQuestionsList from "./_components/CreatedQuestionsList";
import {
  MAX_INCORRECT_OPTIONS, draftFromQuestion, emptyOption, fetchQuestionById, hasOptions,
  newQuestionId, saveQuestion, updateQuestion, uploadQuestionImage, validateDraft,
  type OptionDraft, type QuestionDraft,
} from "@/services/questionBankService";
import { normalizeQuestion } from "@/lib/questionSchema";
import { cacheQuestion } from "@/lib/questionCache";
import {
  DIFFICULTY_LEVELS, IMPLEMENTED_QUESTION_TYPES,
  type DifficultyName, type NormalizedQuestion, type QuestionStatus, type QuestionType,
} from "@/types/question";

import { Button, Card, Checkbox, IconButton, ProgressBar, Select, Switch, TextField } from "@/components/ui";

// --- TRANSLATION DICTIONARY ---
const T = {
  uz: {
    headerTitle: "Savol Yaratish",
    editTitle: "Savolni Tahrirlash",
    editBanner: "Mavjud savol tahrirlanmoqda:",
    cancelEdit: "Bekor qilish",
    updateBtn: "O'zgarishni Saqlash",
    updated: "Savol yangilandi!",
    saveBtn: "Savolni Saqlash",
    prompt: { title: "Savol", desc: "Matn yozing (matematik belgilar uchun ∑ tugmasi) va/yoki rasm yuklang." },
    promptLabel: "Savol matni",
    promptPlaceholder: "Masalan: Tenglamani yeching...",
    image: { add: "Rasm yuklash", camera: "Kamera", change: "Almashtirish", remove: "O'chirish", hint: "PNG, JPG — 5 MB gacha", uploading: "Rasmlar yuklanmoqda..." },
    backBanner: "Saqlagach variantga qaytasiz.",
    backNow: "Variantga qaytish",
    topic: { title: "Mavzu", desc: "Savol qaysi fan, mavzu va ichki mavzuga tegishli.", subject: "Fan", topicLabel: "Mavzu", subtopic: "Ichki mavzu", choose: "Tanlang..." },
    answer: { title: "Savol turi va javob", desc: "Savol turini tanlang, so'ng javobni kiriting." },
    typeLabel: "Savol turi",
    types: { mcq: "Test (bitta javob)", multiple_select: "Bir nechta to'g'ri javob", true_false: "To'g'ri / Noto'g'ri", open: "Ochiq javob (matn)", numeric: "Raqamli javob" },
    correct: { label: "To'g'ri javob", placeholder: "To'g'ri javobni kiriting..." },
    incorrect: { title: "Boshqa variantlar", add: "Variant qo'shish", placeholder: "Variant matni...", markCorrect: "Bu ham to'g'ri", hint: "Har bir variantga matn, rasm yoki ikkalasini kiritish mumkin. Saqlashda aralashtirilib, harflar beriladi:" },
    accepted: { title: "Qabul qilinadigan boshqa javoblar", add: "Muqobil javob qo'shish", placeholder: "Masalan: 0.5", hint: "Ixtiyoriy. Shu javoblar ham to'g'ri hisoblanadi." },
    caseSensitive: "Katta-kichik harf farqlansin",
    extras: { title: "Qo'shimcha", difficulty: "Daraja", status: "Holati", points: "Ball", time: "Vaqt (soniya)", tags: "Teglar (vergul bilan)", tagsPlaceholder: "algebra, tenglama", curriculum: "Dastur (vergul bilan)", curriculumPlaceholder: "8-sinf, DTM", hint: "Yordam (ixtiyoriy)", hintPlaceholder: "O'quvchiga kichik ishora...", explanation: "Yechim / izoh (ixtiyoriy)", explanationPlaceholder: "Javob nega to'g'ri ekanini tushuntiring..." },
    difficulties: { beginner: "Boshlang'ich", easy: "Oson", medium: "O'rta", hard: "Qiyin", expert: "Ekspert", olympiad: "Olimpiada" },
    statuses: { draft: "Qoralama", review: "Ko'rib chiqishda", approved: "Tasdiqlangan", published: "Nashr qilingan", archived: "Arxiv" },
    errors: {
      noPrompt: "Savol matnini yozing yoki rasm yuklang.",
      noTopic: "Fan, mavzu va ichki mavzuni tanlang.",
      noAnswer: "To'g'ri javobni kiriting (matn yoki rasm).",
      noOptions: "Kamida bitta boshqa variant kiriting.",
      duplicateOption: "Variantlar takrorlanmasligi kerak.",
      imageTooBig: "Rasm hajmi 5 MB dan oshmasligi kerak.",
      notImage: "Faqat rasm fayllarini yuklash mumkin.",
      uploadFailed: "Rasmni yuklab bo'lmadi.",
      saveFailed: "Savolni saqlab bo'lmadi.",
      notFound: "Savol topilmadi.",
    },
    saved: "Savol bazaga saqlandi!",
    savedHint: "Yana savol qo'shishingiz mumkin.",
    list: {
      title: "Savollar bazasi",
      subtitle: "Bu yerda faqat siz hozir yaratgan savollar ko'rinadi. Eskilarini yuklash uchun tugmani bosing.",
      justCreated: "Yangi",
      empty: "Hali savol yaratilmadi.",
      fetch: "Oxirgi 10 ta savolni yuklash",
      fetchMore: "Yana 10 ta yuklash",
      noMore: "Barcha savollar yuklandi.",
      loadFailed: "Savollarni yuklab bo'lmadi.",
      deleted: "Savol o'chirildi.",
      deleteFailed: "O'chirib bo'lmadi.",
      confirmDelete: "Bu savol o'chirilsinmi?",
      edit: "Tahrirlash",
      correctedBy: "Tuzatgan:",
      correctIs: "To'g'ri javob:",
      imageOnly: "Faqat rasmli savol",
      count: "ta",
    },
  },
  en: {
    headerTitle: "Create Question",
    editTitle: "Edit Question",
    editBanner: "Editing an existing question:",
    cancelEdit: "Cancel",
    updateBtn: "Save Changes",
    updated: "Question updated!",
    saveBtn: "Save Question",
    prompt: { title: "Question", desc: "Type the prompt (use ∑ for math symbols) and/or attach an image." },
    promptLabel: "Question text",
    promptPlaceholder: "e.g. Solve the equation...",
    image: { add: "Upload image", camera: "Camera", change: "Replace", remove: "Remove", hint: "PNG, JPG — up to 5 MB", uploading: "Uploading images..." },
    backBanner: "Saving returns you to your paper.",
    backNow: "Back to the paper",
    topic: { title: "Topic", desc: "Which subject, topic and subtopic this question belongs to.", subject: "Subject", topicLabel: "Topic", subtopic: "Subtopic", choose: "Choose..." },
    answer: { title: "Question type & answer", desc: "Pick the question type, then enter the answer." },
    typeLabel: "Question type",
    types: { mcq: "Multiple choice (one answer)", multiple_select: "Multiple correct answers", true_false: "True / False", open: "Open answer (text)", numeric: "Numeric answer" },
    correct: { label: "Correct answer", placeholder: "Enter the correct answer..." },
    incorrect: { title: "Other options", add: "Add option", placeholder: "Option text...", markCorrect: "Also correct", hint: "Each option can hold text, an image, or both. On save they are shuffled and lettered:" },
    accepted: { title: "Other accepted answers", add: "Add alternative", placeholder: "e.g. 0.5", hint: "Optional. These also count as correct." },
    caseSensitive: "Case-sensitive matching",
    extras: { title: "Extras", difficulty: "Difficulty", status: "Status", points: "Points", time: "Time (seconds)", tags: "Tags (comma separated)", tagsPlaceholder: "algebra, equations", curriculum: "Curriculum (comma separated)", curriculumPlaceholder: "Grade 8, SAT", hint: "Hint (optional)", hintPlaceholder: "A small nudge for the student...", explanation: "Explanation (optional)", explanationPlaceholder: "Explain why the answer is correct..." },
    difficulties: { beginner: "Beginner", easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert", olympiad: "Olympiad" },
    statuses: { draft: "Draft", review: "In review", approved: "Approved", published: "Published", archived: "Archived" },
    errors: {
      noPrompt: "Add question text or an image.",
      noTopic: "Pick a subject, topic and subtopic.",
      noAnswer: "Enter the correct answer (text or image).",
      noOptions: "Add at least one other option.",
      duplicateOption: "Options must be unique.",
      imageTooBig: "The image must be under 5 MB.",
      notImage: "Only image files can be uploaded.",
      uploadFailed: "Could not upload the image.",
      saveFailed: "Could not save the question.",
      notFound: "Question not found.",
    },
    saved: "Question saved to your bank!",
    savedHint: "You can add another one.",
    list: {
      title: "Question bank",
      subtitle: "Only what you just created is shown. Press the button to load older ones.",
      justCreated: "New",
      empty: "Nothing created yet.",
      fetch: "Load last 10 questions",
      fetchMore: "Load 10 more",
      noMore: "All questions loaded.",
      loadFailed: "Could not load the questions.",
      deleted: "Question deleted.",
      deleteFailed: "Could not delete.",
      confirmDelete: "Delete this question?",
      edit: "Edit",
      correctedBy: "Corrected by:",
      correctIs: "Correct answer:",
      imageOnly: "Image-only question",
      count: "total",
    },
  },
  ru: {
    headerTitle: "Создать Вопрос",
    editTitle: "Редактировать вопрос",
    editBanner: "Редактируется существующий вопрос:",
    cancelEdit: "Отмена",
    updateBtn: "Сохранить изменения",
    updated: "Вопрос обновлён!",
    saveBtn: "Сохранить вопрос",
    prompt: { title: "Вопрос", desc: "Введите текст (кнопка ∑ для матем. символов) и/или загрузите изображение." },
    promptLabel: "Текст вопроса",
    promptPlaceholder: "Например: Решите уравнение...",
    image: { add: "Загрузить изображение", camera: "Камера", change: "Заменить", remove: "Удалить", hint: "PNG, JPG — до 5 МБ", uploading: "Загрузка изображений..." },
    backBanner: "После сохранения вернётесь к варианту.",
    backNow: "Вернуться к варианту",
    topic: { title: "Тема", desc: "К какому предмету, теме и подтеме относится вопрос.", subject: "Предмет", topicLabel: "Тема", subtopic: "Подтема", choose: "Выберите..." },
    answer: { title: "Тип вопроса и ответ", desc: "Выберите тип вопроса, затем введите ответ." },
    typeLabel: "Тип вопроса",
    types: { mcq: "Тест (один ответ)", multiple_select: "Несколько верных ответов", true_false: "Верно / Неверно", open: "Открытый ответ (текст)", numeric: "Числовой ответ" },
    correct: { label: "Правильный ответ", placeholder: "Введите правильный ответ..." },
    incorrect: { title: "Другие варианты", add: "Добавить вариант", placeholder: "Текст варианта...", markCorrect: "Тоже верный", hint: "В каждом варианте может быть текст, изображение или оба. При сохранении они перемешиваются и получают буквы:" },
    accepted: { title: "Другие принимаемые ответы", add: "Добавить альтернативу", placeholder: "Например: 0.5", hint: "Необязательно. Эти ответы тоже засчитываются." },
    caseSensitive: "Учитывать регистр",
    extras: { title: "Дополнительно", difficulty: "Сложность", status: "Статус", points: "Баллы", time: "Время (сек.)", tags: "Теги (через запятую)", tagsPlaceholder: "алгебра, уравнения", curriculum: "Программа (через запятую)", curriculumPlaceholder: "8 класс, SAT", hint: "Подсказка (необязательно)", hintPlaceholder: "Небольшая подсказка ученику...", explanation: "Объяснение (необязательно)", explanationPlaceholder: "Объясните, почему ответ верный..." },
    difficulties: { beginner: "Начальный", easy: "Легкий", medium: "Средний", hard: "Сложный", expert: "Эксперт", olympiad: "Олимпиада" },
    statuses: { draft: "Черновик", review: "На проверке", approved: "Одобрен", published: "Опубликован", archived: "В архиве" },
    errors: {
      noPrompt: "Введите текст вопроса или загрузите изображение.",
      noTopic: "Выберите предмет, тему и подтему.",
      noAnswer: "Введите правильный ответ (текст или изображение).",
      noOptions: "Добавьте хотя бы один другой вариант.",
      duplicateOption: "Варианты не должны повторяться.",
      imageTooBig: "Изображение должно быть меньше 5 МБ.",
      notImage: "Можно загружать только изображения.",
      uploadFailed: "Не удалось загрузить изображение.",
      saveFailed: "Не удалось сохранить вопрос.",
      notFound: "Вопрос не найден.",
    },
    saved: "Вопрос сохранён в базу!",
    savedHint: "Можно добавить ещё один.",
    list: {
      title: "База вопросов",
      subtitle: "Показаны только что созданные вопросы. Нажмите кнопку, чтобы загрузить остальные.",
      justCreated: "Новый",
      empty: "Пока ничего не создано.",
      fetch: "Загрузить последние 10 вопросов",
      fetchMore: "Загрузить ещё 10",
      noMore: "Все вопросы загружены.",
      loadFailed: "Не удалось загрузить вопросы.",
      deleted: "Вопрос удалён.",
      deleteFailed: "Не удалось удалить.",
      confirmDelete: "Удалить этот вопрос?",
      edit: "Редактировать",
      correctedBy: "Исправил:",
      correctIs: "Правильный ответ:",
      imageOnly: "Вопрос только с изображением",
      count: "шт.",
    },
  },
};

/** Option + the not-yet-uploaded file and its local preview. */
interface LocalOption extends OptionDraft {
  key: string;
  file: File | null;
  preview: string | null;
}

let optionKeySeq = 0;
const newLocalOption = (): LocalOption => ({ ...emptyOption(), key: `opt-${optionKeySeq++}`, file: null, preview: null });

const EMPTY_FORM = {
  questionText: "",
  subjectId: "",
  topicId: "",
  subtopicId: "",
  type: "mcq" as QuestionType,
  status: "published" as QuestionStatus,
  extraCorrectKeys: [] as string[],
  acceptedAnswers: [] as string[],
  caseSensitive: false,
  explanation: "",
  hint: "",
  difficulty: "medium" as DifficultyName,
  points: 1,
  estimatedTime: 60,
};

function QuestionBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = T[lang] || T.uz;

  const [questionId, setQuestionId] = useState("");
  /** Set → the form is EDITING this stored question instead of creating a new one. */
  const [editing, setEditing] = useState<NormalizedQuestion | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  /** Created/edited in this session — rendered with no Firestore read. */
  const [sessionQuestions, setSessionQuestions] = useState<NormalizedQuestion[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tagsRaw, setTagsRaw] = useState("");
  const [curriculumRaw, setCurriculumRaw] = useState("");

  const [promptFile, setPromptFile] = useState<File | null>(null);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);

  const [correctOption, setCorrectOption] = useState<LocalOption>(newLocalOption);
  const [incorrectOptions, setIncorrectOptions] = useState<LocalOption[]>(() => [newLocalOption(), newLocalOption(), newLocalOption()]);

  const [creatorName, setCreatorName] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  // Remounts the rich-text editors after a save so they clear along with the state.
  const [formKey, setFormKey] = useState(0);

  // The ID is reserved client-side so images can be filed under it before the doc exists.
  useEffect(() => setQuestionId(newQuestionId()), []);

  /**
   * Where a PAPER BUILDER sent the teacher from, if one did (docs/MILLIY_QUIZ.md).
   * Set ⇒ the back arrow and a successful save both return there instead of
   * dropping the teacher at the create hub with a half-built paper behind them.
   */
  const backTo = safeBackTo(searchParams.get("back"));

  // The builder also names its subject, so the Fan dropdown starts on the right
  // one — a question filed under another subject cannot join that paper.
  const prefillSubject = searchParams.get("subject");
  useEffect(() => {
    if (!prefillSubject || !findSubject(prefillSubject)) return;
    setForm((p) => (p.subjectId ? p : { ...p, subjectId: prefillSubject }));
  }, [prefillSubject]);

  // The teacher's name is stamped onto every question; Auth's displayName can be
  // empty for accounts created through the username flow, so fall back to users/{uid}.
  useEffect(() => {
    if (!user) return;
    if (user.displayName) return setCreatorName(user.displayName);

    getDoc(doc(db, "users", user.uid))
      .then((snap) => setCreatorName(snap.data()?.displayName || "Teacher"))
      .catch(() => setCreatorName("Teacher"));
  }, [user]);

  const subject = findSubject(form.subjectId);
  const topic = findTopic(form.subjectId, form.topicId);
  const showsOptions = hasOptions(form.type);
  const isMultiSelect = form.type === "multiple_select";

  const revoke = (url: string | null) => url?.startsWith("blob:") && URL.revokeObjectURL(url);

  const pickPrompt = (file: File) => {
    revoke(promptPreview);
    setPromptFile(file);
    setPromptPreview(URL.createObjectURL(file));
  };

  const clearPrompt = () => {
    revoke(promptPreview);
    setPromptFile(null);
    setPromptPreview(null);
  };

  const updateIncorrect = (key: string, fields: Partial<LocalOption>) =>
    setIncorrectOptions((prev) => prev.map((o) => (o.key === key ? { ...o, ...fields } : o)));

  const pickOptionImage = (opt: LocalOption, file: File, isCorrect: boolean) => {
    revoke(opt.preview);
    const fields = { file, preview: URL.createObjectURL(file) };
    if (isCorrect) setCorrectOption((prev) => ({ ...prev, ...fields }));
    else updateIncorrect(opt.key, fields);
  };

  const clearOptionImage = (opt: LocalOption, isCorrect: boolean) => {
    revoke(opt.preview);
    const fields = { file: null, preview: null, imageUrl: null, imageStoragePath: null };
    if (isCorrect) setCorrectOption((prev) => ({ ...prev, ...fields }));
    else updateIncorrect(opt.key, fields);
  };

  const imageError = (key: "notImage" | "imageTooBig") => toast.error(t.errors[key]);

  const resetForm = () => {
    clearPrompt();
    revoke(correctOption.preview);
    incorrectOptions.forEach((o) => revoke(o.preview));

    // The topic and the question type are kept — teachers add several in a row.
    setForm((prev) => ({
      ...EMPTY_FORM,
      subjectId: prev.subjectId, topicId: prev.topicId, subtopicId: prev.subtopicId,
      type: prev.type, status: prev.status, difficulty: prev.difficulty,
    }));
    setTagsRaw("");
    setCurriculumRaw("");
    setCorrectOption(newLocalOption());
    setIncorrectOptions([newLocalOption(), newLocalOption(), newLocalOption()]);
    setUploadPercent(0);
    setQuestionId(newQuestionId());
    setEditing(null);
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Loads a stored question INTO the form so a broken one can be fixed. Works on
   * legacy questions too — they are the likeliest to need it. Existing images are
   * previewed straight from their download URL (no re-upload unless replaced).
   */
  const loadForEdit = useCallback((q: NormalizedQuestion) => {
    // A block cannot be edited here: this form lifts ONE option out as "the
    // answer" and knows nothing about `parts`, so saving would destroy every
    // sub-question. Hand it to the block editor instead.
    if (q.isBlock) {
      cacheQuestion(q);
      router.replace(`/teacher/create/block?edit=${q.id}`);
      return;
    }

    const draft = draftFromQuestion(q);
    const toLocal = (o: OptionDraft): LocalOption => ({ ...o, key: `opt-${optionKeySeq++}`, file: null, preview: o.imageUrl });

    setEditing(q);
    setQuestionId(q.id);
    setForm({
      questionText: draft.questionText,
      subjectId: draft.subjectId, topicId: draft.topicId, subtopicId: draft.subtopicId,
      type: draft.type, status: draft.status,
      extraCorrectKeys: draft.extraCorrectKeys,
      acceptedAnswers: draft.acceptedAnswers,
      caseSensitive: draft.caseSensitive,
      explanation: draft.explanation, hint: draft.hint,
      difficulty: draft.difficulty, points: draft.points, estimatedTime: draft.estimatedTime,
    });
    setTagsRaw(draft.tags.join(", "));
    setCurriculumRaw(draft.curriculum.join(", "));
    setPromptFile(null);
    setPromptPreview(draft.imageUrl);
    setCorrectOption(toLocal(draft.correctOption));
    setIncorrectOptions(draft.incorrectOptions.map(toLocal));
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Deep link from the bank: /teacher/create/question?edit=tq_xxx — the ONE read
  // this page makes on mount, and only when an id is actually in the URL.
  const editId = searchParams.get("edit");
  useEffect(() => {
    if (!editId || !user) return;
    setLoadingEdit(true);
    fetchQuestionById(editId)
      .then((q) => (q ? loadForEdit(q) : toast.error(t.errors.notFound)))
      .catch(() => toast.error(t.errors.notFound))
      .finally(() => setLoadingEdit(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, user, loadForEdit]);

  const buildDraft = (overrides: Partial<QuestionDraft> = {}): QuestionDraft => ({
    questionText: form.questionText,
    // Overwritten below with the freshly uploaded image, if one was picked.
    imageUrl: null,
    imageStoragePath: null,

    subjectId: form.subjectId,
    subjectName: subject?.name || "",
    topicId: form.topicId,
    topicName: topic?.name || "",
    subtopicId: form.subtopicId,
    subtopicName: topic?.subtopics.find((s) => s.id === form.subtopicId)?.name || "",

    type: form.type,
    status: form.status,
    correctOption,
    incorrectOptions,
    extraCorrectKeys: form.extraCorrectKeys,
    acceptedAnswers: form.acceptedAnswers,
    caseSensitive: form.caseSensitive,

    explanation: form.explanation,
    hint: form.hint,
    difficulty: form.difficulty,
    points: form.points,
    estimatedTime: form.estimatedTime,
    tags: tagsRaw.split(",").map((s) => s.trim()).filter(Boolean),
    curriculum: curriculumRaw.split(",").map((s) => s.trim()).filter(Boolean),
    ...overrides,
  });

  // Where the prompt image of the question under edit already lives in Storage.
  const editingPromptPath = editing
    ? ((editing.raw as Record<string, { storagePath?: string }>)?.image?.storagePath ?? null)
    : null;

  const handleSave = async () => {
    if (!user || !questionId) return;

    // A file that is picked but not yet uploaded still satisfies the "has an image" checks.
    const pendingUrl = (file: File | null, url: string | null) => url ?? (file ? "pending" : null);
    const check = validateDraft(
      buildDraft({
        imageUrl: pendingUrl(promptFile, null),
        correctOption: { ...correctOption, imageUrl: pendingUrl(correctOption.file, correctOption.imageUrl) },
        incorrectOptions: incorrectOptions.map((o) => ({ ...o, imageUrl: pendingUrl(o.file, o.imageUrl) })),
      }),
    );
    if (!check.ok) return toast.error(t.errors[check.errorKey!]);

    setIsSaving(true);
    try {
      // Upload every picked image first; nothing is uploaded for an abandoned form.
      const upload = (slot: string, file: File) => uploadQuestionImage(user.uid, questionId, slot, file, setUploadPercent);

      // On an EDIT, an image the teacher didn't touch is already uploaded — keep
      // its URL/path as-is and re-upload nothing.
      let promptImage = { imageUrl: promptFile ? null : promptPreview, imageStoragePath: null as string | null };
      if (!promptFile && editing) promptImage = { imageUrl: editing.imageUrl, imageStoragePath: editingPromptPath };

      let correctResolved = correctOption;
      let incorrectResolved = incorrectOptions;

      try {
        if (promptFile) promptImage = await upload("prompt", promptFile);

        if (correctOption.file) {
          correctResolved = { ...correctOption, ...(await upload("correct", correctOption.file)) };
        }

        incorrectResolved = await Promise.all(
          incorrectOptions.map(async (o, i) => (o.file ? { ...o, ...(await upload(`opt${i}`, o.file)) } : o)),
        );
      } catch (err) {
        console.error("image upload failed:", err);
        toast.error(t.errors.uploadFailed);
        return;
      }

      const draft = buildDraft({ ...promptImage, correctOption: correctResolved, incorrectOptions: incorrectResolved });

      const saved = editing
        ? await updateQuestion(draft, editing, user.uid, creatorName || "Teacher")
        : await saveQuestion(draft, questionId, user.uid, creatorName || "Teacher");

      // Show it immediately from memory — no read-back after the write.
      const normalized = normalizeQuestion(saved);
      setSessionQuestions((prev) => [normalized, ...prev.filter((q) => q.id !== normalized.id)]);

      toast.success(editing ? t.updated : t.saved);

      // Came from a paper builder → go straight back to it, carrying the new
      // question so the paper picks it up with NO read (questionCache) and the
      // teacher does not have to hunt for it in the bank picker.
      // ⚠️ Only a NEW question rides back: one that was merely edited is either
      // already on the paper (a duplicate) or was left off it on purpose.
      if (backTo) {
        cacheQuestion(normalized);
        router.push(editing ? backTo : backWithQuestion(backTo, normalized.id));
        return;
      }

      if (!editing) toast(t.savedHint, { icon: "💡" });
      resetForm();
    } catch (err) {
      console.error("teacher_questions save failed:", err);
      toast.error(t.errors.saveFailed);
    } finally {
      setIsSaving(false);
      setUploadPercent(0);
    }
  };

  // No format hint under the uploader — an oversize/non-image file still errors.
  const imageLabels = { add: t.image.add, camera: t.image.camera, change: t.image.change, remove: t.image.remove, hint: "" };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface pb-28 lg:pb-12">

      {/* HEADER */}
      <div className="t-page-bar sticky top-0 z-30 bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-md border-b border-outline-variant px-3 md:px-8 py-3 flex justify-between items-center shadow-elev-1">
        <div className="flex items-center gap-2 md:gap-3">
          <IconButton aria-label="Orqaga" size="sm" onClick={() => router.push(backTo ?? "/teacher/create")}>
            <ArrowLeft />
          </IconButton>
          <h1 className="text-[15px] md:text-[18px] font-bold text-on-surface tracking-tight flex items-center gap-2">
            <Sparkles size={16} className="text-primary" /> {editing ? t.editTitle : t.headerTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <Button variant="text" size="sm" onClick={resetForm} disabled={isSaving}>
              {t.cancelEdit}
            </Button>
          )}
          <Button
            variant="filled"
            size="sm"
            icon={editing ? <Save /> : <CheckCircle2 />}
            loading={isSaving || loadingEdit}
            onClick={handleSave}
          >
            <span className="hidden sm:inline">{editing ? t.updateBtn : t.saveBtn}</span>
          </Button>
        </div>
      </div>

      <main className="w-full max-w-[900px] mx-auto px-3 md:px-8 pt-5 md:pt-8 space-y-4 md:space-y-6">

        {/* Sent here by a paper builder — the paper is parked in localStorage and
            the way back is always one tap away, saved or not. */}
        {backTo && (
          <div className="t-glass-pill rounded-full pl-4 pr-1.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-on-surface">{t.backBanner}</p>
            <Button variant="tonal" size="sm" icon={<ArrowLeft />} onClick={() => router.push(backTo)}>{t.backNow}</Button>
          </div>
        )}

        {/* Editing an existing question — the form writes back to the SAME doc. */}
        {editing && (
          <div className="rounded-m3-lg border border-primary bg-primary-container text-on-primary-container px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-[13px] font-bold flex items-center gap-2">
              <Save size={15} className="shrink-0" />
              {t.editBanner} <span className="font-mono opacity-80">{editing.id}</span>
            </p>
            <Button variant="text" size="sm" onClick={resetForm}>{t.cancelEdit}</Button>
          </div>
        )}

        {/* --- 1. PROMPT: text (with math keyboard) + optional image --- */}
        <Card variant="elevated" className="p-4 md:p-6">
          <SectionTitle icon={<PencilLine size={16} />} title={t.prompt.title} desc={t.prompt.desc} />

          <div className="mt-4">
            <RichQuestionInput
              key={`prompt-${formKey}`}
              label=""
              value={form.questionText}
              onChange={(latex) => setForm((p) => ({ ...p, questionText: latex }))}
              placeholder={t.promptPlaceholder}
            />
          </div>

          <div className="mt-4">
            <ImagePicker
              previewUrl={promptPreview}
              onPick={pickPrompt}
              onClear={clearPrompt}
              onError={imageError}
              labels={imageLabels}
            />
          </div>

          {isSaving && uploadPercent > 0 && uploadPercent < 100 && (
            <div className="mt-3">
              <ProgressBar value={uploadPercent} />
              <p className="text-[11px] font-bold text-on-surface-variant mt-1">{t.image.uploading} {uploadPercent}%</p>
            </div>
          )}
        </Card>

        {/* --- 2. TOPIC PATH (data/question_topics.json) --- */}
        <Card variant="elevated" className="p-4 md:p-6">
          <SectionTitle icon={<FolderTree size={16} />} title={t.topic.title} desc={t.topic.desc} />

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label={t.topic.subject}
              value={form.subjectId}
              onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value, topicId: "", subtopicId: "" }))}
            >
              <option value="">{t.topic.choose}</option>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>

            <Select
              label={t.topic.topicLabel}
              value={form.topicId}
              disabled={!subject}
              onChange={(e) => setForm((p) => ({ ...p, topicId: e.target.value, subtopicId: "" }))}
            >
              <option value="">{t.topic.choose}</option>
              {(subject?.topics || []).map((tp) => (
                <option key={tp.id} value={tp.id}>{tp.name}</option>
              ))}
            </Select>

            <Select
              label={t.topic.subtopic}
              value={form.subtopicId}
              disabled={!topic}
              onChange={(e) => setForm((p) => ({ ...p, subtopicId: e.target.value }))}
            >
              <option value="">{t.topic.choose}</option>
              {(topic?.subtopics || []).map((st) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </Select>
          </div>
        </Card>

        {/* --- 3. TYPE + ANSWER --- */}
        <Card variant="elevated" className="p-4 md:p-6">
          <SectionTitle icon={<ListChecks size={16} />} title={t.answer.title} desc={t.answer.desc} />

          <div className="mt-4">
            <Select
              label={t.typeLabel}
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as QuestionType, extraCorrectKeys: [] }))}
            >
              {IMPLEMENTED_QUESTION_TYPES.map((qt) => (
                <option key={qt} value={qt}>{t.types[qt as keyof typeof t.types]}</option>
              ))}
            </Select>
          </div>

          {/* Correct answer — every type has one; images only make sense when options are shown */}
          <div className="mt-5 p-3 md:p-4 rounded-m3-lg border border-primary bg-[color-mix(in_oklab,var(--m3-primary-container)_35%,transparent)]">
            <RichQuestionInput
              key={`correct-${formKey}`}
              label={t.correct.label}
              value={correctOption.text}
              onChange={(latex) => setCorrectOption((prev) => ({ ...prev, text: latex }))}
              placeholder={t.correct.placeholder}
              compact
            />
            {showsOptions && (
              <div className="mt-2.5">
                <ImagePicker
                  previewUrl={correctOption.preview}
                  onPick={(f) => pickOptionImage(correctOption, f, true)}
                  onClear={() => clearOptionImage(correctOption, true)}
                  onError={imageError}
                  labels={imageLabels}
                  compact
                />
              </div>
            )}
          </div>

          {/* Option-based types → the other options, each with its own optional image */}
          {showsOptions && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">{t.incorrect.title}</h3>
                <span className="text-[11px] font-bold text-outline">
                  {incorrectOptions.length}/{MAX_INCORRECT_OPTIONS}
                </span>
              </div>

              <div className="space-y-3">
                {incorrectOptions.map((opt, i) => (
                  <div key={opt.key} className="flex items-start gap-2 rounded-m3-lg border border-outline-variant p-2.5">
                    <div className="w-7 h-7 shrink-0 mt-1 rounded-m3-sm bg-surface-container border border-outline-variant flex items-center justify-center text-[11px] font-black text-on-surface-variant">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <RichQuestionInput
                        key={`${formKey}-${opt.key}`}
                        label=""
                        value={opt.text}
                        onChange={(latex) => updateIncorrect(opt.key, { text: latex })}
                        placeholder={t.incorrect.placeholder}
                        compact
                      />
                      <ImagePicker
                        previewUrl={opt.preview}
                        onPick={(f) => pickOptionImage(opt, f, false)}
                        onClear={() => clearOptionImage(opt, false)}
                        onError={imageError}
                        labels={imageLabels}
                        compact
                      />
                      {/* multiple_select: any of the other options can ALSO be correct */}
                      {isMultiSelect && (
                        <Checkbox
                          label={t.incorrect.markCorrect}
                          checked={form.extraCorrectKeys.includes(String(i))}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              extraCorrectKeys: e.target.checked
                                ? [...p.extraCorrectKeys, String(i)]
                                : p.extraCorrectKeys.filter((k) => k !== String(i)),
                            }))
                          }
                        />
                      )}
                    </div>
                    <IconButton
                      aria-label={t.image.remove}
                      size="sm"
                      className="mt-1"
                      onClick={() => {
                        revoke(opt.preview);
                        setIncorrectOptions((prev) => (prev.length <= 1 ? prev : prev.filter((o) => o.key !== opt.key)));
                      }}
                      disabled={incorrectOptions.length <= 1}
                    >
                      <X />
                    </IconButton>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <span />
                <Button
                  variant="tonal"
                  size="sm"
                  icon={<Plus />}
                  onClick={() => setIncorrectOptions((prev) => (prev.length >= MAX_INCORRECT_OPTIONS ? prev : [...prev, newLocalOption()]))}
                  disabled={incorrectOptions.length >= MAX_INCORRECT_OPTIONS}
                >
                  {t.incorrect.add}
                </Button>
              </div>
            </div>
          )}

          {/* Text-answer types → accepted alternatives + case sensitivity */}
          {!showsOptions && (
            <div className="mt-5">
              <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">{t.accepted.title}</h3>

              <div className="space-y-2.5">
                {form.acceptedAnswers.map((alt, i) => (
                  <div key={`alt-${i}`} className="flex items-center gap-2">
                    <TextField
                      label={`${t.accepted.title} ${i + 1}`}
                      value={alt}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, acceptedAnswers: p.acceptedAnswers.map((a, x) => (x === i ? e.target.value : a)) }))
                      }
                      placeholder={t.accepted.placeholder}
                      className="flex-1"
                    />
                    <IconButton
                      aria-label={t.image.remove}
                      size="sm"
                      onClick={() => setForm((p) => ({ ...p, acceptedAnswers: p.acceptedAnswers.filter((_, x) => x !== i) }))}
                    >
                      <X />
                    </IconButton>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3">

                <Button
                  variant="tonal"
                  size="sm"
                  icon={<Plus />}
                  onClick={() => setForm((p) => ({ ...p, acceptedAnswers: [...p.acceptedAnswers, ""] }))}
                >
                  {t.accepted.add}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-outline-variant">
                <span className="text-[13px] font-bold text-on-surface">{t.caseSensitive}</span>
                <Switch
                  checked={form.caseSensitive}
                  onChange={(e) => setForm((p) => ({ ...p, caseSensitive: e.target.checked }))}
                />
              </div>
            </div>
          )}
        </Card>

        {/* --- 4. EXTRAS --- */}
        <Card variant="elevated" className="p-4 md:p-6">
          <SectionTitle icon={<Lightbulb size={16} />} title={t.extras.title} />

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              label={t.extras.difficulty}
              value={form.difficulty}
              onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value as DifficultyName }))}
            >
              {DIFFICULTY_LEVELS.map((d) => (
                <option key={d} value={d}>{t.difficulties[d]}</option>
              ))}
            </Select>

            <Select
              label={t.extras.status}
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as QuestionStatus }))}
            >
              {(["draft", "review", "approved", "published", "archived"] as const).map((s) => (
                <option key={s} value={s}>{t.statuses[s]}</option>
              ))}
            </Select>

            <TextField
              label={t.extras.points}
              type="number"
              min={0}
              value={form.points}
              onChange={(e) => setForm((p) => ({ ...p, points: Number(e.target.value) || 0 }))}
            />

            <TextField
              label={t.extras.time}
              type="number"
              min={0}
              value={form.estimatedTime}
              onChange={(e) => setForm((p) => ({ ...p, estimatedTime: Number(e.target.value) || 0 }))}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label={t.extras.tags}
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder={t.extras.tagsPlaceholder}
            />
            <TextField
              label={t.extras.curriculum}
              value={curriculumRaw}
              onChange={(e) => setCurriculumRaw(e.target.value)}
              placeholder={t.extras.curriculumPlaceholder}
            />
          </div>

          <div className="mt-4 space-y-4">
            <RichQuestionInput
              key={`hint-${formKey}`}
              label={t.extras.hint}
              value={form.hint}
              onChange={(latex) => setForm((p) => ({ ...p, hint: latex }))}
              placeholder={t.extras.hintPlaceholder}
              compact
            />
            <RichQuestionInput
              key={`exp-${formKey}`}
              label={t.extras.explanation}
              value={form.explanation}
              onChange={(latex) => setForm((p) => ({ ...p, explanation: latex }))}
              placeholder={t.extras.explanationPlaceholder}
              compact
            />
          </div>
        </Card>

        {/* --- 5. WHAT I ALREADY CREATED --- */}
        {user && (
          <CreatedQuestionsList
            creatorId={user.uid}
            sessionQuestions={sessionQuestions}
            onEdit={loadForEdit}
            onDeleted={(id) => setSessionQuestions((prev) => prev.filter((q) => q.id !== id))}
            labels={t.list}
          />
        )}
      </main>

      {/* MOBILE SAVE BAR */}
      <div className="lg:hidden fixed bottom-4 left-0 right-0 px-3 z-40">
        <Button
          variant="filled"
          size="lg"
          className="w-full shadow-elev-3"
          icon={<CheckCircle2 />}
          loading={isSaving}
          onClick={handleSave}
        >
          {editing ? t.updateBtn : t.saveBtn}
        </Button>
      </div>
    </div>
  );
}

/** useSearchParams() (the ?edit=... deep link) must sit under a Suspense boundary,
 *  or the production build fails while prerendering this route. */
export default function CreateQuestionPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-surface" />}>
      <QuestionBuilder />
    </Suspense>
  );
}

/** Card heading: icon + title only (subtitles were removed — the controls
 *  below are self-explanatory). `desc` is accepted but no longer rendered. */
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="t-icon-chip w-9 h-9 shrink-0 rounded-m3-md flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h2 className="text-[15px] md:text-[17px] font-extrabold text-on-surface leading-tight">{title}</h2>
      </div>
    </div>
  );
}
