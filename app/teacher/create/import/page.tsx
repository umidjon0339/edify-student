"use client";

/**
 * JSON question import, for EVERY taxonomy subject (docs/SAT_QUIZ.md — it was
 * born as the SAT importer; `/teacher/sat/import` now redirects here).
 *
 * A teacher picks a subject (biologiya, kimyo, fizika, ona-tili, algebra,
 * geometriya, SAT Math/R&W; `?subject=` preselects) and uploads a JSON file;
 * every row is validated
 * against `data/question_topics.json` and written to `teacher_questions` as
 * ordinary v1 documents through the SAME adapter hand-authored questions use
 * (`toQuestionV1`), so they render, filter and grade identically.
 *
 * ⚠️ OWNERSHIP vs VISIBILITY — the thing to not get wrong here.
 * Rows are written with `creatorId = the uploader's uid`, never `''`. The
 * `teacher_questions` create rule requires exactly that, and it is also what we
 * want: the uploader keeps edit/delete rights and their `creatorName` is shown
 * as attribution. Ticking "share" only adds the flat `sharedBank: true` flag,
 * which makes the question visible in every teacher's "Shared" picker tab.
 * Only the SAT pickers read that flag, so the switch is offered for SAT only.
 * It is NOT the anonymous platform pool (`creatorId: ''`) — that one is
 * Admin-SDK-only, owned by nobody, and must stay that way.
 *
 * ⚠️ The `topic`/`subtopic` values in the file are the taxonomy's own ids,
 * which are persisted into the document and which nobody can guess
 * (`research-organizing-margin-of-error-outliers`) — so instead of a tree the
 * page offers a copyable AI prompt (`buildImportAiPrompt`) that lists exactly
 * this subject's ids and tells the model to use nothing else.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, Check, ChevronDown, CircleAlert, Copy,
  ArrowRightLeft, FileJson, Layers, Pencil, Sparkles, Trash2, Upload, X,
} from "lucide-react";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";

import { useTeacherLanguage } from "@/app/teacher/layout";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { toQuestionV1 } from "@/lib/questionSchema";
import { findSubject } from "@/lib/questionTopics";
import { SAT_MATH_TAXONOMY_SLUG } from "@/lib/SatMathQuiz";
import { detectSatExam, allExamRows, sectionAllRows, type SatExamLayout } from "@/lib/SatExamImport";
import { findQuestionList } from "@/lib/importAliases";
import { buildSatPoolItems, type SatPracticeSubject } from "@/lib/SatPractice";
import {
  deleteSatPoolBatch, listMySatPoolBatches, newSatPoolBatchId, saveSatPoolBatch, type SatPoolBatch,
} from "@/services/satPoolService";
import {
  MAX_IMPORT_ROWS, parseSatImport, parseSatImportRows, buildImportAiPrompt, importExampleFor,
  buildSatImportRow, importError, importSubjects, isSatSubject, readTags, allowedTypesFor,
  type SatImportReport, type SatImportOk, type SatImportError, type ImportSubject,
} from "@/lib/SatQuestionImport";
import { Banner, Button, Card, IconButton, PageHeader, PillGroup, Switch, cn } from "@/components/ui";
import { DIFFICULTY_LEVELS, type DifficultyName } from "@/types/question";
import ModuleMixChart, { type ModuleRows } from "./_components/ModuleMixChart";
import PreviewRow from "./_components/PreviewRow";
import type { QuestionV1 } from "@/types/question";

/** Firestore's own hard cap on one batch. */
const BATCH_LIMIT = 500;

/** Preview rows rendered per "show more" step. */
const PREVIEW_PAGE = 50;

