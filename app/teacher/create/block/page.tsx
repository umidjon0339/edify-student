"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft, Blocks, CheckCircle2, FolderTree, Layers, Lightbulb, ListChecks, Plus, Save, X,
} from "lucide-react";
import toast from "react-hot-toast";

import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useTeacherLanguage } from "@/app/teacher/layout";
import { SUBJECTS, findSubject, findTopic } from "@/lib/questionTopics";
import RichQuestionInput from "@/app/teacher/create/_components/RichQuestionInput";
import { backWithQuestion, safeBackTo } from "@/app/teacher/create/_components/returnTo";
import ImagePicker from "@/app/teacher/create/question/_components/ImagePicker";
import CreatedQuestionsList from "@/app/teacher/create/question/_components/CreatedQuestionsList";
import { normalizeQuestion } from "@/lib/questionSchema";
import { cacheQuestion } from "@/lib/questionCache";
import { OPTION_LETTERS, emptyOption, fetchQuestionById, uploadQuestionImage, type OptionDraft } from "@/services/questionBankService";
import {
  LETTER_LABELS, MAX_PARTS, MAX_POOL, blockDraftFromQuestion, newPart, newQuestionId, partUsesOptions,
  saveBlock, validateBlock,
  type BlockDraft, type BlockType, type PartDraft, type PartType,
} from "@/services/questionBlockService";
import { DIFFICULTY_LEVELS, type DifficultyName, type NormalizedQuestion } from "@/types/question";

import { Button, Card, IconButton, ProgressBar, Select, TextField, cn } from "@/components/ui";

