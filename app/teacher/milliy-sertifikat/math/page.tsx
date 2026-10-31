"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BarChart3, Check, Copy, KeyRound, ListChecks, Pencil, Plus, Target, Trash2, Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { useTeacherLanguage } from "@/app/teacher/layout";
import { useAuth } from "@/lib/AuthContext";
import { deleteQuiz, listMyQuizzes, setQuizStatus } from "@/services/teacherRaschQuizService";
import { RASCH_QUIZ_TOTAL } from "@/lib/RASCHquiz";
import {
  Banner, Button, Card, ConfirmDialog, EmptyState, IconButton, PageHeader, Skeleton, StatusChip, cn,
} from "@/components/ui";
import type { RaschQuizStatus, TeacherRaschQuiz } from "@/types/TeacherRaschQuiz";

/**
 * The teacher's Rasch papers.
 *
 * A paper is `draft` while it is being built, `published` once its 6-digit code
 * opens it for students, and `closed` when the teacher stops accepting answers.
 * Only `published` is reachable by code — see docs/RASCH_QUIZ.md.
 */

const TR: Record<string, Record<string, string>> = {
  uz: {
    back: "Orqaga",
    title: "Rasch testlari",
    // Details moved here from the Milliy sertifikat hub card.
    infoProtocol: `DTM protokoli · ${RASCH_QUIZ_TOTAL} ta savol (Y-1, Y-2, O)`,
    infoScored: "Natija darhol hisoblanadi",
    infoCode: "6 xonali maxfiy kod",
    subtitle: `Har biri ${RASCH_QUIZ_TOTAL} ta savoldan iborat variant. O'quvchi 6 xonali maxfiy kod bilan ochadi.`,
    create: "Yangi test",
    loading: "Yuklanmoqda…",
    emptyTitle: "Hali test yaratilmagan",
    emptyDesc: `Savollarni bazadan tanlab yoki o'zingiz yozib, ${RASCH_QUIZ_TOTAL} ta savollik variant tuzing.`,
    draft: "Qoralama", published: "Faol", closed: "Yopilgan",
    questions: "savol",
    minutes: "daqiqa",
    code: "Kirish kodi",
    codeCopied: "Kod nusxalandi",
    publish: "Faollashtirish",
    close: "Yopish",
    reopen: "Qayta ochish",
    edit: "Tahrirlash",
    results: "Natijalar",
    del: "O'chirish",
    delTitle: "Testni o'chirasizmi?",
    delBody: "Test butunlay o'chiriladi va uning kodi ishlamay qoladi. O'quvchilarning saqlangan natijalari qoladi.",
    cancel: "Bekor qilish",
    shortToPublish: `Faollashtirish uchun aynan ${RASCH_QUIZ_TOTAL} ta savol kerak.`,
    statusFailed: "Holatni o'zgartirib bo'lmadi",
    delFailed: "O'chirib bo'lmadi",
    loadFailed: "Testlarni yuklab bo'lmadi",
  },
  ru: {
    back: "Назад",
    title: "Тесты Rasch",
    infoProtocol: `Протокол DTM · ${RASCH_QUIZ_TOTAL} вопросов (Y-1, Y-2, O)`,
    infoScored: "Результат считается сразу",
    infoCode: "6-значный секретный код",
    subtitle: `Вариант из ${RASCH_QUIZ_TOTAL} вопросов. Ученик открывает его 6-значным секретным кодом.`,
    create: "Новый тест",
    loading: "Загрузка…",
    emptyTitle: "Тестов пока нет",
    emptyDesc: `Соберите вариант из ${RASCH_QUIZ_TOTAL} вопросов — выберите из базы или напишите свои.`,
    draft: "Черновик", published: "Активен", closed: "Закрыт",
    questions: "вопросов",
    minutes: "минут",
    code: "Код доступа",
    codeCopied: "Код скопирован",
    publish: "Активировать",
    close: "Закрыть",
    reopen: "Открыть снова",
    edit: "Редактировать",
    results: "Результаты",
    del: "Удалить",
    delTitle: "Удалить тест?",
    delBody: "Тест будет удалён, его код перестанет работать. Сохранённые результаты учеников останутся.",
    cancel: "Отмена",
    shortToPublish: `Для активации нужно ровно ${RASCH_QUIZ_TOTAL} вопросов.`,
    statusFailed: "Не удалось изменить статус",
    delFailed: "Не удалось удалить",
    loadFailed: "Не удалось загрузить тесты",
  },
  en: {
    back: "Back",
    title: "Rasch tests",
    infoProtocol: `DTM protocol · ${RASCH_QUIZ_TOTAL} questions (Y-1, Y-2, O)`,
    infoScored: "Scored immediately",
    infoCode: "Private 6-digit code",
    subtitle: `A ${RASCH_QUIZ_TOTAL}-question paper. Students open it with a private 6-digit code.`,
    create: "New test",
    loading: "Loading…",
    emptyTitle: "No tests yet",
    emptyDesc: `Build a ${RASCH_QUIZ_TOTAL}-question paper — pick questions from the banks or write your own.`,
    draft: "Draft", published: "Live", closed: "Closed",
    questions: "questions",
    minutes: "minutes",
    code: "Access code",
    codeCopied: "Code copied",
    publish: "Publish",
    close: "Close",
    reopen: "Reopen",
    edit: "Edit",
    results: "Results",
    del: "Delete",
    delTitle: "Delete this test?",
    delBody: "The test is removed and its code stops working. Students' saved results are kept.",
    cancel: "Cancel",
    shortToPublish: `Publishing needs exactly ${RASCH_QUIZ_TOTAL} questions.`,
    statusFailed: "Could not change the status",
    delFailed: "Could not delete",
    loadFailed: "Could not load your tests",
  },
};