const TR = {
  uz: {
    title: "JSON orqali savol qo'shish",
    subtitle: "Fanni tanlang, JSON faylni yuklang — savollar bazangizga qo'shiladi.",
    subject: "Fan",
    pick: "JSON fayl tanlash",
    format: "Fayl ko'rinishi",
    copy: "Nusxa olish",
    copied: "Nusxa olindi",
    prompt: "AI uchun prompt",
    promptHint: "Nusxa olib ChatGPT/Gemini'ga yuboring — savollar faqat shu fanning mavzulari bo'yicha, to'g'ri formatda tuziladi. [N] o'rniga savollar sonini yozing.",
    valid: "tayyor",
    invalid: "xato",
    dupes: "takror (o'tkazib yuborildi)",
    errorsTitle: "Qabul qilinmagan qatorlar",
    errorsFix: "Quyidagi qatorlarda xato bor — to'g'rilang va import qiling.",
    row: "qator",
    preview: "Ko'rib chiqish",
    share: "Boshqa o'qituvchilarga ham ko'rinsin",
    shareHint: "Savollar sizniki bo'lib qoladi — faqat siz tahrirlay va o'chira olasiz. Ulashilganda ular har bir o'qituvchining SAT «Ulashilgan» ro'yxatida ismingiz bilan ko'rinadi.",
    importBtn: (n: number) => `${n} ta savolni qo'shish`,
    importing: "Qo'shilmoqda…",
    done: (n: number) => `${n} ta savol bazaga qo'shildi.`,
    failed: "Saqlashda xatolik yuz berdi.",
    nothing: "Qo'shiladigan savol yo'q.",
    back: "Orqaga",
    reviewNote: "Import qilingan savollar «review» holatida saqlanadi — bazangizda ko'rinadi va testga qo'shsa bo'ladi.",
    fixAnswer: "Javob",
    fixTopic: "Mavzu",
    fixSubtopic: "Bo'lim",
    fixDifficulty: "Daraja",
    fixApply: "Tasdiqlash",
    promoted: "To'g'rilandi ✓",
    selectPlaceholder: "— tanlang —",
    noTopicFirst: "Avval mavzu tanlang",
    bulkTopicTitle: (n: number) => `${n} ta savolning mavzusi aniqlanmadi`,
    bulkTopicHint: "Mavzu va bo'limni bir marta tanlang — barcha shu savollarga qo'llanadi.",
    bulkSubtopicTitle: (n: number, topic: string) => `«${topic}» — ${n} ta savolning bo'limi aniqlanmadi`,
    bulkSubtopicHint: "Bo'limni bir marta tanlang — shu mavzudagi barcha savollarga qo'llanadi.",
    bulkApply: (n: number) => `${n} ta savolga qo'llash`,
    tags: "Teglar",
    tagsHint: "Vergul bilan ajrating — har bir savolga qo'shiladi va keyin shu teglar bo'yicha qidirish mumkin.",
    kind: "Import turi",
    kindQuestions: "Savollar (bazaga)",
    kindExam: "SAT amaliyot banki",
    kindQuestionsHint: "Har bir savol bazangizga alohida qo'shiladi — keyin istalgan testga tanlaysiz.",
    kindExamHint: "Savollar umumiy SAT amaliyot bankiga qo'shiladi. O'quvchilarning SAT sahifasi har safar shu bankdan haqiqiy SAT kabi yangi test tuzadi: har bo'limdan kerakli soni, turli mavzular, oson/o'rta/qiyin aralash. Bitta fayl istalgan ko'rinishda bo'lishi mumkin — savollar ro'yxati yoki to'liq mock (modullar bilan).",
    looksMock: "Bu fayl to'liq SAT mock ko'rinishida (modullar bor). Uni o'quvchilar uchun umumiy amaliyot bankiga qo'shish uchun «SAT amaliyot banki» bo'limiga o'ting — bu yerda savollar faqat sizning bazangizga qo'shiladi.",
    switchToMock: "Amaliyot bankiga qo'shish",
    examSection: "Bo'lim",
    bankNeedsSat: "Amaliyot banki faqat SAT uchun — yuqorida SAT Math yoki SAT Reading & Writing'ni tanlang.",
    bankNote: "Savollar sizning shaxsiy bazangizga emas, barcha o'quvchilar uchun umumiy SAT amaliyot bankiga qo'shiladi. Yuklamani pastdagi ro'yxatdan o'chirishingiz mumkin.",
    addToBank: (n: number) => `${n} ta savolni amaliyot bankiga qo'shish`,
    addingToBank: "Qo'shilmoqda…",
    bankDone: (n: number) => `${n} ta savol SAT amaliyot bankiga qo'shildi — o'quvchilar endi undan test tuzishi mumkin.`,
    myBatches: "Amaliyot bankiga yuklamalarim",
    deleteBatch: "O'chirish",
    deleteBatchConfirm: (n: number) => `Bu yuklamadagi ${n} ta savol bankdan o'chiriladi. Davom etasizmi?`,
    batchLine: (n: number, subject: string) => `${n} ta savol · ${subject}`,
    alsoToBank: "Savollar bazasiga ham qo'shish",
    alsoToBankHint: "Xuddi shu savollar sizning savollar bazangizga ham yoziladi — SAT bo'limidagi test tuzuvchida ulardan haqiqiy SAT mock testi tuzish mumkin. Amaliyot bankidagi yuklamani o'chirsangiz, bu nusxalar qoladi.",
    bankAlsoDone: (n: number) => `Shuningdek ${n} ta savol savollar bazangizga qo'shildi (SAT test tuzuvchi).`,
    removeAll: (n: number) => `Barcha xatolarni olib tashlash (${n})`,
    removeAllConfirm: (n: number) => `${n} ta xato savol import qilinmaydi. Davom etasizmi?`,
    foreignTitle: (n: number, name: string) => `${n} ta savol «${name}» faniga tegishli ko'rinadi`,
    foreignHint: "Ular noto'g'ri fan bo'limiga tushib qolmasligi uchun qabul qilinmadi. Faylni o'sha fan bilan qayta o'qing yoki ularni olib tashlang.",
    switchTo: (name: string) => `«${name}» bilan qayta o'qish`,
    removeThese: "Ularni olib tashlash",
    previewCount: (n: number) => `${n} ta savol import qilinadi — bosib, to'liq ko'ring`,
    showMore: (n: number) => `Yana ko'rsatish (${n} ta qoldi)`,
    removeRow: "Olib tashlash",
    correctMark: "To'g'ri javob",
    answerLabel: "Javob",
    acceptedLabel: "Qabul qilinadigan shakllar",
    explanationLabel: "Yechim",
    chart: { byDomain: "Savollar: bo'lim va qiyinlik bo'yicha", questions: "ta savol", easy: "Oson", medium: "O'rta", hard: "Qiyin" },
  },
  ru: {
    title: "Импорт вопросов из JSON",
    subtitle: "Выберите предмет и загрузите JSON-файл — вопросы добавятся в вашу базу.",
    subject: "Предмет",
    pick: "Выбрать JSON-файл",
    format: "Формат файла",
    copy: "Копировать",
    copied: "Скопировано",
    prompt: "Промпт для ИИ",
    promptHint: "Скопируйте и отправьте в ChatGPT/Gemini — вопросы будут созданы только по темам этого предмета и в нужном формате. Замените [N] на количество вопросов.",
    valid: "готово",
    invalid: "с ошибкой",
    dupes: "дубликаты (пропущены)",
    errorsTitle: "Непринятые строки",
    errorsFix: "В следующих строках ошибки — исправьте и импортируйте.",
    row: "строка",
    preview: "Предпросмотр",
    share: "Показывать другим учителям",
    shareHint: "Вопросы остаются вашими — только вы можете их менять и удалять. При публикации они появятся во вкладке «Общие» у каждого учителя с вашим именем.",
    importBtn: (n: number) => `Добавить ${n} вопросов`,
    importing: "Добавление…",
    done: (n: number) => `Добавлено вопросов: ${n}.`,
    failed: "Не удалось сохранить.",
    nothing: "Нет вопросов для добавления.",
    back: "Назад",
    reviewNote: "Импортированные вопросы сохраняются со статусом «review» — они видны в вашей базе и их можно добавить в тест.",
    fixAnswer: "Ответ",
    fixTopic: "Тема",
    fixSubtopic: "Раздел",
    fixDifficulty: "Сложность",
    fixApply: "Применить",
    promoted: "Исправлено ✓",
    selectPlaceholder: "— выберите —",
    noTopicFirst: "Сначала выберите тему",
    bulkTopicTitle: (n: number) => `Тема не определена у ${n} вопросов`,
    bulkTopicHint: "Выберите тему и раздел один раз — они применятся ко всем этим вопросам.",
    bulkSubtopicTitle: (n: number, topic: string) => `«${topic}» — раздел не определён у ${n} вопросов`,
    bulkSubtopicHint: "Выберите раздел один раз — он применится ко всем вопросам этой темы.",
    bulkApply: (n: number) => `Применить к ${n} вопросам`,
    tags: "Теги",
    tagsHint: "Через запятую — добавятся к каждому вопросу, по ним потом можно искать.",
    kind: "Тип импорта",
    kindQuestions: "Вопросы (в базу)",
    kindExam: "Банк практики SAT",
    kindQuestionsHint: "Каждый вопрос добавляется в вашу базу отдельно — потом выбираете его в любой тест.",
    kindExamHint: "Вопросы добавляются в общий банк практики SAT. Страница SAT у учеников каждый раз собирает из него новый тест как настоящий SAT: нужное число по каждому разделу, разные темы, смесь лёгких/средних/сложных. Файл может быть любым — список вопросов или полный mock (с модулями).",
    looksMock: "Этот файл похож на полный mock SAT (есть модули). Чтобы добавить его в общий банк практики для учеников, перейдите во вкладку «Банк практики SAT» — здесь вопросы попадают только в вашу базу.",
    switchToMock: "Добавить в банк практики",
    examSection: "Раздел",
    bankNeedsSat: "Банк практики — только для SAT: выберите выше SAT Math или SAT Reading & Writing.",
    bankNote: "Вопросы попадают не в вашу личную базу, а в общий банк практики SAT для всех учеников. Загрузку можно удалить в списке ниже.",
    addToBank: (n: number) => `Добавить ${n} вопросов в банк практики`,
    addingToBank: "Добавление…",
    bankDone: (n: number) => `${n} вопросов добавлено в банк практики SAT — ученики уже могут собирать из него тесты.`,
    myBatches: "Мои загрузки в банк практики",
    deleteBatch: "Удалить",
    deleteBatchConfirm: (n: number) => `${n} вопросов этой загрузки будут удалены из банка. Продолжить?`,
    batchLine: (n: number, subject: string) => `${n} вопросов · ${subject}`,
    alsoToBank: "Также добавить в базу вопросов",
    alsoToBankHint: "Те же вопросы запишутся и в вашу базу вопросов — из них можно собрать настоящий mock-тест SAT в конструкторе SAT. Если удалить загрузку из банка практики, эти копии останутся.",
    bankAlsoDone: (n: number) => `Также ${n} вопросов добавлено в вашу базу вопросов (конструктор SAT).`,
    removeAll: (n: number) => `Убрать все ошибки (${n})`,
    removeAllConfirm: (n: number) => `${n} вопросов с ошибкой не будут импортированы. Продолжить?`,
    foreignTitle: (n: number, name: string) => `${n} вопросов похожи на предмет «${name}»`,
    foreignHint: "Они не приняты, чтобы не попасть в чужой раздел. Перечитайте файл с этим предметом или уберите их.",
    switchTo: (name: string) => `Перечитать как «${name}»`,
    removeThese: "Убрать их",
    previewCount: (n: number) => `Будет импортировано ${n} вопросов — нажмите, чтобы увидеть целиком`,
    showMore: (n: number) => `Показать ещё (осталось ${n})`,
    removeRow: "Убрать",
    correctMark: "Верный ответ",
    answerLabel: "Ответ",
    acceptedLabel: "Допустимые формы",
    explanationLabel: "Решение",
    chart: { byDomain: "Вопросы по разделам и сложности", questions: "вопр.", easy: "Лёгкие", medium: "Средние", hard: "Сложные" },
  },
  en: {
    title: "Import questions from JSON",
    subtitle: "Pick a subject and upload a JSON file — the questions are added to your bank.",
    subject: "Subject",
    pick: "Choose a JSON file",
    format: "File format",
    copy: "Copy",
    copied: "Copied",
    prompt: "AI prompt",
    promptHint: "Copy it into ChatGPT/Gemini — it creates questions only for this subject's topics, in the right format. Replace [N] with how many questions you want.",
    valid: "ready",
    invalid: "rejected",
    dupes: "duplicates (skipped)",
    errorsTitle: "Rejected rows",
    errorsFix: "The rows below have errors — fix them and import.",
    row: "row",
    preview: "Preview",
    share: "Show to other teachers too",
    shareHint: "The questions stay yours — only you can edit or delete them. When shared they appear in every teacher's SAT \"Shared\" tab with your name on them.",
    importBtn: (n: number) => `Add ${n} questions`,
    importing: "Adding…",
    done: (n: number) => `${n} questions added to the bank.`,
    failed: "Could not save.",
    nothing: "Nothing to add.",
    back: "Back",
    reviewNote: "Imported questions are saved with status \"review\" — they show in your bank and can be added to a test.",
    fixAnswer: "Answer",
    fixTopic: "Topic",
    fixSubtopic: "Subtopic",
    fixDifficulty: "Difficulty",
    fixApply: "Apply fix",
    promoted: "Fixed ✓",
    selectPlaceholder: "— select —",
    noTopicFirst: "Select a topic first",
    bulkTopicTitle: (n: number) => `${n} questions have no recognised topic`,
    bulkTopicHint: "Pick the topic and subtopic once — it is applied to all of them.",
    bulkSubtopicTitle: (n: number, topic: string) => `"${topic}" — ${n} questions have no recognised subtopic`,
    bulkSubtopicHint: "Pick the subtopic once — it is applied to every question of this topic.",
    bulkApply: (n: number) => `Apply to ${n} questions`,
    tags: "Tags",
    tagsHint: "Comma-separated — added to every question so you can find them by tag later.",
    kind: "Import type",
    kindQuestions: "Questions (to bank)",
    kindExam: "SAT practice bank",
    kindQuestionsHint: "Every question is added to your bank on its own — pick them into any test later.",
    kindExamHint: "The questions go into the shared SAT practice bank. Every student's SAT page builds a NEW real-SAT-shaped test from it each time: the right number per domain, varied subtopics, a mix of easy/medium/hard. Any file shape works — a question list or a full mock with modules.",
    looksMock: "This file looks like a full SAT mock (it has modules). To add it to the shared practice bank for students, switch to the \"SAT practice bank\" tab — here the questions only go into your own bank.",
    switchToMock: "Add to the practice bank",
    examSection: "Section",
    bankNeedsSat: "The practice bank is SAT-only — pick SAT Math or SAT Reading & Writing above.",
    bankNote: "The questions go into the shared SAT practice bank for all students, not your own bank. You can delete an upload in the list below.",
    addToBank: (n: number) => `Add ${n} questions to the practice bank`,
    addingToBank: "Adding…",
    bankDone: (n: number) => `${n} questions added to the SAT practice bank — students can now build tests from it.`,
    myBatches: "My uploads to the practice bank",
    deleteBatch: "Delete",
    deleteBatchConfirm: (n: number) => `The ${n} questions of this upload will be removed from the bank. Continue?`,
    batchLine: (n: number, subject: string) => `${n} questions · ${subject}`,
    alsoToBank: "Also add to the question bank",
    alsoToBankHint: "The same questions are also written to your question bank, so the SAT test builder can use them for real SAT mock tests. Deleting the practice-bank upload does not remove these copies.",
    bankAlsoDone: (n: number) => `Also added ${n} questions to your question bank (SAT test builder).`,
    removeAll: (n: number) => `Remove all errors (${n})`,
    removeAllConfirm: (n: number) => `${n} rejected questions will not be imported. Continue?`,
    foreignTitle: (n: number, name: string) => `${n} questions look like "${name}" questions`,
    foreignHint: "They were rejected so they don't land under the wrong subject's topics. Re-read the file as that subject, or remove them.",
    switchTo: (name: string) => `Re-read as "${name}"`,
    removeThese: "Remove them",
    previewCount: (n: number) => `${n} questions will be imported — tap one to see it in full`,
    showMore: (n: number) => `Show more (${n} left)`,
    removeRow: "Remove",
    correctMark: "Correct answer",
    answerLabel: "Answer",
    acceptedLabel: "Also accepted",
    explanationLabel: "Solution",
    chart: { byDomain: "Questions by domain and difficulty", questions: "questions", easy: "Easy", medium: "Medium", hard: "Hard" },
  },
} as const;