// --- TRANSLATION DICTIONARY ---
const T = {
  uz: {
    headerTitle: "Ko'p savolli test",
    saveBtn: "Blokni Saqlash",
    editTitle: "Blokni Tahrirlash",
    editBanner: "Mavjud blok tahrirlanmoqda:",
    updateBtn: "O'zgarishni Saqlash",
    updated: "Blok yangilandi!",
    intro: {
      title: "Test turi",
      desc: "Bitta umumiy shart, bir nechta savol — hammasi BITTA hujjat sifatida saqlanadi.",
      closed: "Ko'p savolli yopiq test",
      closedDesc: "Bir nechta savol — barchasi bitta umumiy A–F variantlardan tanlaydi (masalan: 33–35).",
      open: "Ko'p savolli ochiq test",
      openDesc: "Bir nechta savol — har biriga yozma (matnli) javob beriladi (masalan: 39-masala).",
    },
    stem: { title: "Umumiy shart", desc: "Barcha savollar uchun umumiy matn va rasm (chizma).", label: "Shart matni", placeholder: "Masalan: Parallelepiped shaklidagi yopiq quti..." },
    image: { add: "Chizma/rasm yuklash", camera: "Kamera", change: "Almashtirish", remove: "O'chirish", hint: "PNG, JPG — 5 MB gacha", uploading: "Yuklanmoqda..." },
    backBanner: "Variant tuzilmoqda — blokni saqlaganingizdan keyin variantga qaytasiz.",
    backNow: "Variantga qaytish",
    topic: { title: "Mavzu", desc: "Blok qaysi mavzuga tegishli.", subject: "Fan", topicLabel: "Mavzu", subtopic: "Ichki mavzu", choose: "Tanlang..." },
    pool: { title: "Umumiy variantlar", desc: "Bu ro'yxat blok yonida bir marta chop etiladi va barcha savollar shundan tanlaydi.", add: "Variant qo'shish", placeholder: "Variant matni..." },
    parts: { title: "Savollar", add: "Savol qo'shish", label: "Belgi", prompt: "Savol matni", promptPlaceholder: "Savol matnini yozing...", type: "Turi", points: "Ball", correct: "To'g'ri javob", correctText: "To'g'ri javob (matn)", accepted: "Muqobil javoblar (vergul bilan)", ownOptions: "Variantlar", addOption: "Variant" },
    types: { mcq: "Variantli", open: "Ochiq javob", numeric: "Raqamli" },
    extras: { title: "Qo'shimcha", difficulty: "Daraja", time: "Vaqt (soniya)", tags: "Teglar (vergul bilan)", hint: "Yordam (ixtiyoriy)" },
    difficulties: { beginner: "Boshlang'ich", easy: "Oson", medium: "O'rta", hard: "Qiyin", expert: "Ekspert", olympiad: "Olimpiada" },
    savedAs: (n: number) => `Blok saqlandi — ${n} ta savol, 1 ta hujjat.`,
    errors: {
      noStem: "Umumiy shart matnini yozing yoki rasm yuklang.",
      noTopic: "Fan, mavzu va ichki mavzuni tanlang.",
      noParts: "Kamida bitta savol qo'shing.",
      noPartPrompt: "Har bir savolning matnini yozing.",
      noPool: "Kamida 2 ta variant kiriting.",
      noPartAnswer: "Har bir savolning to'g'ri javobini belgilang.",
      imageTooBig: "Rasm hajmi 5 MB dan oshmasligi kerak.",
      notImage: "Faqat rasm fayllarini yuklash mumkin.",
      uploadFailed: "Rasmni yuklab bo'lmadi.",
      saveFailed: "Blokni saqlab bo'lmadi.",
    },
    list: {
      title: "Yaratilgan bloklar",
      subtitle: "Bu yerda siz yaratgan ko'p savolli testlar ko'rinadi. Eskilarini yuklash uchun tugmani bosing.",
      justCreated: "Yangi",
      empty: "Hali blok yaratilmadi.",
      fetch: "Oldingi bloklarni yuklash",
      fetchMore: "Yana yuklash",
      noMore: "Barcha bloklar yuklandi.",
      loadFailed: "Bloklarni yuklab bo'lmadi.",
      deleted: "Blok o'chirildi.",
      deleteFailed: "O'chirib bo'lmadi.",
      confirmDelete: "Bu blok o'chirilsinmi?",
      edit: "Tahrirlash",
      correctedBy: "Tuzatgan:",
      correctIs: "To'g'ri javob:",
      imageOnly: "Faqat rasmli blok",
      count: "ta",
    },
  },
  en: {
    headerTitle: "Multi-question test",
    saveBtn: "Save Block",
    editTitle: "Edit Block",
    editBanner: "Editing an existing block:",
    updateBtn: "Save Changes",
    updated: "Block updated!",
    intro: {
      title: "Test type",
      desc: "One shared stem, several questions — stored as ONE document.",
      closed: "Multi-question closed test",
      closedDesc: "Several questions — all pick from one shared A–F option list (like 33–35).",
      open: "Multi-question open test",
      openDesc: "Several questions — each answered by typing (like problem 39).",
    },
    stem: { title: "Shared stem", desc: "The text and diagram every sub-question refers to.", label: "Stem text", placeholder: "e.g. A closed box shaped like a parallelepiped..." },
    image: { add: "Upload diagram/image", camera: "Camera", change: "Replace", remove: "Remove", hint: "PNG, JPG — up to 5 MB", uploading: "Uploading..." },
    backBanner: "You are building a paper — saving this block takes you back to it.",
    backNow: "Back to the paper",
    topic: { title: "Topic", desc: "Which topic the block belongs to.", subject: "Subject", topicLabel: "Topic", subtopic: "Subtopic", choose: "Choose..." },
    pool: { title: "Shared options", desc: "Printed once beside the block; every sub-question picks from it.", add: "Add option", placeholder: "Option text..." },
    parts: { title: "Questions", add: "Add question", label: "Label", prompt: "Question text", promptPlaceholder: "Write the question...", type: "Type", points: "Points", correct: "Correct answer", correctText: "Correct answer (text)", accepted: "Accepted alternatives (comma separated)", ownOptions: "Options", addOption: "Option" },
    types: { mcq: "Multiple choice", open: "Open answer", numeric: "Numeric" },
    extras: { title: "Extras", difficulty: "Difficulty", time: "Time (seconds)", tags: "Tags (comma separated)", hint: "Hint (optional)" },
    difficulties: { beginner: "Beginner", easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert", olympiad: "Olympiad" },
    savedAs: (n: number) => `Block saved — ${n} questions, 1 document.`,
    errors: {
      noStem: "Add the stem text or an image.",
      noTopic: "Pick a subject, topic and subtopic.",
      noParts: "Add at least one question.",
      noPartPrompt: "Every question needs its text.",
      noPool: "Add at least 2 options.",
      noPartAnswer: "Mark the correct answer for every question.",
      imageTooBig: "The image must be under 5 MB.",
      notImage: "Only image files can be uploaded.",
      uploadFailed: "Could not upload the image.",
      saveFailed: "Could not save the block.",
    },
    list: {
      title: "Blocks you created",
      subtitle: "The multi-question tests you built. Press the button to load the older ones.",
      justCreated: "New",
      empty: "No block created yet.",
      fetch: "Load previous blocks",
      fetchMore: "Load more",
      noMore: "All blocks loaded.",
      loadFailed: "Could not load the blocks.",
      deleted: "Block deleted.",
      deleteFailed: "Could not delete it.",
      confirmDelete: "Delete this block?",
      edit: "Edit",
      correctedBy: "Corrected by:",
      correctIs: "Correct answer:",
      imageOnly: "Image-only block",
      count: "blocks",
    },
  },
  ru: {
    headerTitle: "Тест с несколькими вопросами",
    saveBtn: "Сохранить блок",
    editTitle: "Редактировать блок",
    editBanner: "Редактируется существующий блок:",
    updateBtn: "Сохранить изменения",
    updated: "Блок обновлён!",
    intro: {
      title: "Тип теста",
      desc: "Одно общее условие, несколько вопросов — сохраняется как ОДИН документ.",
      closed: "Тест с несколькими вопросами (закрытый)",
      closedDesc: "Несколько вопросов — все выбирают из общего списка A–F (как 33–35).",
      open: "Тест с несколькими вопросами (открытый)",
      openDesc: "Несколько вопросов — на каждый пишется ответ (как задача 39).",
    },
    stem: { title: "Общее условие", desc: "Текст и чертёж, общие для всех вопросов.", label: "Текст условия", placeholder: "Например: Закрытая коробка в форме параллелепипеда..." },
    image: { add: "Загрузить чертёж", camera: "Камера", change: "Заменить", remove: "Удалить", hint: "PNG, JPG — до 5 МБ", uploading: "Загрузка..." },
    backBanner: "Вы составляете вариант — после сохранения блока вернётесь к нему.",
    backNow: "Вернуться к варианту",
    topic: { title: "Тема", desc: "К какой теме относится блок.", subject: "Предмет", topicLabel: "Тема", subtopic: "Подтема", choose: "Выберите..." },
    pool: { title: "Общие варианты", desc: "Печатается один раз рядом с блоком; все вопросы выбирают из него.", add: "Добавить вариант", placeholder: "Текст варианта..." },
    parts: { title: "Вопросы", add: "Добавить вопрос", label: "Метка", prompt: "Текст вопроса", promptPlaceholder: "Введите вопрос...", type: "Тип", points: "Баллы", correct: "Правильный ответ", correctText: "Правильный ответ (текст)", accepted: "Альтернативы (через запятую)", ownOptions: "Варианты", addOption: "Вариант" },
    types: { mcq: "С вариантами", open: "Открытый", numeric: "Числовой" },
    extras: { title: "Дополнительно", difficulty: "Сложность", time: "Время (сек.)", tags: "Теги (через запятую)", hint: "Подсказка" },
    difficulties: { beginner: "Начальный", easy: "Легкий", medium: "Средний", hard: "Сложный", expert: "Эксперт", olympiad: "Олимпиада" },
    savedAs: (n: number) => `Блок сохранён — ${n} вопрос(ов), 1 документ.`,
    errors: {
      noStem: "Введите условие или загрузите изображение.",
      noTopic: "Выберите предмет, тему и подтему.",
      noParts: "Добавьте хотя бы один вопрос.",
      noPartPrompt: "У каждого вопроса должен быть текст.",
      noPool: "Добавьте минимум 2 варианта.",
      noPartAnswer: "Отметьте правильный ответ для каждого вопроса.",
      imageTooBig: "Изображение должно быть меньше 5 МБ.",
      notImage: "Можно загружать только изображения.",
      uploadFailed: "Не удалось загрузить изображение.",
      saveFailed: "Не удалось сохранить блок.",
    },
    list: {
      title: "Созданные блоки",
      subtitle: "Здесь показаны созданные вами тесты с несколькими вопросами. Нажмите кнопку, чтобы загрузить прежние.",
      justCreated: "Новый",
      empty: "Блоков пока нет.",
      fetch: "Загрузить прежние блоки",
      fetchMore: "Загрузить ещё",
      noMore: "Все блоки загружены.",
      loadFailed: "Не удалось загрузить блоки.",
      deleted: "Блок удалён.",
      deleteFailed: "Не удалось удалить.",
      confirmDelete: "Удалить этот блок?",
      edit: "Редактировать",
      correctedBy: "Исправил:",
      correctIs: "Правильный ответ:",
      imageOnly: "Блок только с изображением",
      count: "шт.",
    },
  },
};

const EMPTY: Omit<BlockDraft, "parts" | "sharedOptions"> = {
  stemText: "",
  imageUrl: null,
  imageStoragePath: null,
  subjectId: "", subjectName: "",
  topicId: "", topicName: "",
  subtopicId: "", subtopicName: "",
  type: "multi_part",
  difficulty: "medium",
  status: "published",
  estimatedTime: 180,
  hint: "",
  tags: [],
  curriculum: [],
};

function BlockBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = T[lang] || T.uz;

  const [questionId, setQuestionId] = useState("");
  /** Set → editing an existing block, writing back to the SAME document. */
  const [editing, setEditing] = useState<NormalizedQuestion | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [tagsRaw, setTagsRaw] = useState("");
  const [sharedOptions, setSharedOptions] = useState<OptionDraft[]>(() => [emptyOption(), emptyOption(), emptyOption(), emptyOption()]);
  const [parts, setParts] = useState<PartDraft[]>(() => [newPart("a"), newPart("b")]);

  const [promptFile, setPromptFile] = useState<File | null>(null);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);

  const [creatorName, setCreatorName] = useState("");
  /** Blocks saved in THIS session — rendered from memory, zero reads. */
  const [sessionBlocks, setSessionBlocks] = useState<NormalizedQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => setQuestionId(newQuestionId()), []);

  /**
   * Where a PAPER BUILDER sent the teacher from, if one did — the same `?back=`
   * contract the single-question builder honours (see returnTo.ts).
   */
  const backTo = safeBackTo(searchParams.get("back"));

  const prefillSubject = searchParams.get("subject");
  useEffect(() => {
    if (!prefillSubject || !findSubject(prefillSubject)) return;
    setForm((p) => (p.subjectId ? p : { ...p, subjectId: prefillSubject }));
  }, [prefillSubject]);

  useEffect(() => {
    if (!user) return;
    if (user.displayName) return setCreatorName(user.displayName);
    getDoc(doc(db, "users", user.uid))
      .then((snap) => setCreatorName(snap.data()?.displayName || "Teacher"))
      .catch(() => setCreatorName("Teacher"));
  }, [user]);

  // Loading a stored block back into the form. `blockDraftFromQuestion` rebuilds
  // the parts and the shared pool — the single-question editor cannot do this,
  // which is why blocks route here.
  const loadForEdit = useCallback((q: NormalizedQuestion) => {
    const draft = blockDraftFromQuestion(q);
    setEditing(q);
    setQuestionId(q.id);
    setForm({
      stemText: draft.stemText,
      imageUrl: draft.imageUrl,
      imageStoragePath: draft.imageStoragePath,
      subjectId: draft.subjectId, subjectName: draft.subjectName,
      topicId: draft.topicId, topicName: draft.topicName,
      subtopicId: draft.subtopicId, subtopicName: draft.subtopicName,
      type: draft.type,
      difficulty: draft.difficulty,
      status: draft.status,
      estimatedTime: draft.estimatedTime,
      hint: draft.hint,
      tags: draft.tags,
      curriculum: draft.curriculum,
    });
    setSharedOptions(draft.sharedOptions);
    setParts(draft.parts);
    setPromptFile(null);
    setPromptPreview(draft.imageUrl);
    setTagsRaw(draft.tags.join(", "));
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // /teacher/create/block?edit=tq_xxx. The bank hands the question over in memory
  // (questionCache), so this normally costs ZERO Firestore reads — only a cold
  // deep link actually reads the doc.
  const editId = searchParams.get("edit");
  useEffect(() => {
    if (!editId || !user) return;
    fetchQuestionById(editId)
      .then((q) => {
        if (!q) return toast.error(t.errors.saveFailed);
        if (!q.isBlock) return router.replace(`/teacher/create/question?edit=${q.id}`);
        loadForEdit(q);
      })
      .catch(() => toast.error(t.errors.saveFailed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, user, loadForEdit, router]);

  const subject = findSubject(form.subjectId);
  const topic = findTopic(form.subjectId, form.topicId);
  const isShared = form.type === "shared_options";

  const revoke = (url: string | null) => url?.startsWith("blob:") && URL.revokeObjectURL(url);

  const updatePart = (key: string, fields: Partial<PartDraft>) =>
    setParts((prev) => prev.map((p) => (p.key === key ? { ...p, ...fields } : p)));

  const imageError = (k: "notImage" | "imageTooBig") => toast.error(t.errors[k]);

  const buildDraft = (image: { imageUrl: string | null; imageStoragePath: string | null }): BlockDraft => ({
    ...form,
    ...image,
    subjectName: subject?.name || "",
    topicName: topic?.name || "",
    subtopicName: topic?.subtopics.find((s) => s.id === form.subtopicId)?.name || "",
    sharedOptions,
    parts,
    tags: tagsRaw.split(",").map((s) => s.trim()).filter(Boolean),
  });

  const handleSave = async () => {
    if (!user || !questionId) return;

    const check = validateBlock(buildDraft({ imageUrl: promptFile ? "pending" : null, imageStoragePath: null }));
    if (!check.ok) return toast.error(t.errors[check.errorKey!]);

    setIsSaving(true);
    try {
      // On an EDIT, a diagram the teacher didn't touch is already uploaded — keep it.
      let image = editing
        ? { imageUrl: form.imageUrl, imageStoragePath: form.imageStoragePath }
        : { imageUrl: null as string | null, imageStoragePath: null as string | null };

      if (promptFile) {
        try {
          // ONE upload for the whole block — the diagram is shared by every part.
          image = await uploadQuestionImage(user.uid, questionId, "stem", promptFile, setUploadPercent);
        } catch {
          toast.error(t.errors.uploadFailed);
          return;
        }
      }

      // ONE document — however many sub-questions the block holds. Passing
      // `editing` preserves createdAt and stamps who corrected it.
      const saved = await saveBlock(buildDraft(image), questionId, user.uid, creatorName || "Teacher", "teacher_created", editing);

      // Show it in the list below straight from memory — no read-back after the write.
      const normalized = normalizeQuestion(saved);
      setSessionBlocks((prev) => [normalized, ...prev.filter((q) => q.id !== normalized.id)]);

      toast.success(editing ? t.updated : t.savedAs(parts.length));

      // Came from a paper builder → back to it, carrying the new block so the
      // paper picks it up with no read. Only a NEW block rides back: an edited
      // one is either already on the paper or was left off it on purpose.
      if (backTo) {
        cacheQuestion(normalized);
        router.push(editing ? backTo : backWithQuestion(backTo, normalized.id));
        return;
      }

      if (editing) router.push("/teacher/create/my_questions");
      setEditing(null);

      revoke(promptPreview);
      setForm((prev) => ({ ...EMPTY, subjectId: prev.subjectId, topicId: prev.topicId, subtopicId: prev.subtopicId, type: prev.type, difficulty: prev.difficulty }));
      setSharedOptions([emptyOption(), emptyOption(), emptyOption(), emptyOption()]);
      setParts([newPart("a"), newPart("b")]);
      setPromptFile(null);
      setPromptPreview(null);
      setTagsRaw("");
      setQuestionId(newQuestionId());
      setFormKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("block save failed:", err);
      toast.error(t.errors.saveFailed);
    } finally {
      setIsSaving(false);
      setUploadPercent(0);
    }
  };

  const imageLabels = { add: t.image.add, camera: t.image.camera, change: t.image.change, remove: t.image.remove, hint: t.image.hint };
  const filledPool = sharedOptions.filter((o) => o.text.trim() || o.imageUrl);
  const totalPoints = parts.reduce((sum, p) => sum + (p.points || 0), 0);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface pb-28 lg:pb-12">

      {/* HEADER */}
      <div className="t-page-bar sticky top-0 z-30 bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-md border-b border-outline-variant px-3 md:px-8 py-3 flex justify-between items-center shadow-elev-1">
        <div className="flex items-center gap-2 md:gap-3">
          <IconButton aria-label="Orqaga" size="sm" onClick={() => router.push(backTo ?? "/teacher/create")}>
            <ArrowLeft />
          </IconButton>
          <h1 className="text-[15px] md:text-[18px] font-bold text-on-surface tracking-tight flex items-center gap-2">
            <Blocks size={16} className="text-primary" /> {editing ? t.editTitle : t.headerTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] font-bold text-on-surface-variant">
            {parts.length} × {totalPoints} ball · 1 hujjat
          </span>
          <Button variant="filled" size="sm" icon={editing ? <Save /> : <CheckCircle2 />} loading={isSaving} onClick={handleSave}>
            <span className="hidden sm:inline">{editing ? t.updateBtn : t.saveBtn}</span>
          </Button>
        </div>
      </div>

      <main className="w-full max-w-[900px] mx-auto px-3 md:px-8 pt-5 md:pt-8 space-y-4 md:space-y-6">

        {/* Sent here by a paper builder — the paper is parked in localStorage and
            the way back is always one tap away, saved or not. */}
        {backTo && (
          <div className="rounded-m3-lg border border-tertiary bg-tertiary-container text-on-tertiary-container px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-bold flex items-center gap-2">
              <ArrowLeft size={15} className="shrink-0" />
              {t.backBanner}
            </p>
            <Button variant="text" size="sm" onClick={() => router.push(backTo)}>{t.backNow}</Button>
          </div>
        )}

        {editing && (
          <div className="rounded-m3-lg border border-primary bg-primary-container text-on-primary-container px-4 py-3 flex items-center gap-2">
            <Save size={15} className="shrink-0" />
            <p className="text-[13px] font-bold">{t.editBanner} <span className="font-mono opacity-80">{editing.id}</span></p>
          </div>
        )}

        {/* --- 1. BLOCK TYPE --- */}
        <Card variant="elevated" className="p-4 md:p-6">
          <SectionTitle icon={<Blocks size={16} />} title={t.intro.title} desc={t.intro.desc} />

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { key: "shared_options" as BlockType, label: t.intro.closed, desc: t.intro.closedDesc },
              { key: "multi_part" as BlockType, label: t.intro.open, desc: t.intro.openDesc },
            ]).map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setForm((p) => ({ ...p, type: b.key }))}
                className={cn(
                  "m3-interactive text-left p-3.5 rounded-m3-lg border transition-colors",
                  form.type === b.key
                    ? "border-primary bg-primary-container text-on-primary-container shadow-elev-1"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-state-hover",
                )}
              >
                <span className="block text-[13px] font-extrabold">{b.label}</span>
                <span className="block text-[11px] font-medium opacity-80 mt-0.5">{b.desc}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* --- 2. SHARED STEM + DIAGRAM --- */}
        <Card variant="elevated" className="p-4 md:p-6">
          <SectionTitle icon={<Layers size={16} />} title={t.stem.title} desc={t.stem.desc} />

          <div className="mt-4">
            <RichQuestionInput
              key={`stem-${formKey}`}
              label={t.stem.label}
              value={form.stemText}
              onChange={(latex) => setForm((p) => ({ ...p, stemText: latex }))}
              placeholder={t.stem.placeholder}
            />
          </div>

          <div className="mt-4">
            <ImagePicker
              previewUrl={promptPreview}
              onPick={(f) => { revoke(promptPreview); setPromptFile(f); setPromptPreview(URL.createObjectURL(f)); }}
              onClear={() => { revoke(promptPreview); setPromptFile(null); setPromptPreview(null); }}
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

        {/* --- 3. TOPIC --- */}
        <Card variant="elevated" className="p-4 md:p-6">
          <SectionTitle icon={<FolderTree size={16} />} title={t.topic.title} desc={t.topic.desc} />

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label={t.topic.subject} value={form.subjectId} onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value, topicId: "", subtopicId: "" }))}>
              <option value="">{t.topic.choose}</option>
              {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select label={t.topic.topicLabel} value={form.topicId} disabled={!subject} onChange={(e) => setForm((p) => ({ ...p, topicId: e.target.value, subtopicId: "" }))}>
              <option value="">{t.topic.choose}</option>
              {(subject?.topics || []).map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
            </Select>
            <Select label={t.topic.subtopic} value={form.subtopicId} disabled={!topic} onChange={(e) => setForm((p) => ({ ...p, subtopicId: e.target.value }))}>
              <option value="">{t.topic.choose}</option>
              {(topic?.subtopics || []).map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </Select>
          </div>
        </Card>

        {/* --- 4. SHARED OPTION POOL (stored ONCE for the whole block) --- */}
        {isShared && (
          <Card variant="elevated" className="p-4 md:p-6">
            <SectionTitle icon={<ListChecks size={16} />} title={t.pool.title} desc={t.pool.desc} />

            <div className="mt-4 space-y-2.5">
              {sharedOptions.map((opt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-7 h-7 shrink-0 mt-1.5 rounded-m3-sm bg-primary-container text-on-primary-container border border-outline-variant flex items-center justify-center text-[11px] font-black">
                    {OPTION_LETTERS[i]}
                  </div>
                  <div className="flex-1">
                    <RichQuestionInput
                      key={`${formKey}-pool-${i}`}
                      label=""
                      value={opt.text}
                      onChange={(latex) => setSharedOptions((prev) => prev.map((o, x) => (x === i ? { ...o, text: latex } : o)))}
                      placeholder={t.pool.placeholder}
                      compact
                    />
                  </div>
                  <IconButton
                    aria-label={t.image.remove}
                    size="sm"
                    className="mt-1.5"
                    disabled={sharedOptions.length <= 2}
                    onClick={() => setSharedOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, x) => x !== i)))}
                  >
                    <X />
                  </IconButton>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <Button
                variant="tonal"
                size="sm"
                icon={<Plus />}
                disabled={sharedOptions.length >= MAX_POOL}
                onClick={() => setSharedOptions((prev) => (prev.length >= MAX_POOL ? prev : [...prev, emptyOption()]))}
              >
                {t.pool.add}
              </Button>
            </div>
          </Card>
        )}

        {/* --- 5. THE SUB-QUESTIONS --- */}
        <Card variant="elevated" className="p-4 md:p-6">
          <SectionTitle icon={<ListChecks size={16} />} title={t.parts.title} />

          <div className="mt-4 space-y-4">
            {parts.map((part) => {
              const usesOptions = partUsesOptions(form.type, part);
              const optionSource = isShared ? filledPool : part.options;

              return (
                <div key={part.key} className="rounded-m3-lg border border-outline-variant p-3 md:p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <TextField
                      label={t.parts.label}
                      value={part.label}
                      onChange={(e) => updatePart(part.key, { label: e.target.value })}
                      className="w-[90px]"
                    />
                    {/* Closed test → parts pick from the shared pool (no per-part type).
                        Open test → every part is a TYPED answer; the only choice is
                        text vs. numeric. A part is never "closed" inside an open test. */}
                    {!isShared && (
                      <Select
                        label={t.parts.type}
                        value={part.type === "mcq" ? "open" : part.type}
                        onChange={(e) => updatePart(part.key, { type: e.target.value as PartType })}
                        className="w-[150px]"
                      >
                        <option value="open">{t.types.open}</option>
                        <option value="numeric">{t.types.numeric}</option>
                      </Select>
                    )}
                    <TextField
                      label={t.parts.points}
                      type="number"
                      min={0}
                      value={part.points}
                      onChange={(e) => updatePart(part.key, { points: Number(e.target.value) || 0 })}
                      className="w-[90px]"
                    />
                    <div className="ml-auto">
                      <IconButton
                        aria-label={t.image.remove}
                        size="sm"
                        disabled={parts.length <= 1}
                        onClick={() => setParts((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.key !== part.key)))}
                      >
                        <X />
                      </IconButton>
                    </div>
                  </div>

                  <RichQuestionInput
                    key={`${formKey}-prompt-${part.key}`}
                    label={t.parts.prompt}
                    value={part.prompt}
                    onChange={(latex) => updatePart(part.key, { prompt: latex })}
                    placeholder={t.parts.promptPlaceholder}
                    compact
                  />

                  {/* multi_part + mcq → the part carries its OWN options */}
                  {usesOptions && !isShared && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">{t.parts.ownOptions}</p>
                      {part.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updatePart(part.key, { correctIndex: oi })}
                            className={cn(
                              "w-7 h-7 shrink-0 rounded-m3-sm border flex items-center justify-center text-[11px] font-black transition-colors",
                              part.correctIndex === oi
                                ? "border-primary bg-primary text-on-primary"
                                : "border-outline-variant bg-surface-container text-on-surface-variant hover:border-primary",
                            )}
                            title={t.parts.correct}
                          >
                            {OPTION_LETTERS[oi]}
                          </button>
                          <TextField
                            label={`${t.parts.addOption} ${OPTION_LETTERS[oi]}`}
                            value={opt.text}
                            onChange={(e) =>
                              updatePart(part.key, { options: part.options.map((o, x) => (x === oi ? { ...o, text: e.target.value } : o)) })
                            }
                            className="flex-1"
                          />
                          <IconButton
                            aria-label={t.image.remove}
                            size="sm"
                            disabled={part.options.length <= 2}
                            onClick={() =>
                              updatePart(part.key, {
                                options: part.options.filter((_, x) => x !== oi),
                                correctIndex: Math.min(part.correctIndex, part.options.length - 2),
                              })
                            }
                          >
                            <X />
                          </IconButton>
                        </div>
                      ))}
                      <Button
                        variant="text"
                        size="sm"
                        icon={<Plus />}
                        disabled={part.options.length >= MAX_POOL}
                        onClick={() => updatePart(part.key, { options: [...part.options, emptyOption()] })}
                      >
                        {t.parts.addOption}
                      </Button>
                    </div>
                  )}

                  {/* shared_options → pick the correct letter from the ONE pool */}
                  {usesOptions && isShared && (
                    <div className="mt-3">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">{t.parts.correct}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {optionSource.length === 0 && (
                          <p className="text-[12px] text-error font-bold">{t.errors.noPool}</p>
                        )}
                        {optionSource.map((opt, oi) => (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => updatePart(part.key, { correctIndex: oi })}
                            className={cn(
                              "m3-interactive px-2.5 py-1.5 rounded-m3-sm border text-[12px] font-bold transition-colors max-w-[180px] truncate",
                              part.correctIndex === oi
                                ? "border-primary bg-primary text-on-primary"
                                : "border-outline-variant bg-surface-container text-on-surface-variant hover:border-primary",
                            )}
                          >
                            {OPTION_LETTERS[oi]}) {opt.text || "—"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* open / numeric → a typed answer */}
                  {!usesOptions && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField
                        label={t.parts.correctText}
                        value={part.correctText}
                        onChange={(e) => updatePart(part.key, { correctText: e.target.value })}
                      />
                      <TextField
                        label={t.parts.accepted}
                        value={part.acceptedAnswers.join(", ")}
                        onChange={(e) => updatePart(part.key, { acceptedAnswers: e.target.value.split(",").map((a) => a.trim()).filter(Boolean) })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              variant="tonal"
              size="sm"
              icon={<Plus />}
              disabled={parts.length >= MAX_PARTS}
              onClick={() =>
                setParts((prev) => (prev.length >= MAX_PARTS ? prev : [...prev, newPart(LETTER_LABELS[prev.length] || String(prev.length + 1))]))
              }
            >
              {t.parts.add}
            </Button>
          </div>
        </Card>

        {/* --- 6. EXTRAS --- */}
        <Card variant="elevated" className="p-4 md:p-6">
          <SectionTitle icon={<Lightbulb size={16} />} title={t.extras.title} />

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Select
              label={t.extras.difficulty}
              value={form.difficulty}
              onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value as DifficultyName }))}
            >
              {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t.difficulties[d]}</option>)}
            </Select>
            <TextField
              label={t.extras.time}
              type="number"
              min={0}
              value={form.estimatedTime}
              onChange={(e) => setForm((p) => ({ ...p, estimatedTime: Number(e.target.value) || 0 }))}
            />
            <TextField label={t.extras.tags} value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
          </div>

          <div className="mt-4">
            <RichQuestionInput
              key={`hint-${formKey}`}
              label={t.extras.hint}
              value={form.hint}
              onChange={(latex) => setForm((p) => ({ ...p, hint: latex }))}
              compact
            />
          </div>
        </Card>

        {/* --- 7. BLOCKS THIS TEACHER ALREADY CREATED --- */}
        {user && (
          <CreatedQuestionsList
            creatorId={user.uid}
            sessionQuestions={sessionBlocks}
            onEdit={loadForEdit}
            onDeleted={(id) => setSessionBlocks((prev) => prev.filter((q) => q.id !== id))}
            labels={t.list}
            // Single questions live in create/question — this builder only edits blocks.
            filter={(q) => q.isBlock}
          />
        )}
      </main>

      {/* MOBILE SAVE BAR */}
      <div className="lg:hidden fixed bottom-4 left-0 right-0 px-3 z-40">
        <Button variant="filled" size="lg" className="w-full shadow-elev-3" icon={<CheckCircle2 />} loading={isSaving} onClick={handleSave}>
          {editing ? t.updateBtn : t.saveBtn}
        </Button>
      </div>
    </div>
  );
}

/** useSearchParams() (the ?edit=… deep link) must sit under a Suspense boundary. */
export default function CreateBlockPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-surface" />}>
      <BlockBuilder />
    </Suspense>
  );
}

function SectionTitle({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 shrink-0 rounded-m3-sm bg-primary-container text-on-primary-container flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h2 className="text-[15px] md:text-[17px] font-extrabold text-on-surface leading-tight">{title}</h2>
        {desc && <p className="text-[12px] text-on-surface-variant font-medium mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}
