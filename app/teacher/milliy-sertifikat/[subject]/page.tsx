"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, BadgeCheck, BarChart3, Check, Copy, FileJson, KeyRound, Library, Pencil, Plus, Ruler, Trash2, Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { useTeacherLanguage } from "@/app/teacher/layout";
import { useAuth } from "@/lib/AuthContext";
import { genericSubject, subjectName } from "@/lib/MilliyQuiz";
import {
  deleteMilliyQuiz, listMyMilliyQuizzes, setMilliyQuizStatus,
} from "@/services/milliyQuizService";
import {
  Banner, Button, Card, ConfirmDialog, EmptyState, IconButton, PageHeader, Skeleton,
  StatusChip, cn,
} from "@/components/ui";
import type { MilliyQuiz, MilliyQuizStatus } from "@/types/MilliyQuiz";
import type { Lang } from "@/types/Math";

/**
 * One Milliy sertifikat subject's papers (biology today). Generic over the
 * `[subject]` segment — everything subject-specific comes from `MILLIY_SUBJECTS`.
 *
 * A paper is `draft` while being built, `published` once its 6-digit code opens
 * it for students, and `closed` when the teacher stops accepting answers. Only
 * `published` is reachable by code. Contract: docs/MILLIY_QUIZ.md.
 */

const TR: Record<string, Record<string, string>> = {
  uz: {
    back: "Orqaga",
    subtitle: "Variantlaringiz. O'quvchi 6 xonali maxfiy kod bilan ochadi.",
    // Details moved here from the Milliy sertifikat hub card.
    infoBank: "Savollar o'z bazangizdan",
    infoLength: "Uzunligini o'zingiz belgilaysiz",
    infoScored: "Natija darhol hisoblanadi",
    infoCode: "6 xonali maxfiy kod",
    create: "Yangi variant",
    emptyTitle: "Hali variant yaratilmagan",
    emptyDesc: "Savollarni o'z bazangizdan tanlab, variant tuzing. Savol yozish uchun savollar bazasidan foydalanasiz.",
    draft: "Qoralama", published: "Faol", closed: "Yopilgan",
    questions: "savol", minutes: "daqiqa",
    codeCopied: "Kod nusxalandi",
    publish: "Faollashtirish", close: "Yopish", reopen: "Qayta ochish",
    edit: "Tahrirlash", results: "Natijalar", del: "O'chirish",
    delTitle: "Variantni o'chirasizmi?",
    delBody: "Variant butunlay o'chiriladi va uning kodi ishlamay qoladi. O'quvchilarning saqlangan natijalari qoladi.",
    cancel: "Bekor qilish",
    shortToPublish: "Faollashtirish uchun variant to'liq bo'lishi kerak.",
    statusFailed: "Holatni o'zgartirib bo'lmadi",
    delFailed: "O'chirib bo'lmadi",
    loadFailed: "Variantlarni yuklab bo'lmadi",
    unknownTitle: "Bu fan hali tayyor emas",
    unknownDesc: "Bu fan uchun variant tuzuvchi hali qo'shilmagan.",
    toHub: "Fanlar ro'yxati",
    importJson: "JSON import",
  },
  ru: {
    back: "Назад",
    subtitle: "Ваши варианты. Ученик открывает 6-значным секретным кодом.",
    infoBank: "Вопросы из вашей базы",
    infoLength: "Длину задаёте сами",
    infoScored: "Результат считается сразу",
    infoCode: "6-значный секретный код",
    create: "Новый вариант",
    emptyTitle: "Вариантов пока нет",
    emptyDesc: "Соберите вариант из вопросов своей базы. Новые вопросы создаются в базе вопросов.",
    draft: "Черновик", published: "Активен", closed: "Закрыт",
    questions: "вопросов", minutes: "минут",
    codeCopied: "Код скопирован",
    publish: "Активировать", close: "Закрыть", reopen: "Открыть снова",
    edit: "Редактировать", results: "Результаты", del: "Удалить",
    delTitle: "Удалить вариант?",
    delBody: "Вариант будет удалён, его код перестанет работать. Сохранённые результаты учеников останутся.",
    cancel: "Отмена",
    shortToPublish: "Для активации вариант должен быть заполнен.",
    statusFailed: "Не удалось изменить статус",
    delFailed: "Не удалось удалить",
    loadFailed: "Не удалось загрузить варианты",
    unknownTitle: "Этот предмет пока не готов",
    unknownDesc: "Конструктор варианта для этого предмета пока не добавлен.",
    toHub: "Список предметов",
    importJson: "Импорт JSON",
  },
  en: {
    back: "Back",
    subtitle: "Your papers. Students open one with a private 6-digit code.",
    infoBank: "Questions from your own bank",
    infoLength: "You set the length",
    infoScored: "Scored immediately",
    infoCode: "Private 6-digit code",
    create: "New paper",
    emptyTitle: "No papers yet",
    emptyDesc: "Build a paper from your own question bank. New questions are written in the question bank.",
    draft: "Draft", published: "Live", closed: "Closed",
    questions: "questions", minutes: "minutes",
    codeCopied: "Code copied",
    publish: "Publish", close: "Close", reopen: "Reopen",
    edit: "Edit", results: "Results", del: "Delete",
    delTitle: "Delete this paper?",
    delBody: "The paper is removed and its code stops working. Students' saved results are kept.",
    cancel: "Cancel",
    shortToPublish: "Publishing needs the paper to be complete.",
    statusFailed: "Could not change the status",
    delFailed: "Could not delete",
    loadFailed: "Could not load your papers",
    unknownTitle: "This subject is not built yet",
    unknownDesc: "There is no paper builder for this subject yet.",
    toHub: "All subjects",
    importJson: "JSON import",
  },
};