// ─── error-kind classifier ────────────────────────────────────────────────────

type ErrorKind =
  | "missing_answer"
  | "wrong_answer"
  | "missing_choices"
  | "unknown_topic"
  | "unknown_subtopic"
  | "unknown_difficulty"
  | "other";

function classifyError(reason: string): ErrorKind {
  if (reason.includes('missing "answer"')) return "missing_answer";
  if (reason.includes('"answer":') && reason.includes("not one of")) return "wrong_answer";
  if (reason.includes('"choices"')) return "missing_choices";
  if (reason.includes('unknown "topic"')) return "unknown_topic";
  if (reason.includes('unknown "subtopic"')) return "unknown_subtopic";
  if (reason.includes('unknown "difficulty"')) return "unknown_difficulty";
  return "other";
}

// ─── shared select ────────────────────────────────────────────────────────────

const selectCls = (invalid: boolean) => cn(
  "appearance-none rounded-m3-sm border py-1.5 pl-2.5 pr-7 text-[12px] font-medium",
  "bg-surface-container-highest text-on-surface outline-none",
  "focus:border-primary focus:ring-1 focus:ring-primary/25 transition",
  "disabled:opacity-40",
  invalid ? "border-error/70" : "border-outline-variant",
);

const isTopicError = (e: SatImportError) => {
  const kind = classifyError(e.reason);
  return kind === "unknown_topic" || kind === "unknown_subtopic";
};

