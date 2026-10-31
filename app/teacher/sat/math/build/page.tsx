"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, HelpCircle, KeyRound,
  Save, Send, Trash2, Wand2,
} from "lucide-react";
import toast from "react-hot-toast";

import { useTeacherLanguage } from "@/app/teacher/layout";
import { useAuth } from "@/lib/AuthContext";
import LatexRenderer from "@/components/LatexRenderer";
import {
  SAT_MATH_DOMAINS, SAT_MATH_TAXONOMY_SLUG, SAT_MAX_BYTES,
  checkSatAdd, defaultSatRoutingThreshold, satByteSize, satItemPreview, satPickedIds, satQuizItem,
} from "@/lib/SatMathQuiz";
import { loadSatSamplePaper } from "@/lib/SatDefaultPaper";
import { fetchQuestionById } from "@/services/questionBankService";
import { questionBuilderHref } from "@/app/teacher/create/_components/returnTo";
import {
  getSatMathTest, newSatTestId, reserveSatCode, saveSatMathTest, setSatTestStatus,
} from "@/services/satMathQuizService";
import SatBankPicker, { type SatPickerStrings } from "../_components/SatBankPicker";
import { clearSatMathDraft, readSatMathDraft, writeSatMathDraft } from "../_components/draft";
import {
  Banner, Button, Card, IconButton, PageHeader, PillGroup, Spinner, Switch,
  TextField, cn,
} from "@/components/ui";
import type { SatMathTestStatus, SatQuizItem } from "@/types/SatQuiz";
import type { Lang } from "@/types/Math";

/**
 * Builds one adaptive SAT Math test: Module 1 (fixed) + two Module 2 pools
 * (Easier / Harder). The whole draft lives in component state and is written
 * as ONE document when the teacher saves. Contract: docs/SAT_QUIZ.md.
 *
 * ⚠️ No blueprint quota, no cohort marking — a teacher builds each module to
 * whatever length they like; publishing only requires all three non-empty.
 */

type ModuleKey = "module1" | "module2Easier" | "module2Harder";
const MODULE_KEYS: ModuleKey[] = ["module1", "module2Easier", "module2Harder"];

/** `{n}` / `{problem}` … in a dictionary string, filled at the call site. */
const fmt = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));