const STATUS_TONE: Record<MilliyQuizStatus, "success" | "warning" | "muted"> = {
  published: "success",
  draft: "warning",
  closed: "muted",
};

export default function MilliySubjectPapersPage() {
  const router = useRouter();
  const params = useParams<{ subject: string }>();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = TR[lang] || TR.uz;
  const L = (lang === "ru" || lang === "en" ? lang : "uz") as Lang;

  // ⚠️ `genericSubject` refuses `math` as well as an unknown segment: the maths
  // paper lives in the Rasch subsystem, and a second empty builder pointed at
  // the wrong collection is exactly the confusion this guard prevents.
  const subject = genericSubject(params.subject);

  const [quizzes, setQuizzes] = useState<MilliyQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MilliyQuiz | null>(null);

  const base = `/teacher/milliy-sertifikat/${params.subject}`;

  const load = useCallback(async () => {
    if (!user || !subject) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setQuizzes(await listMyMilliyQuizzes(user.uid, subject.id as MilliyQuiz["subject"]));
    } catch (err) {
      console.error(err);
      setError(t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [user, subject, t.loadFailed]);

  useEffect(() => { load(); }, [load]);

  if (!subject) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          icon={<BadgeCheck />}
          title={t.unknownTitle}
          description={t.unknownDesc}
          action={
            <Button onClick={() => router.push("/teacher/milliy-sertifikat")}>{t.toHub}</Button>
          }
        />
      </div>
    );
  }

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

  const changeStatus = async (quiz: MilliyQuiz, status: MilliyQuizStatus) => {
    // The same gate the builder applies, re-checked here: this button can publish
    // a paper without reopening it.
    if (status === "published" && quiz.questionCount !== quiz.questionTarget) {
      toast.error(t.shortToPublish);
      return;
    }
    try {
      await setMilliyQuizStatus(quiz.id, status);
      // Patch in place rather than re-reading: the list read whole documents with
      // their embedded question arrays, and a refetch would pay for all of them.
      setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, status } : q)));
    } catch (err) {
      console.error(err);
      toast.error(t.statusFailed);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMilliyQuiz(pendingDelete.id);
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
            title={subjectName(subject, L)}
            subtitle={t.subtitle}
            actions={
              <div className="flex flex-wrap gap-2">
                {/* Bulk-add questions to this subject's bank (the builder's only pool). */}
                {subject.taxonomySlug && (
                  <Button
                    variant="tonal"
                    icon={<FileJson />}
                    onClick={() => router.push(`/teacher/create/import?subject=${subject.taxonomySlug}&back=${base}`)}
                  >
                    {t.importJson}
                  </Button>
                )}
                <Button icon={<Plus />} onClick={() => router.push(`${base}/build`)}>
                  {t.create}
                </Button>
              </div>
            }
          />
        </div>

        {/* Paper facts (moved here from the hub card). */}
        <div className="flex flex-wrap gap-2">
          <span className="t-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant"><Library size={14} /> {t.infoBank}</span>
          <span className="t-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant"><Ruler size={14} /> {t.infoLength}</span>
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
            icon={<BadgeCheck />}
            title={t.emptyTitle}
            description={t.emptyDesc}
            action={
              <Button icon={<Plus />} onClick={() => router.push(`${base}/build`)}>
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
                      <span className={cn(quiz.questionCount !== quiz.questionTarget && "text-warning")}>
                        {quiz.questionCount}/{quiz.questionTarget}
                      </span>{" "}
                      {t.questions} · {quiz.durationMinutes} {t.minutes}
                    </p>
                  </div>

                  {/* The code IS the feature — biggest thing on the card, one tap
                      copies it, because a teacher reads it out or pastes it into a
                      chat within seconds of publishing. */}
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
                    <Button size="sm" variant="tonal" onClick={() => changeStatus(quiz, "published")}>
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
                    onClick={() => router.push(`${base}/results/${quiz.id}`)}
                  >
                    {t.results}
                  </Button>

                  <Button
                    size="sm"
                    variant="text"
                    icon={<Pencil />}
                    onClick={() => router.push(`${base}/build?id=${quiz.id}`)}
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