// ─── BulkTopicFix component ───────────────────────────────────────────────────

type TrLabels = typeof TR[keyof typeof TR];

/**
 * ONE topic/subtopic choice (by display name) for a whole group of rows the
 * resolver could not place — a 300-row file with no usable topic field must not
 * mean 300 dropdown pairs. With `fixedTopic` the group's topic DID resolve and
 * only the subtopic is asked. Each row is re-validated through `buildSatImportRow`.
 */
function BulkTopicFix({ count, subject, fixedTopic, labels: t, onApply }: {
  count: number;
  subject: ImportSubject;
  fixedTopic: string;
  labels: TrLabels;
  onApply: (topic: string, subtopic: string) => void;
}) {
  const topics = findSubject(subject)?.topics ?? [];
  const [topic, setTopic] = useState(fixedTopic);
  const fixedName = topics.find((tp) => tp.id === fixedTopic)?.name ?? fixedTopic;
  const [subtopic, setSubtopic] = useState("");
  const subtopics = topics.find((tp) => tp.id === topic)?.subtopics ?? [];

  return (
    <div className="mb-2.5 rounded-m3-md border border-error/25 bg-surface-container px-3 py-2.5">
      <p className="text-[12px] font-black text-on-surface">
        {fixedTopic ? t.bulkSubtopicTitle(count, fixedName) : t.bulkTopicTitle(count)}
      </p>
      <p className="text-[11px] font-medium text-on-surface-variant">
        {fixedTopic ? t.bulkSubtopicHint : t.bulkTopicHint}
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        {!fixedTopic && <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t.fixTopic}</label>
          <div className="relative">
            <select
              value={topic}
              onChange={(e) => {
                const next = topics.find((tp) => tp.id === e.target.value);
                setTopic(e.target.value);
                // R&W topics have a single same-named subtopic — preselect it.
                setSubtopic(next?.subtopics.length === 1 ? next.subtopics[0].id : "");
              }}
              className={selectCls(!topic)}
            >
              <option value="">{t.selectPlaceholder}</option>
              {topics.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          </div>
        </div>}

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t.fixSubtopic}</label>
          <div className="relative">
            <select
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              disabled={!topic}
              className={cn(selectCls(!!topic && !subtopic), "max-w-[min(32rem,80vw)]")}
            >
              <option value="">{!topic ? t.noTopicFirst : t.selectPlaceholder}</option>
              {subtopics.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          </div>
        </div>

        <button
          onClick={() => onApply(topic, subtopic)}
          disabled={!topic || !subtopic}
          className={cn(
            "flex items-center gap-1.5 self-end rounded-m3-sm bg-primary px-3 py-1.5",
            "text-[11.5px] font-bold text-on-primary transition-all hover:opacity-90 active:scale-[0.97]",
            "disabled:opacity-40",
          )}
        >
          <Pencil size={11} />
          {t.bulkApply(count)}
        </button>
      </div>
    </div>
  );
}

// ─── FixableRow component ─────────────────────────────────────────────────────

interface FixableRowProps {
  error: SatImportError;
  subject: ImportSubject;
  labels: TrLabels;
  onFixed: (idx: number, ok: SatImportOk) => void;
  onDismiss: (idx: number) => void;
}

/** One rejected row. Topic errors are fixed in bulk (above), so this only edits
 *  the answer/difficulty; the row is rebuilt through `buildSatImportRow`. */
function FixableRow({ error, subject, labels: t, onFixed, onDismiss }: FixableRowProps) {
  const kind = classifyError(error.reason);
  const raw = error.raw;

  const rawDifficulty = typeof raw.difficulty === "string" ? raw.difficulty.toLowerCase() : "medium";
  const [difficulty, setDifficulty] = useState<DifficultyName>(
    DIFFICULTY_LEVELS.includes(rawDifficulty as DifficultyName) ? (rawDifficulty as DifficultyName) : "medium",
  );
  const [answer, setAnswer] = useState(typeof raw.answer === "string" ? raw.answer : "");
  const [validationErr, setValidationErr] = useState("");
  const [promoted, setPromoted] = useState(false);

  const apply = () => {
    const built = buildSatImportRow(error.index, { ...raw, answer: answer.trim(), difficulty }, subject);
    if (typeof built === "string") { setValidationErr(built); return; }
    setPromoted(true);
    setTimeout(() => onFixed(error.index, built), 700);
  };

  if (promoted) {
    return (
      <li className="flex items-center gap-2 rounded-m3-md border border-success/30 bg-success-container/20 px-3 py-2.5 text-[12px] font-bold text-on-success-container">
        <Check size={13} className="flex-none text-success" />
        {t.row} {error.index + 1}: {t.promoted}
      </li>
    );
  }

  const isFixable = kind === "unknown_difficulty" || kind === "missing_answer" || kind === "wrong_answer";

  return (
    <li className="overflow-hidden rounded-m3-md border border-error/25 bg-surface-container">
      {/* ── row header ── */}
      <div className="flex items-start justify-between gap-2 border-b border-error/15 bg-error-container/20 px-3 py-2.5">
        <div className="flex items-start gap-1.5">
          <CircleAlert size={13} className="mt-0.5 flex-none text-error" />
          <div>
            <span className="text-[12px] font-black text-on-surface">{t.row} {error.index + 1}</span>
            <p className="mt-0.5 font-mono text-[10.5px] font-medium text-error">{error.reason}</p>
          </div>
        </div>
        <button
          onClick={() => onDismiss(error.index)}
          title="Dismiss"
          className="flex-none rounded-full p-0.5 text-on-surface-variant/50 transition hover:bg-error/10 hover:text-error"
        >
          <X size={13} />
        </button>
      </div>

      {/* ── editable fields ── */}
      {isFixable && (
        <div className="flex flex-wrap items-end gap-3 px-3 py-2.5">

          {/* difficulty */}
          {kind === "unknown_difficulty" && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                {t.fixDifficulty}
              </label>
              <div className="relative">
                <select
                  value={difficulty}
                  onChange={(e) => { setDifficulty(e.target.value as DifficultyName); setValidationErr(""); }}
                  className={selectCls(true)}
                >
                  {DIFFICULTY_LEVELS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              </div>
            </div>
          )}

          {/* answer */}
          {(kind === "missing_answer" || kind === "wrong_answer") && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                {t.fixAnswer}
              </label>
              <input
                type="text"
                value={answer}
                onChange={(e) => { setAnswer(e.target.value); setValidationErr(""); }}
                placeholder={raw.choices != null ? "A / B / C / D" : "16.25"}
                className={cn(
                  "w-28 rounded-m3-sm border px-2.5 py-1.5 text-[12px] font-medium",
                  "bg-surface-container-highest text-on-surface outline-none",
                  "focus:border-primary focus:ring-1 focus:ring-primary/25 transition",
                  !answer.trim() ? "border-error/70" : "border-outline-variant",
                )}
              />
            </div>
          )}

          {validationErr && (
            <p className="w-full text-[11px] font-bold text-error">{validationErr}</p>
          )}

          <button
            onClick={apply}
            className={cn(
              "flex items-center gap-1.5 self-end rounded-m3-sm bg-primary px-3 py-1.5",
              "text-[11.5px] font-bold text-on-primary transition-all hover:opacity-90 active:scale-[0.97]",
            )}
          >
            <Pencil size={11} />
            {t.fixApply}
          </button>
        </div>
      )}
    </li>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

const SUBJECTS = importSubjects();

/** useSearchParams() (the `?subject=` / `?back=` deep link) must sit under Suspense. */
export default function QuestionImportPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-surface" />}>
      <QuestionImport />
    </Suspense>
  );
}