const TR: Record<string, Record<string, string>> = {
  uz: {
    back: "Orqaga",
    newTitle: "Yangi SAT Matematika testi",
    editTitle: "Testni tahrirlash",
    subtitle: "Modul 1 barcha o'quvchilar uchun bir xil; Modul 2 natijaga qarab tanlanadi.",
    fillDefault: "Namunaviy variant",
    fillDefaultHint: "Barcha uchala modulga tayyor namuna savollar qo'yiladi — keyin o'chirish, tartibini o'zgartirish va o'zingiznikini qo'shish mumkin.",
    defaultConfirm: "Modullardagi savollar namunaviy savollar bilan almashtiriladi. Davom etasizmi?",
    defaultLoaded: "Namunaviy variant yuklandi — {n} ta savol",
    defaultBroken: "Namunaviy variant noto'g'ri: {problem}",
    defaultFailed: "Namunaviy variantni yuklab bo'lmadi",
    name: "Test nomi",
    namePlaceholder: "Masalan: SAT Matematika — 1-amaliyot",
    description: "Tavsif (ixtiyoriy)",
    module1Minutes: "Modul 1 vaqti (daqiqa)",
    module2Minutes: "Modul 2 vaqti (daqiqa)",
    threshold: "Qiyin modul uchun to'g'ri javoblar",
    flowIf: "≥ {n} to'g'ri",
    flowElse: "aks holda",
    sizeWarn: "Test hajmi chegaraga yaqin: {used} / {max} KB",
    thresholdHint: "Modul 1'da shuncha yoki ko'proq to'g'ri javob — Qiyin Modul 2'ga yo'naltiradi; kamroq bo'lsa — Oson Modul 2'ga.",
    shuffle: "Savollarni aralashtirish",
    shuffleHint: "Har bir o'quvchi savollarni boshqa tartibda ko'radi.",
    showAnswers: "Javoblarni ko'rsatish",
    showAnswersHint: "Yakunlangandan so'ng to'g'ri javoblar va izohlar ko'rinadi.",
    code: "Kirish kodi",
    codePending: "Saqlaganda beriladi",
    progress: "Savollar",
    size: "hajmi",
    domains: "Fan bo'limlari bo'yicha (barcha modullar)",
    domainsEmpty: "Savol qo'shilgach, bo'limlar bo'yicha taqsimot shu yerda ko'rinadi.",
    module1Tab: "Modul 1",
    module2EasierTab: "Modul 2 — Oson",
    module2HarderTab: "Modul 2 — Qiyin",
    addTitle: "Savol qo'shish",
    addHint: "Faqat o'zingiz yozgan SAT Matematika savollari (variantli yoki sonli javob) ko'rinadi.",
    newSingle: "Yangi savol yaratish",
    newSingleHint: "Variantli (4 ta javob) yoki sonli javob; rasm ham qo'shsa bo'ladi.",
    source: "Kim yozgan", srcAll: "Hammasi", srcAi: "AI", srcMine: "O'zim",
    bank: "Baza", bankMine: "Mening bazam", bankShared: "Ulashilgan", by: "·",
    load: "Yuklash", loadMore: "Yana 10 ta", none: "Savol topilmadi",
    reads: "ta hujjat o'qildi",
    add: "Qo'shish", added: "Qo'shilgan", imageOnly: "Rasmli savol", full: "To'ldi",
    aiBadge: "AI", mcqBadge: "Variantli", numericBadge: "Sonli",
    draftKept: "Testingiz saqlab qo'yildi — savol yaratib qaytsangiz yo'qolmaydi.",
    addedBack: "Yangi savol modulga qo'shildi.",
    addBackMissing: "Yangi savolni topib bo'lmadi — quyidagi «Yuklash» orqali qo'shing.",
    addBackSubject: "Bu savol SAT Matematika bo'limiga tegishli emas — qo'shilmadi.",
    discardDraft: "Tozalash",
    thisModule: "Bu modul",
    emptyModule: "Hali savol qo'shilmagan.",
    remove: "Olib tashlash", up: "Yuqoriga", down: "Pastga",
    save: "Saqlash",
    saveAndPublish: "Saqlash va faollashtirish",
    saved: "Saqlandi",
    published: "Test faollashtirildi",
    saveFailed: "Saqlab bo'lmadi",
    tooLarge: "Test juda katta — bir nechta savolni olib tashlang.",
    needTitle: "Test nomini kiriting",
    needAllModules: "Faollashtirish uchun har uchala modulda kamida bitta savol bo'lishi kerak.",
    dupe: "Bu savol allaqachon qo'shilgan.",
    unsupported: "Bu savol turi SAT Matematika uchun mos emas (faqat variantli yoki sonli).",
    loadFailed: "Testni yuklab bo'lmadi",
  },
  ru: {
    back: "Назад",
    newTitle: "Новый тест SAT Математика",
    editTitle: "Редактирование теста",
    subtitle: "Модуль 1 одинаков для всех; Модуль 2 выбирается по результату.",
    fillDefault: "Образцовый вариант",
    fillDefaultHint: "Готовые вопросы для всех трёх модулей — после загрузки их можно удалять, менять местами и добавлять свои.",
    defaultConfirm: "Вопросы модулей будут заменены образцовыми. Продолжить?",
    defaultLoaded: "Образцовый вариант загружен — {n} вопросов",
    defaultBroken: "Образцовый вариант некорректен: {problem}",
    defaultFailed: "Не удалось загрузить образцовый вариант",
    name: "Название теста",
    namePlaceholder: "Например: SAT Математика — практика 1",
    description: "Описание (необязательно)",
    module1Minutes: "Время Модуля 1 (минут)",
    module2Minutes: "Время Модуля 2 (минут)",
    threshold: "Верных для Трудного модуля",
    flowIf: "≥ {n} верных",
    flowElse: "иначе",
    sizeWarn: "Тест почти достиг предела размера: {used} / {max} KB",
    thresholdHint: "Столько или больше верных в Модуле 1 — направляет в Трудный Модуль 2; меньше — в Лёгкий.",
    shuffle: "Перемешивать вопросы",
    shuffleHint: "Каждый ученик увидит вопросы в своём порядке.",
    showAnswers: "Показывать ответы",
    showAnswersHint: "После завершения видны правильные ответы и объяснения.",
    code: "Код доступа",
    codePending: "Будет выдан при сохранении",
    progress: "Вопросы",
    size: "размер",
    domains: "По разделам (все модули)",
    domainsEmpty: "Как только добавите вопросы, здесь появится распределение по разделам.",
    module1Tab: "Модуль 1",
    module2EasierTab: "Модуль 2 — Лёгкий",
    module2HarderTab: "Модуль 2 — Трудный",
    addTitle: "Добавить вопрос",
    addHint: "Показываются только ваши вопросы SAT Математика (с вариантами или числовым ответом).",
    newSingle: "Создать новый вопрос",
    newSingleHint: "С вариантами (4 ответа) или числовой ответ; можно с картинкой.",
    source: "Кто написал", srcAll: "Все", srcAi: "ИИ", srcMine: "Я сам",
    bank: "База", bankMine: "Моя база", bankShared: "Общие", by: "·",
    load: "Загрузить", loadMore: "Ещё 10", none: "Вопросы не найдены",
    reads: "документов прочитано",
    add: "Добавить", added: "Добавлен", imageOnly: "Вопрос с картинкой", full: "Заполнено",
    aiBadge: "ИИ", mcqBadge: "С вариантами", numericBadge: "Числовой",
    draftKept: "Ваш тест сохранён — он не потеряется, пока вы создаёте вопрос.",
    addedBack: "Новый вопрос добавлен в модуль.",
    addBackMissing: "Не удалось найти новый вопрос — добавьте его кнопкой «Загрузить» ниже.",
    addBackSubject: "Этот вопрос не относится к SAT Математика — он не добавлен.",
    discardDraft: "Очистить",
    thisModule: "Этот модуль",
    emptyModule: "Вопросы ещё не добавлены.",
    remove: "Убрать", up: "Вверх", down: "Вниз",
    save: "Сохранить",
    saveAndPublish: "Сохранить и активировать",
    saved: "Сохранено",
    published: "Тест активирован",
    saveFailed: "Не удалось сохранить",
    tooLarge: "Тест слишком большой — уберите несколько вопросов.",
    needTitle: "Введите название теста",
    needAllModules: "Для активации в каждом из трёх модулей должен быть хотя бы один вопрос.",
    dupe: "Этот вопрос уже добавлен.",
    unsupported: "Этот тип вопроса не подходит для SAT Математика (только с вариантами или числовой).",
    loadFailed: "Не удалось загрузить тест",
  },
  en: {
    back: "Back",
    newTitle: "New SAT Math test",
    editTitle: "Edit test",
    subtitle: "Module 1 is the same for everyone; Module 2 is chosen from the result.",
    fillDefault: "Sample test",
    fillDefaultHint: "Ready-made questions for all three modules — once loaded you can remove, reorder and add your own.",
    defaultConfirm: "The questions on the modules will be replaced by the sample ones. Continue?",
    defaultLoaded: "Sample test loaded — {n} questions",
    defaultBroken: "The sample test is invalid: {problem}",
    defaultFailed: "Could not load the sample test",
    name: "Test name",
    namePlaceholder: "e.g. SAT Math — Practice 1",
    description: "Description (optional)",
    module1Minutes: "Module 1 time (minutes)",
    module2Minutes: "Module 2 time (minutes)",
    threshold: "Correct answers for Harder",
    flowIf: "≥ {n} correct",
    flowElse: "otherwise",
    sizeWarn: "The test is close to its size limit: {used} / {max} KB",
    thresholdHint: "This many (or more) correct in Module 1 routes to the Harder Module 2; fewer routes to the Easier one.",
    shuffle: "Shuffle questions",
    shuffleHint: "Each student sees the questions in their own order.",
    showAnswers: "Show answers",
    showAnswersHint: "Correct answers and explanations are revealed after submitting.",
    code: "Access code",
    codePending: "Issued when you save",
    progress: "Questions",
    size: "size",
    domains: "By domain (all modules)",
    domainsEmpty: "Once you add questions, their spread across domains shows up here.",
    module1Tab: "Module 1",
    module2EasierTab: "Module 2 — Easier",
    module2HarderTab: "Module 2 — Harder",
    addTitle: "Add a question",
    addHint: "Only your own SAT Math questions (multiple choice or numeric) are listed.",
    newSingle: "Create a new question",
    newSingleHint: "Multiple choice (4 options) or a numeric answer; an image if you want one.",
    source: "Written by", srcAll: "All", srcAi: "AI", srcMine: "Me",
    bank: "Bank", bankMine: "My bank", bankShared: "Shared", by: "·",
    load: "Load", loadMore: "10 more", none: "No questions found",
    reads: "documents read",
    add: "Add", added: "Added", imageOnly: "Image question", full: "Full",
    aiBadge: "AI", mcqBadge: "Multiple choice", numericBadge: "Numeric",
    draftKept: "Your test is saved — it survives going off to write a question.",
    addedBack: "Your new question was added to the module.",
    addBackMissing: "Could not find the new question — add it with “Load” below.",
    addBackSubject: "That question isn't a SAT Math question — it was not added.",
    discardDraft: "Start over",
    thisModule: "This module",
    emptyModule: "No questions added yet.",
    remove: "Remove", up: "Up", down: "Down",
    save: "Save",
    saveAndPublish: "Save & publish",
    saved: "Saved",
    published: "The test is live",
    saveFailed: "Could not save",
    tooLarge: "The test is too large — remove a few questions.",
    needTitle: "Give the test a name",
    needAllModules: "Publishing needs at least one question in each of the three modules.",
    dupe: "That question is already added.",
    unsupported: "That question type doesn't fit SAT Math (multiple choice or numeric only).",
    loadFailed: "Could not load the test",
  },
};