const STATUS_TONE: Record<RaschQuizStatus, "success" | "warning" | "muted"> = {
  published: "success",
  draft: "warning",
  closed: "muted",
};

export default function RaschQuizHubPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = TR[lang] || TR.uz;

  const [quizzes, setQuizzes] = useState<TeacherRaschQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TeacherRaschQuiz | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setQuizzes(await listMyQuizzes(user.uid));
    } catch (err) {
      console.error(err);
      setError(t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [user, t.loadFailed]);

  useEffect(() => { load(); }, [load]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(t.codeCopied);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard is permission-gated in some browsers; the code is on screen
      // anyway, so a failure is not worth an error toast.
    }
  };

  const changeStatus = async (quiz: TeacherRaschQuiz, status: RaschQuizStatus) => {
    if (status === "published" && quiz.questionCount !== RASCH_QUIZ_TOTAL) {
      toast.error(t.shortToPublish);
      return;
    }
    try {
      await setQuizStatus(quiz.id, status);
      // Patch in place rather than re-reading: the list read whole 45-question
      // documents, and a refetch would pay for all of them again.
      setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, status } : q)));
    } catch (err) {
      console.error(err);
      toast.error(t.statusFailed);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteQuiz(pendingDelete.id);
      setQuizzes((prev) => prev.filter((q) => q.id !== pendingDelete.id));
    } catch (err) {
      console.error(err);
      toast.error(t.delFailed);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-surface pb-24">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
        <div className="flex items-center gap-2">
          <IconButton aria-label={t.back} size="sm" onClick={() => router.push("/teacher/milliy-sertifikat")}>
            <ArrowLeft />
          </IconButton>
          <PageHeader
            className="flex-1"
            title={t.title}
            subtitle={t.subtitle}
            actions={
              <Button icon={<Plus />} onClick={() => router.push("/teacher/milliy-sertifikat/math/build")}>
                {t.create}
              </Button>
            }
          />
        </div>

        {/* Paper facts (moved here from the hub card). */}
        <div className="flex flex-wrap gap-2">
          <span className="t-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant"><ListChecks size={14} /> {t.infoProtocol}</span>
          <span className="t-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant"><KeyRound size={14} /> {t.infoCode}</span>
          <span className="t-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant"><Zap size={14} /> {t.infoScored}</span>
        </div>

        {error && <Banner tone="error" title={error} />}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-m3-lg" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <EmptyState
            icon={<Target />}
            title={t.emptyTitle}
            description={t.emptyDesc}
            action={
              <Button icon={<Plus />} onClick={() => router.push("/teacher/milliy-sertifikat/math/build")}>
                {t.create}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-[15px] font-bold text-on-surface">{quiz.title || "—"}</h2>
                      <StatusChip tone={STATUS_TONE[quiz.status]}>{t[quiz.status]}</StatusChip>
                    </div>
                    <p className="text-[12px] font-medium text-on-surface-variant">
                      <span className={cn(quiz.questionCount !== RASCH_QUIZ_TOTAL && "text-warning")}>
                        {quiz.questionCount}/{RASCH_QUIZ_TOTAL}
                      </span>{" "}
                      {t.questions} · {quiz.durationMinutes} {t.minutes}
                    </p>
                  </div>

                  {/* The code IS the feature — it is the biggest thing on the card
                      and one tap copies it, because a teacher reads it out or
                      pastes it into a chat within seconds of publishing. */}
                  <button
                    onClick={() => copyCode(quiz.accessCode)}
                    className="flex flex-none items-center gap-2 rounded-m3-md border border-outline-variant bg-surface-container px-3 py-2 transition-colors hover:bg-surface-container-high"
                  >
                    <KeyRound size={14} className="text-primary" />
                    <span className="text-[18px] font-black tracking-[0.2em] text-on-surface">{quiz.accessCode}</span>
                    {copied === quiz.accessCode
                      ? <Check size={14} className="text-success" />
                      : <Copy size={14} className="text-on-surface-variant" />}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
                  {quiz.status !== "published" ? (
                    <Button
                      size="sm"
                      variant="tonal"
                      onClick={() => changeStatus(quiz, "published")}
                    >
                      {quiz.status === "closed" ? t.reopen : t.publish}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outlined" onClick={() => changeStatus(quiz, "closed")}>
                      {t.close}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outlined"
                    icon={<BarChart3 />}
                    onClick={() => router.push(`/teacher/milliy-sertifikat/math/results/${quiz.id}`)}
                  >
                    {t.results}
                  </Button>

                  <Button
                    size="sm"
                    variant="text"
                    icon={<Pencil />}
                    onClick={() => router.push(`/teacher/milliy-sertifikat/math/build?id=${quiz.id}`)}
                  >
                    {t.edit}
                  </Button>

                  <Button
                    size="sm"
                    variant="danger-text"
                    className="ml-auto"
                    icon={<Trash2 />}
                    onClick={() => setPendingDelete(quiz)}
                  >
                    {t.del}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t.delTitle}
        description={t.delBody}
        confirmText={t.del}
        cancelText={t.cancel}
        danger
      />
    </div>
  );
}