function QuestionImport() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = TR[(lang as keyof typeof TR) ?? "uz"] ?? TR.uz;

  const initialSubject = searchParams.get("subject") ?? "";
  const backHref = searchParams.get("back") || "/teacher/create";
  /** Two separate imports: loose questions → the bank, or ONE whole SAT mock
   *  exam → a ready test (`?kind=exam`). docs/SAT_QUIZ.md §Full-exam import. */
  const [kind, setKind] = useState<"questions" | "exam">(searchParams.get("kind") === "exam" ? "exam" : "questions");
  const [subject, setSubject] = useState<ImportSubject>(() => {
    const known = SUBJECTS.some((s) => s.id === initialSubject) ? initialSubject : SAT_MATH_TAXONOMY_SLUG;
    return searchParams.get("kind") === "exam" && !isSatSubject(known) ? SAT_MATH_TAXONOMY_SLUG : known;
  });
  const sat = isSatSubject(subject);
  /** `ingest` defaults to this; the "switch subject" banner passes another. */
  const currentSubject = subject;
  const isExam = kind === "exam";
  const subjectOptions = isExam ? SUBJECTS.filter((s) => isSatSubject(s.id)) : SUBJECTS;
  /** Exam tab: the file's layout + which section (Math / R&W) is being imported. */
  const [exam, setExam] = useState<SatExamLayout | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  /** Questions tab: the file is mock-shaped — offer the exam tab instead. */
  const [looksMock, setLooksMock] = useState(false);
  const [lastText, setLastText] = useState("");
  /** Bank tab: what the last upload wrote — practice bank + question bank copies. */
  const [banked, setBanked] = useState<{ pool: number; bank: number } | null>(null);
  /** Bank tab: ALSO write the questions to `teacher_questions` (the SAT test builder's pool). */
  const [alsoToBank, setAlsoToBank] = useState(true);
  /** Bank tab: the teacher's own uploads (null = not loaded yet). */
  const [batches, setBatches] = useState<SatPoolBatch[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<SatImportReport | null>(null);
  /** Extra ok rows promoted from the error-fix flow */
  const [fixedRows, setFixedRows] = useState<SatImportOk[]>([]);
  /** Indices that were either fixed or dismissed — hidden from the error list */
  const [dismissedErrors, setDismissedErrors] = useState<Set<number>>(new Set());
  /** Valid rows the teacher removed from the preview — never written. */
  const [removedOk, setRemovedOk] = useState<Set<number>>(new Set());
  /** How many preview rows are rendered (paged — a file can hold thousands). */
  const [previewLimit, setPreviewLimit] = useState(PREVIEW_PAGE);
  const [share, setShare] = useState(true);
  /** Import-wide tags, merged into every question's own `tags`. */
  const [tagsText, setTagsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // The bank tab takes the same question rows (any file shape), so it shares
  // the questions tab's prompt and example.
  const aiPrompt = useMemo(() => buildImportAiPrompt(subject), [subject]);
  const example = useMemo(() => importExampleFor(subject), [subject]);

  /** The teacher's practice-bank uploads — loaded when the bank tab opens. */
  const refreshBatches = useCallback(async () => {
    if (!user) return;
    try { setBatches(await listMySatPoolBatches(user.uid)); } catch (e) { console.error(e); setBatches([]); }
  }, [user]);
  useEffect(() => {
    if (isExam && batches === null) refreshBatches();
  }, [isExam, batches, refreshBatches]);

  const reset = () => {
    setReport(null);
    setFileName("");
    setSaved(null);
    setError("");
    setFixedRows([]);
    setDismissedErrors(new Set());
    setRemovedOk(new Set());
    setPreviewLimit(PREVIEW_PAGE);
    setExam(null);
    setSectionIdx(0);
    setLooksMock(false);
    setLastText("");
    setBanked(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const switchKind = (next: "questions" | "exam") => {
    if (next === kind) return;
    setKind(next);
    if (next === "exam" && !isSatSubject(subject)) setSubject(SAT_MATH_TAXONOMY_SLUG);
    reset();
  };

  /** Validate ONE exam section. Its rows keep module order, no dedupe — the
   *  report index is what maps a row back onto its module at commit. */
  const loadSection = (layout: SatExamLayout, idx: number, fallback: ImportSubject) => {
    const section = layout.sections[idx];
    const subj = section.subject || fallback;
    setSectionIdx(idx);
    setSubject(subj);
    setFixedRows([]);
    setDismissedErrors(new Set());
    setRemovedOk(new Set());
    setPreviewLimit(PREVIEW_PAGE);
    // All distinct rows of the section — modules don't matter for the bank.
    setReport(parseSatImportRows(sectionAllRows(section), subj));
  };

  /** Parse a file's text for the given tab. Kept separate from `onFile` so the
   *  "open as a mock test" button can re-read the same file in the other tab. */
  const ingest = (text: string, as: "questions" | "exam", subject: ImportSubject = currentSubject) => {
    setSaved(null);
    setError("");
    setBanked(null);
    setFixedRows([]);
    setDismissedErrors(new Set());
    setRemovedOk(new Set());
    setPreviewLimit(PREVIEW_PAGE);
    setExam(null);
    setLooksMock(false);

    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch {
      // `parseSatImport` words the JSON error the same way for both tabs.
      setReport(parseSatImport(text, subject));
      return;
    }

    if (as === "exam") {
      // Unknown wrapper (`results`, `savollar`, nested…)? Use the question list wherever it sits.
      const found = findQuestionList(parsed);
      const layout = detectSatExam(parsed, { force: true }) ?? (found ? detectSatExam(found.list, { force: true }) : null);
      if (!layout) {
        setReport({ subject, ok: [], errors: [], duplicates: 0, fatal: "No questions found in this file." });
        return;
      }
      setExam(layout);
      // Prefer the section matching the selected subject.
      const at = layout.sections.findIndex((s) => s.subject === subject);
      loadSection(layout, Math.max(0, at), subject);
      return;
    }

    // Questions tab: a mock-shaped file still imports — every distinct row of
    // every module/section goes to the bank — but the exam tab is offered.
    const layout = detectSatExam(parsed);
    if (layout && isSatSubject(subject)) setLooksMock(true);
    setReport(layout ? parseSatImportRows(allExamRows(layout), subject) : parseSatImport(text, subject));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setLastText(text);
    ingest(text, kind);
  };

  const handleFixed = useCallback((idx: number, ok: SatImportOk) => {
    setFixedRows((prev) => [...prev.filter((r) => r.index !== idx), ok]);
    setDismissedErrors((prev) => new Set([...prev, idx]));
  }, []);

  const handleDismiss = useCallback((idx: number) => {
    setDismissedErrors((prev) => new Set([...prev, idx]));
  }, []);

  const visibleErrors = useMemo(
    () => (report?.errors ?? []).filter((e) => !dismissedErrors.has(e.index)),
    [report, dismissedErrors],
  );
  /** Unplaced rows grouped by their resolved topic ('' = topic unknown too). */
  const topicGroups = useMemo(() => {
    const groups = new Map<string, SatImportError[]>();
    for (const e of visibleErrors.filter(isTopicError)) groups.set(e.topic, [...(groups.get(e.topic) ?? []), e]);
    return [...groups.entries()];
  }, [visibleErrors]);
  const rowErrors = useMemo(() => visibleErrors.filter((e) => !isTopicError(e) && !e.foreignSubject), [visibleErrors]);

  /** Apply one topic/subtopic to every row of a group. Rows that then fail for
   *  another reason (bad answer…) stay in the list with that new reason. */
  const applyBulkTopic = (group: SatImportError[], topic: string, subtopic: string) => {
    if (!report) return;
    const fixed: SatImportOk[] = [];
    const still = new Map<number, SatImportError>();
    for (const e of group) {
      const raw = { ...e.raw, topic, subtopic };
      const built = buildSatImportRow(e.index, raw, subject);
      if (typeof built === "string") still.set(e.index, importError(e.index, built, raw, subject));
      else fixed.push(built);
    }
    setReport({ ...report, errors: report.errors.map((e) => still.get(e.index) ?? e) });
    setFixedRows((prev) => [...prev.filter((r) => !fixed.some((f) => f.index === r.index)), ...fixed]);
    setDismissedErrors((prev) => new Set([...prev, ...fixed.map((f) => f.index)]));
  };

  const allOkRows = useMemo(
    () => [...(report?.ok ?? []), ...fixedRows]
      .filter((r) => !removedOk.has(r.index))
      .sort((a, b) => a.index - b.index),
    [report, fixedRows, removedOk],
  );

  const removeOk = useCallback((idx: number) => {
    setRemovedOk((prev) => new Set([...prev, idx]));
  }, []);

  /** Drop every still-visible rejected row at once (they are simply not imported). */
  const dismissAll = (list: SatImportError[]) => {
    setDismissedErrors((prev) => new Set([...prev, ...list.map((e) => e.index)]));
  };

  /** Rows that belong to the OTHER SAT subject — one banner, not N rows. */
  const foreignErrors = useMemo(() => visibleErrors.filter((e) => e.foreignSubject), [visibleErrors]);
  const foreignTarget = foreignErrors[0]?.foreignSubject ?? "";

  /** Re-read the same file under the other SAT subject. */
  const switchSubjectTo = (next: ImportSubject) => {
    setSubject(next);
    if (lastText) ingest(lastText, kind, next);
  };

  /**
   * Write validated rows to the teacher's own `teacher_questions` bank — the
   * pool every builder picks from (for SAT: the SAT test builder's picker).
   * Shared by the questions tab and the practice-bank tab ("also add to the
   * question bank"). Returns how many actually landed.
   */
  const writeToQuestionBank = async (rows: SatImportOk[]): Promise<number> => {
    if (!user) return 0;
    const creatorName = user.displayName || "";
    const extraTags = readTags(tagsText);
    // Chunked at Firestore's own 500-write batch cap. Each chunk commits on
    // its own: a later chunk failing leaves the earlier ones written, which
    // is why the success message reports what actually landed rather than
    // what was attempted.
    let written = 0;
    for (let start = 0; start < rows.length; start += BATCH_LIMIT) {
      const batch = writeBatch(db);
      for (const row of rows.slice(start, start + BATCH_LIMIT)) {
        const ref = doc(collection(db, "teacher_questions"));
        const id = `tq_${ref.id}`;
        const source = extraTags.length
          ? { ...row.source, tags: [...new Set([...(row.source.tags as string[]), ...extraTags])] }
          : row.source;
        const payload: QuestionV1 = toQuestionV1(source, {
          id,
          creatorId: user.uid,
          creatorName,
          // `exam_import` defaults to status 'review' and tags the doc
          // `exam_import` — right for a bulk dataset, and deliberately NOT
          // overridden to 'published' the way the curated platform import was.
          creationMethod: "exam_import",
          timestamp: serverTimestamp(),
        });
        // `sharedBank` is a visibility flag layered on top of the v1 payload —
        // ownership (creatorId) is untouched. Written only when true so a
        // private import stays byte-identical to a hand-authored document.
        batch.set(doc(db, "teacher_questions", id), sat && share ? { ...payload, sharedBank: true } : payload);
      }
      await batch.commit();
      written += Math.min(BATCH_LIMIT, rows.length - start);
    }
    return written;
  };

  const runImport = async () => {
    if (!user || allOkRows.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const written = await writeToQuestionBank(allOkRows);
      setSaved(written);
      setReport(null);
      setFileName("");
      setFixedRows([]);
      setDismissedErrors(new Set());
      setRemovedOk(new Set());
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      console.error("SAT import failed:", e);
      setError(e instanceof Error ? e.message : t.failed);
    } finally {
      setSaving(false);
    }
  };

  const section = exam?.sections[sectionIdx] ?? null;

  /** The rows by difficulty, for the domain × difficulty chart. */
  const difficultyRows = useMemo<ModuleRows[]>(() => {
    const by = (names: string[]) => allOkRows.filter((r) => names.includes(r.difficulty));
    return [
      { key: "easy", label: t.chart.easy, rows: by(["beginner", "easy"]) },
      { key: "medium", label: t.chart.medium, rows: by(["medium"]) },
      { key: "hard", label: t.chart.hard, rows: by(["hard", "expert", "olympiad"]) },
    ];
  }, [allOkRows, t]);

  /** Bank tab commit: the valid rows → chunked `sat_pool` docs (no tests, no bank copies). */
  const addToBank = async () => {
    if (!user || !sat || allOkRows.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const batchId = newSatPoolBatchId();
      const items = buildSatPoolItems(allOkRows, { batchId, creatorId: user.uid, creatorName: user.displayName || "" });
      await saveSatPoolBatch(batchId, subject as SatPracticeSubject, items, {
        teacherId: user.uid,
        teacherName: user.displayName || "",
        title: fileName || "upload.json",
      });
      // The same questions, also as ordinary bank questions the teacher's SAT
      // test builder can pick (real mock exams). Separate docs — deleting the
      // practice-bank upload does not remove these.
      const bank = alsoToBank ? await writeToQuestionBank(allOkRows) : 0;
      setBanked({ pool: items.length, bank });
      setReport(null);
      setExam(null);
      setFileName("");
      setFixedRows([]);
      setDismissedErrors(new Set());
      setRemovedOk(new Set());
      if (fileRef.current) fileRef.current.value = "";
      refreshBatches();
    } catch (e) {
      console.error("SAT practice bank upload failed:", e);
      setError(t.failed);
    } finally {
      setSaving(false);
    }
  };

  const removeBatch = async (b: SatPoolBatch) => {
    if (!user || !window.confirm(t.deleteBatchConfirm(b.count))) return;
    try {
      await deleteSatPoolBatch(user.uid, b.batchId);
      setBatches((prev) => (prev ?? []).filter((x) => x.batchId !== b.batchId));
    } catch (e) {
      console.error(e);
      setError(t.failed);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 pb-16 md:p-6">
      <div className="flex items-center gap-3">
        <IconButton aria-label={t.back} onClick={() => router.push(backHref)}>
          <ArrowLeft size={18} />
        </IconButton>
        <PageHeader title={t.title} subtitle={t.subtitle} />
      </div>

      {/* ── what kind of import + subject ───────────────────────────────── */}
      <Card className="flex flex-col gap-3 p-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t.kind}</span>
        <PillGroup
          ariaLabel={t.kind}
          value={kind}
          onChange={(id) => switchKind(id as "questions" | "exam")}
          options={[
            { id: "questions", label: t.kindQuestions },
            { id: "exam", label: t.kindExam },
          ]}
          className="self-start"
        />
        <p className="flex items-start gap-1.5 text-[11.5px] font-medium text-on-surface-variant">
          {isExam ? <Layers size={13} className="mt-0.5 flex-none" /> : <FileJson size={13} className="mt-0.5 flex-none" />}
          {isExam ? t.kindExamHint : t.kindQuestionsHint}
        </p>

        <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t.subject}</span>
        <PillGroup
          ariaLabel={t.subject}
          value={subject}
          onChange={(id) => { setSubject(id); reset(); }}
          options={subjectOptions.map((s) => ({ id: s.id, label: s.name }))}
          className="self-start"
        />
      </Card>

      {/* ── a ready AI prompt, limited to this subject's taxonomy ids ───── */}
      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Sparkles size={15} className="mt-0.5 flex-none text-primary" />
            <div>
              <h2 className="text-[13px] font-black text-on-surface">{t.prompt}</h2>
              <p className="mt-0.5 text-[11.5px] font-medium text-on-surface-variant">{t.promptHint}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="text"
            icon={promptCopied ? <Check /> : <Copy />}
            onClick={() => {
              navigator.clipboard.writeText(aiPrompt);
              setPromptCopied(true);
              setTimeout(() => setPromptCopied(false), 2000);
            }}
          >
            {promptCopied ? t.copied : t.copy}
          </Button>
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-m3-sm bg-surface-container-highest p-3 text-[11px] leading-relaxed text-on-surface">
{aiPrompt}
        </pre>
      </Card>

      {/* ── the format ──────────────────────────────────────────────────── */}
      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-black text-on-surface">{t.format}</h2>
          <Button
            size="sm"
            variant="text"
            icon={copied ? <Check /> : <Copy />}
            onClick={() => {
              navigator.clipboard.writeText(example);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? t.copied : t.copy}
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-m3-sm bg-surface-container-highest p-3 text-[11px] leading-relaxed text-on-surface">
{example}
        </pre>
        <p className="text-[11px] font-medium text-on-surface-variant">
          {'"type": '}{allowedTypesFor(subject).map((x) => `"${x}"`).join(" | ")} · max {MAX_IMPORT_ROWS}
        </p>
      </Card>

      {/* ── the file ────────────────────────────────────────────────────── */}
      <Card className="flex flex-col gap-3 p-4">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button icon={<FileJson />} onClick={() => fileRef.current?.click()}>{t.pick}</Button>
        {fileName && <p className="text-[12px] font-bold text-on-surface">{fileName}</p>}

        {report?.fatal && <Banner tone="error" title={report.fatal} />}

        {/* ── questions tab, mock-shaped file: offer the exam tab ── */}
        {!isExam && looksMock && report && !report.fatal && (
          <Banner tone="info" icon={<Layers />}>
            <span className="block">{t.looksMock}</span>
            <Button
              size="sm"
              variant="tonal"
              className="mt-2"
              icon={<Layers />}
              onClick={() => { const text = lastText; setKind("exam"); ingest(text, "exam"); }}
            >
              {t.switchToMock}
            </Button>
          </Banner>
        )}

        {/* ── bank tab: which section (a file may hold Math AND R&W) + what it holds ── */}
        {isExam && exam && section && report && !report.fatal && (
          <div className="flex flex-col gap-3 rounded-m3-md border border-outline-variant p-3">
            {exam.sections.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t.examSection}</span>
                <PillGroup
                  ariaLabel={t.examSection}
                  value={String(sectionIdx)}
                  onChange={(id) => loadSection(exam, Number(id), subject)}
                  options={exam.sections.map((sec, i) => ({
                    id: String(i),
                    label: `${findSubject(sec.subject || subject)?.name ?? sec.subject} · ${sectionAllRows(sec).length}`,
                  }))}
                />
              </div>
            )}
            {sat && allOkRows.length > 0 && (
              <ModuleMixChart subject={subject} modules={difficultyRows} labels={t.chart} />
            )}
          </div>
        )}

        {report && !report.fatal && (
          <>
            {/* ── summary badges ── */}
            <div className="flex flex-wrap gap-2 text-[11.5px] font-bold">
              <span className="rounded-m3-xs bg-success-container px-2.5 py-1 text-on-success-container">
                {allOkRows.length} {t.valid}
              </span>
              {visibleErrors.length > 0 && (
                <span className="rounded-m3-xs bg-error-container px-2.5 py-1 text-on-error-container">
                  {visibleErrors.length} {t.invalid}
                </span>
              )}
              {report.duplicates > 0 && (
                <span className="rounded-m3-xs bg-surface-container-highest px-2.5 py-1 text-on-surface-variant">
                  {report.duplicates} {t.dupes}
                </span>
              )}
            </div>

            {/* ── editable rejected rows ── */}
            {visibleErrors.length > 0 && (
              <div className="rounded-m3-md border border-error/30 bg-error-container/10 p-3">
                <div className="mb-2.5 flex flex-wrap items-start gap-1.5">
                  <CircleAlert size={14} className="mt-0.5 flex-none text-error" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black text-on-surface">{t.errorsTitle}</p>
                    <p className="text-[11px] font-medium text-on-surface-variant">{t.errorsFix}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="text"
                    icon={<Trash2 />}
                    className="text-error"
                    onClick={() => {
                      if (window.confirm(t.removeAllConfirm(visibleErrors.length))) dismissAll(visibleErrors);
                    }}
                  >
                    {t.removeAll(visibleErrors.length)}
                  </Button>
                </div>

                {/* ── rows that belong to the other SAT subject: one banner ── */}
                {foreignErrors.length > 0 && (
                  <div className="mb-2.5 rounded-m3-md border border-warning bg-warning-container p-3 text-on-warning-container">
                    <p className="text-[12.5px] font-black">
                      {t.foreignTitle(foreignErrors.length, findSubject(foreignTarget)?.name ?? foreignTarget)}
                    </p>
                    <p className="mt-0.5 text-[11.5px] font-medium">{t.foreignHint}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {lastText && (
                        <Button size="sm" variant="tonal" icon={<ArrowRightLeft />} onClick={() => switchSubjectTo(foreignTarget)}>
                          {t.switchTo(findSubject(foreignTarget)?.name ?? foreignTarget)}
                        </Button>
                      )}
                      <Button size="sm" variant="text" icon={<Trash2 />} onClick={() => dismissAll(foreignErrors)}>
                        {t.removeThese}
                      </Button>
                    </div>
                  </div>
                )}
                {topicGroups.map(([topicId, group]) => (
                  <BulkTopicFix
                    key={`${subject}:${topicId}`}
                    count={group.length}
                    subject={subject}
                    fixedTopic={topicId}
                    labels={t}
                    onApply={(topic, subtopic) => applyBulkTopic(group, topic, subtopic)}
                  />
                ))}
                <ul className="flex flex-col gap-2">
                  {rowErrors.map((e) => (
                    <FixableRow
                      key={`${e.index}:${e.reason}`}
                      error={e}
                      subject={subject}
                      labels={t}
                      onFixed={handleFixed}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* ── ok preview: expand to check the answer key, ✕ to drop ── */}
            {allOkRows.length > 0 && (
              <div className="rounded-m3-md border border-outline-variant">
                <div className="flex items-baseline justify-between gap-2 border-b border-outline-variant px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t.preview}</p>
                  <p className="text-[11px] font-medium text-on-surface-variant">{t.previewCount(allOkRows.length)}</p>
                </div>
                <ul className="flex max-h-[36rem] flex-col divide-y divide-outline-variant overflow-y-auto">
                  {allOkRows.slice(0, previewLimit).map((r) => (
                    <PreviewRow key={r.index} row={r} labels={t} onRemove={removeOk} />
                  ))}
                </ul>
                {allOkRows.length > previewLimit && (
                  <div className="border-t border-outline-variant p-2 text-center">
                    <Button size="sm" variant="text" onClick={() => setPreviewLimit((n) => n + PREVIEW_PAGE)}>
                      {t.showMore(allOkRows.length - previewLimit)}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── bank tab commit: into the shared SAT practice bank ─────────── */}
      {isExam && exam && report && !report.fatal && allOkRows.length > 0 && (
        <Card className="flex flex-col gap-3 p-4">
          {!sat ? (
            <Banner tone="error" title={t.bankNeedsSat} />
          ) : (
            <>
              <p className="flex items-start gap-1.5 text-[11.5px] font-medium text-on-surface-variant">
                <AlertTriangle size={13} className="mt-0.5 flex-none" /> {t.bankNote}
              </p>

              <label className="flex items-start gap-3">
                <Switch checked={alsoToBank} onChange={(e) => setAlsoToBank(e.target.checked)} />
                <span>
                  <span className="block text-[12.5px] font-bold text-on-surface">{t.alsoToBank}</span>
                  <span className="mt-0.5 block text-[11.5px] font-medium text-on-surface-variant">{t.alsoToBankHint}</span>
                </span>
              </label>
              {alsoToBank && (
                <label className="flex items-start gap-3 pl-1">
                  <Switch checked={share} onChange={(e) => setShare(e.target.checked)} />
                  <span>
                    <span className="block text-[12.5px] font-bold text-on-surface">{t.share}</span>
                    <span className="mt-0.5 block text-[11.5px] font-medium text-on-surface-variant">{t.shareHint}</span>
                  </span>
                </label>
              )}
              {error && <Banner tone="error" title={error} />}
              <Button icon={<Layers />} loading={saving} onClick={addToBank}>
                {saving ? t.addingToBank : t.addToBank(allOkRows.length)}
              </Button>
            </>
          )}
        </Card>
      )}

      {isExam && banked !== null && (
        <Banner tone="success" title={t.bankDone(banked.pool)}>
          {banked.bank > 0 && t.bankAlsoDone(banked.bank)}
        </Banner>
      )}

      {/* ── bank tab: the teacher's own uploads, deletable ──────────────── */}
      {isExam && batches && batches.length > 0 && (
        <Card className="flex flex-col gap-2 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t.myBatches}</span>
          <ul className="flex flex-col divide-y divide-outline-variant">
            {batches.map((b) => (
              <li key={b.batchId} className="flex items-center gap-3 py-2">
                <FileJson size={16} className="flex-none text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-on-surface">{b.title}</p>
                  <p className="text-[11px] font-medium text-on-surface-variant">
                    {t.batchLine(b.count, findSubject(b.subject)?.name ?? b.subject)}
                  </p>
                </div>
                <Button size="sm" variant="text" icon={<Trash2 />} className="text-error" onClick={() => removeBatch(b)}>
                  {t.deleteBatch}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── share + commit ──────────────────────────────────────────────── */}
      {!isExam && report && !report.fatal && allOkRows.length > 0 && (
        <Card className="flex flex-col gap-3 p-4">
          {sat && (
            <label className="flex items-start gap-3">
              <Switch checked={share} onChange={(e) => setShare(e.target.checked)} />
              <span>
                <span className="block text-[12.5px] font-bold text-on-surface">{t.share}</span>
                <span className="mt-0.5 block text-[11.5px] font-medium text-on-surface-variant">{t.shareHint}</span>
              </span>
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-bold text-on-surface">{t.tags}</span>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="sat-2024, practice-test-1"
              className="rounded-m3-sm border border-outline-variant bg-surface-container-highest px-2.5 py-1.5 text-[12px] font-medium text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/25"
            />
            <span className="text-[11.5px] font-medium text-on-surface-variant">{t.tagsHint}</span>
          </label>

          <p className="flex items-start gap-1.5 text-[11px] font-medium text-on-surface-variant">
            <AlertTriangle size={13} className="mt-0.5 flex-none" /> {t.reviewNote}
          </p>

          {error && <Banner tone="error" title={error} />}

          <Button icon={<Upload />} loading={saving} onClick={runImport}>
            {saving ? t.importing : t.importBtn(allOkRows.length)}
          </Button>
        </Card>
      )}

      {saved !== null && <Banner tone="success" title={t.done(saved)} />}
    </div>
  );
}