function BuilderInner() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = TR[lang] || TR.uz;
  const L = (lang === "ru" || lang === "en" ? lang : "uz") as Lang;

  const base = "/teacher/sat/math";

  const [testId, setTestId] = useState(() => editId || newSatTestId());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [module1Minutes, setModule1Minutes] = useState(35);
  const [module2Minutes, setModule2Minutes] = useState(35);
  const [routingThreshold, setRoutingThreshold] = useState(11);
  const [shuffle, setShuffle] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [status, setStatus] = useState<SatMathTestStatus>("draft");

  const [modules, setModules] = useState<Record<ModuleKey, SatQuizItem[]>>({
    module1: [], module2Easier: [], module2Harder: [],
  });
  const [activeTab, setActiveTab] = useState<ModuleKey>("module1");

  const [loading, setLoading] = useState(!!editId);
  /** ⚠️ The auto-add below MUST wait for this, or it checks against an empty
   *  test and stashes a draft that has lost every question on it. */
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);
  const [thresholdTouched, setThresholdTouched] = useState(false);
  const [filling, setFilling] = useState(false);

  const backHere = (module: ModuleKey) =>
    `${base}/build${editId ? `?id=${editId}&module=${module}` : `?module=${module}`}`;

  // ── load: the local draft first, then the server copy ───────────────────
  useEffect(() => {
    const draft = readSatMathDraft();
    const mine = draft && (editId ? draft.testId === editId : true);

    if (draft && mine) {
      // ⚠️ ADOPT the draft's id — see the Milliy sertifikat builder's comment
      // on the same trap: a fresh id minted on mount would fork a saved test
      // into a second document the moment the teacher came back.
      setTestId(draft.testId);
      setTitle(draft.title);
      setDescription(draft.description);
      setModule1Minutes(draft.module1Minutes);
      setModule2Minutes(draft.module2Minutes);
      setRoutingThreshold(draft.routingThreshold);
      setShuffle(draft.shuffle);
      setShowAnswers(draft.showAnswers);
      setAccessCode(draft.accessCode);
      setStatus(draft.status);
      setModules({ module1: draft.module1, module2Easier: draft.module2Easier, module2Harder: draft.module2Harder });
      setThresholdTouched(true);
      setRestored(true);
      setLoading(false);
      setHydrated(true);
      return;
    }

    if (!editId) { setHydrated(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const test = await getSatMathTest(editId);
        if (cancelled || !test) {
          if (!cancelled) setLoadError(t.loadFailed);
          return;
        }
        setTitle(test.title);
        setDescription(test.description || "");
        setModule1Minutes(test.module1Minutes || 35);
        setModule2Minutes(test.module2Minutes || 35);
        setRoutingThreshold(test.routingThreshold || defaultSatRoutingThreshold(test.module1.length));
        setThresholdTouched(true);
        setShuffle(test.shuffle);
        setShowAnswers(test.showAnswers);
        setAccessCode(test.accessCode);
        setStatus(test.status);
        setModules({ module1: test.module1, module2Easier: test.module2Easier, module2Harder: test.module2Harder });
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoadError(t.loadFailed);
      } finally {
        if (!cancelled) { setLoading(false); setHydrated(true); }
      }
    })();
    return () => { cancelled = true; };
    // Runs once per test: re-running would stomp on whatever the teacher has
    // since picked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // A teacher who never touches the threshold gets the sensible default,
  // tracking Module 1's own length as it grows.
  useEffect(() => {
    if (!thresholdTouched) setRoutingThreshold(defaultSatRoutingThreshold(modules.module1.length));
  }, [modules.module1.length, thresholdTouched]);

  // ── derived ────────────────────────────────────────────────────────────
  const bytes = useMemo(
    () => satByteSize(modules.module1, modules.module2Easier, modules.module2Harder),
    [modules],
  );
  const complete = modules.module1.length > 0 && modules.module2Easier.length > 0 && modules.module2Harder.length > 0;

  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const key of MODULE_KEYS) {
      for (const q of modules[key]) counts[q.domain] = (counts[q.domain] ?? 0) + 1;
    }
    return counts;
  }, [modules]);

  const addItem = useCallback((module: ModuleKey, item: SatQuizItem): SatQuizItem | null => {
    const check = checkSatAdd(modules[module], item);
    if (!check.ok) {
      if (check.reason === "duplicate") toast.error(t.dupe);
      else toast.error(t.unsupported);
      return null;
    }
    setModules((prev) => (
      prev[module].some((q) => q.id === item.id) ? prev : { ...prev, [module]: [...prev[module], item] }
    ));
    return item;
  }, [modules, t]);

  const removeItem = (module: ModuleKey, id: string) =>
    setModules((prev) => ({ ...prev, [module]: prev[module].filter((q) => q.id !== id) }));

  const move = (module: ModuleKey, index: number, delta: number) =>
    setModules((prev) => {
      const list = prev[module];
      const to = index + delta;
      if (to < 0 || to >= list.length) return prev;
      const next = [...list];
      [next[index], next[to]] = [next[to], next[index]];
      return { ...prev, [module]: next };
    });

  /**
   * Drop the bundled sample test (`data/sat-math-default-paper.json`) onto all
   * three modules at once.
   *
   * It REPLACES every module rather than topping it up — appending would leave
   * the teacher to work out which of a mixed set were theirs. Once loaded the
   * items are ordinary quiz items: remove, reorder and mix in your own exactly
   * as with a hand-picked one.
   *
   * ⚠️ The file is checked before anything is set (`buildSatSamplePaper`), and
   * a fault ABORTS with the first problem named — a silently-wrong sample
   * would publish a test with items the results page cannot group.
   */
  const fillDefault = async () => {
    const hasAny = modules.module1.length > 0 || modules.module2Easier.length > 0 || modules.module2Harder.length > 0;
    if (hasAny && !confirm(t.defaultConfirm)) return;
    setFilling(true);
    try {
      const paper = await loadSatSamplePaper();
      if (paper.problems.length > 0) {
        console.error("data/sat-math-default-paper.json:", paper.problems);
        toast.error(fmt(t.defaultBroken, { problem: paper.problems[0] }));
        return;
      }
      setModules({ module1: paper.module1, module2Easier: paper.module2Easier, module2Harder: paper.module2Harder });
      // The name is the teacher's to choose — only fill one in if they have not.
      if (!title.trim()) setTitle(paper.title[L] || paper.title.uz);
      setModule1Minutes(paper.module1Minutes);
      setModule2Minutes(paper.module2Minutes);
      setThresholdTouched(true);
      setRoutingThreshold(paper.routingThreshold);
      const n = paper.module1.length + paper.module2Easier.length + paper.module2Harder.length;
      toast.success(fmt(t.defaultLoaded, { n }));
    } catch (err) {
      console.error(err);
      toast.error(t.defaultFailed);
    } finally {
      setFilling(false);
    }
  };

  /** Park the test before leaving for a question builder. */
  const stashModules = useCallback((next: Record<ModuleKey, SatQuizItem[]>) => {
    writeSatMathDraft({
      testId, title, description, module1Minutes, module2Minutes, routingThreshold,
      shuffle, showAnswers, accessCode, status,
      module1: next.module1, module2Easier: next.module2Easier, module2Harder: next.module2Harder,
    });
  }, [testId, title, description, module1Minutes, module2Minutes, routingThreshold, shuffle, showAnswers, accessCode, status]);

  const stash = () => stashModules(modules);

  /**
   * The return trip from the question builder (`?add=<questionId>&module=<key>`).
   * ⚠️ Waits for `hydrated` — see the Milliy sertifikat builder for why.
   */
  const addBackId = params.get("add");
  const addBackModule = (params.get("module") as ModuleKey | null) ?? "module1";
  const addBackRef = useRef(false);
  useEffect(() => {
    if (!addBackId || !hydrated || addBackRef.current) return;
    addBackRef.current = true;

    (async () => {
      try {
        const question = await fetchQuestionById(addBackId);
        if (!question) { toast.error(t.addBackMissing); return; }
        if (question.subjectId !== SAT_MATH_TAXONOMY_SLUG) {
          toast.error(t.addBackSubject);
          return;
        }
        const item = satQuizItem(question);
        const added = item && addItem(addBackModule, item);
        if (!added) { if (!item) toast.error(t.unsupported); return; }
        stashModules({ ...modules, [addBackModule]: [...modules[addBackModule], added] });
        setActiveTab(addBackModule);
        toast.success(t.addedBack);
      } catch (err) {
        console.error(err);
        toast.error(t.addBackMissing);
      } finally {
        router.replace(editId ? `${base}/build?id=${editId}` : `${base}/build`);
      }
    })();
    // Runs once per return trip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addBackId, hydrated]);

  const discard = () => {
    clearSatMathDraft();
    setTitle("");
    setDescription("");
    setModule1Minutes(35);
    setModule2Minutes(35);
    setThresholdTouched(false);
    setShuffle(true);
    setShowAnswers(true);
    setAccessCode("");
    setStatus("draft");
    setModules({ module1: [], module2Easier: [], module2Harder: [] });
    setRestored(false);
  };

  async function persist(publish: boolean) {
    if (!user) return;
    if (!title.trim()) { toast.error(t.needTitle); return; }
    if (publish && !complete) { toast.error(t.needAllModules); return; }
    if (bytes > SAT_MAX_BYTES) { toast.error(t.tooLarge); return; }

    setSaving(true);
    try {
      // ⚠️ Minted on the FIRST save and never regenerated.
      const code = accessCode || await reserveSatCode();
      const nextStatus: SatMathTestStatus = publish ? "published" : status;

      await saveSatMathTest(testId, {
        title: title.trim(),
        description: description.trim(),
        teacherId: user.uid,
        teacherName: user.displayName || "",
        accessCode: code,
        module1: modules.module1,
        module2Easier: modules.module2Easier,
        module2Harder: modules.module2Harder,
        module1Minutes: Math.max(1, module1Minutes),
        module2Minutes: Math.max(1, module2Minutes),
        routingThreshold: Math.max(0, Math.min(routingThreshold, modules.module1.length)),
        shuffle,
        showAnswers,
        status: nextStatus,
      });

      if (publish && nextStatus !== "published") await setSatTestStatus(testId, "published");

      setAccessCode(code);
      setStatus(nextStatus);
      clearSatMathDraft();
      setRestored(false);
      toast.success(publish ? t.published : t.saved);
      if (publish) router.push(base);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error && err.message.startsWith("TEST_TOO_LARGE") ? t.tooLarge : t.saveFailed;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center"><Spinner size={28} /></div>;
  }

  const pickerStrings: SatPickerStrings = {
    source: t.source, srcAll: t.srcAll, srcAi: t.srcAi, srcMine: t.srcMine,
    bank: t.bank, bankMine: t.bankMine, bankShared: t.bankShared, by: t.by,
    load: t.load, loadMore: t.loadMore, none: t.none, reads: t.reads,
    add: t.add, added: t.added, imageOnly: t.imageOnly, full: t.full, aiBadge: t.aiBadge,
    mcqBadge: t.mcqBadge, numericBadge: t.numericBadge,
  };

  const TAB_LABEL: Record<ModuleKey, string> = {
    module1: t.module1Tab, module2Easier: t.module2EasierTab, module2Harder: t.module2HarderTab,
  };

  const items = modules[activeTab];
  const picked = satPickedIds(items);

  return (
    <div className="min-h-[100dvh] bg-surface pb-32">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6">
        <div className="flex items-center gap-2">
          <IconButton aria-label={t.back} size="sm" onClick={() => router.push(base)}>
            <ArrowLeft />
          </IconButton>
          <PageHeader
            className="flex-1"
            title={editId ? t.editTitle : t.newTitle}
            subtitle={t.subtitle}
          />
        </div>

        {loadError && <Banner tone="error" title={loadError} />}

        {restored && (
          <Banner tone="info" title={t.draftKept}>
            <Button size="sm" variant="text" onClick={discard}>{t.discardDraft}</Button>
          </Banner>
        )}

        {/* ── settings ─────────────────────────────────────────────────── */}
        <Card className="flex flex-col gap-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label={t.name}
              value={title}
              placeholder={t.namePlaceholder}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label={t.description}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              label={t.module1Minutes}
              type="number"
              min={1}
              value={module1Minutes}
              onChange={(e) => setModule1Minutes(Number(e.target.value) || 35)}
            />
            <TextField
              label={t.module2Minutes}
              type="number"
              min={1}
              value={module2Minutes}
              onChange={(e) => setModule2Minutes(Number(e.target.value) || 35)}
            />
            <TextField
              label={t.threshold}
              type="number"
              min={0}
              max={modules.module1.length}
              value={routingThreshold}
              onChange={(e) => { setThresholdTouched(true); setRoutingThreshold(Math.max(0, Number(e.target.value) || 0)); }}
            />
          </div>
          {/* How routing works, drawn instead of explained in a sentence. */}
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
            <span className="t-icon-chip rounded-full px-3 py-1.5">{TAB_LABEL.module1}</span>
            <ArrowRight size={14} className="text-on-surface-variant" />
            <span className="text-on-surface-variant">{fmt(t.flowIf, { n: routingThreshold })}</span>
            <ArrowRight size={14} className="text-on-surface-variant" />
            <span className="t-glass-pill rounded-full px-3 py-1.5 text-on-surface">{TAB_LABEL.module2Harder}</span>
            <span className="text-on-surface-variant">· {t.flowElse}</span>
            <ArrowRight size={14} className="text-on-surface-variant" />
            <span className="t-glass-pill rounded-full px-3 py-1.5 text-on-surface">{TAB_LABEL.module2Easier}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-on-surface">
              <Switch checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
              <span>{t.shuffle}</span>
            </label>

            <label className="flex items-center gap-2 text-[13px] font-medium text-on-surface">
              <Switch checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} />
              <span>{t.showAnswers}</span>
            </label>

            {/* The code exists only after the first save — no placeholder box before. */}
            {accessCode && (
              <div className="t-glass-pill ml-auto flex items-center gap-2 rounded-full px-4 py-2">
                <KeyRound size={14} className="text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t.code}</span>
                <span className="text-[17px] font-black tracking-[0.2em] text-on-surface">{accessCode}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Size: only worth showing when it is about to become a problem. */}
        {bytes > SAT_MAX_BYTES * 0.8 && (
          <Banner
            tone="warning"
            title={fmt(t.sizeWarn, { used: Math.round(bytes / 1024), max: Math.round(SAT_MAX_BYTES / 1024) })}
          />
        )}

        {/* ── per-module editor ────────────────────────────────────────── */}
        <PillGroup
          ariaLabel={t.progress}
          value={activeTab}
          onChange={setActiveTab}
          options={MODULE_KEYS.map((key) => ({
            id: key,
            label: (
              <span className="flex items-center gap-2">
                {TAB_LABEL[key]}
                <span className="rounded-full bg-[color-mix(in_oklab,currentColor_14%,transparent)] px-2 py-0.5 text-[11px] font-black tabular-nums">
                  {modules[key].length}
                </span>
              </span>
            ),
          }))}
          className="self-start"
        />

        {/* Spread across SAT domains (all modules) — only once there is one. */}
        {Object.keys(domainCounts).length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label={t.domains}>
            {SAT_MATH_DOMAINS.filter((d) => domainCounts[d.id]).map((d) => (
              <span key={d.id} className="t-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold text-on-surface-variant">
                {d.name[L] || d.name.uz}
                <span className="font-black tabular-nums text-on-surface">{domainCounts[d.id]}</span>
              </span>
            ))}
          </div>
        )}

        <Card className="p-4">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
            <h2 className="min-w-[180px] flex-1 text-[14px] font-bold text-on-surface">{t.addTitle}</h2>

            {/* The bundled sample test (data/sat-math-default-paper.json). Sits
                at the TOP of this card because it is the fastest route to a
                publishable test — a teacher who wants their own questions
                simply ignores it and picks below. */}
            <Button size="sm" variant="tonal" icon={<Wand2 />} loading={filling} onClick={fillDefault}>
              {t.fillDefault}
            </Button>
          </div>
          <div className="mb-3" />

          {/* ⚠️ Writing a question happens in the REAL builder, never in a
              cut-down form embedded here — see docs/QUESTIONS.md. The link
              STASHES the module first (draft.ts) and carries `?back=`/`?subject=`
              so saving RETURNS here with the question already on THIS module
              (`?module=` rides the round trip via returnTo.ts). */}
          <Link
            href={questionBuilderHref("/teacher/create/question", backHere(activeTab), SAT_MATH_TAXONOMY_SLUG)}
            onClick={stash}
            className="m3-interactive mb-4 flex items-start gap-3 rounded-m3-md border border-outline-variant bg-surface-container-lowest p-3 transition-colors hover:bg-surface-container"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-m3-sm bg-tertiary-container text-on-tertiary-container">
              <HelpCircle size={17} />
            </span>
            <span className="min-w-0 self-center text-[13px] font-bold text-on-surface">{t.newSingle}</span>
          </Link>

          <div className="border-t border-outline-variant pt-3">
            {user && (
              <SatBankPicker
                t={pickerStrings}
                uid={user.uid}
                lang={L}
                picked={picked}
                disabled={false}
                onAdd={(item) => addItem(activeTab, item)}
              />
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-on-surface">
            <BadgeCheck size={15} className="text-primary" /> {TAB_LABEL[activeTab]}
          </h2>

          {items.length === 0 ? (
            <p className="py-8 text-center text-[12px] font-medium text-on-surface-variant">{t.emptyModule}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {items.map((q, i) => (
                <li key={q.id} className="flex items-start gap-2 rounded-m3-md border border-outline-variant bg-surface-container-lowest p-2.5">
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-m3-xs bg-surface-container text-[11px] font-black text-on-surface-variant">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[12.5px] font-medium text-on-surface">
                      <LatexRenderer latex={satItemPreview(q, L)} />
                    </div>
                    <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-wide text-on-surface-variant">
                      {q.domainLabel[L] || q.domainLabel.uz} · {q.qType === "mcq" ? t.mcqBadge : t.numericBadge}
                      {q.creatorName ? ` · ${q.creatorName}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-0.5">
                    <IconButton aria-label={t.up} size="sm" disabled={i === 0} onClick={() => move(activeTab, i, -1)}>
                      <ArrowUp />
                    </IconButton>
                    <IconButton aria-label={t.down} size="sm" disabled={i === items.length - 1} onClick={() => move(activeTab, i, 1)}>
                      <ArrowDown />
                    </IconButton>
                    <IconButton aria-label={t.remove} size="sm" onClick={() => removeItem(activeTab, q.id)}>
                      <Trash2 />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* ── sticky save bar ──────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container-low px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <span className={cn("hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold", complete ? "text-success" : "text-on-surface-variant")}>
            {MODULE_KEYS.map((key) => (
              <span key={key} className="tabular-nums">{TAB_LABEL[key]}: {modules[key].length}</span>
            ))}
          </span>
          <Button variant="outlined" icon={<Save />} loading={saving} onClick={() => persist(false)} className="ml-auto">
            {t.save}
          </Button>
          <Button icon={<Send />} loading={saving} disabled={!complete} onClick={() => persist(true)}>
            {t.saveAndPublish}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SatMathBuilderPage() {
  // `useSearchParams` requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><Spinner size={28} /></div>}>
      <BuilderInner />
    </Suspense>
  );
}
