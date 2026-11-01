"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BarChart3, BookOpenText, Check, Copy, FileJson, KeyRound, Layers, Library, Pencil, Plus, Shuffle, Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import { useTeacherLanguage } from "@/app/teacher/layout";
import { useAuth } from "@/lib/AuthContext";
import { SAT_RW_TAXONOMY_SLUG } from "@/lib/SatMathQuiz";
import {
  deleteSatEnglishTest, listMySatEnglishTests, setSatEnglishTestStatus,
  listSharedSatEnglishMocks, newSatEnglishTestId, reserveSatEnglishCode, saveSatEnglishTest,
} from "@/services/satEnglishQuizService";
import {
  Banner, Button, Card, ConfirmDialog, EmptyState, IconButton, PageHeader, Skeleton,
  StatusChip, cn,
} from "@/components/ui";
import type { SatMathTest, SatMathTestStatus } from "@/types/SatQuiz";
import StudentMocks from "../_components/StudentMocks";

/**
 * The teacher's own SAT English tests: code, status, edit, results, delete.
 * Contract: docs/SAT_QUIZ.md. Sibling of app/teacher/sat/math/page.tsx.
 */

const TR: Record<string, Record<string, string>> = {
  uz: {
    back: "Orqaga",
    title: "SAT Ingliz tili",
    subtitle: "Testlaringiz. O'quvchi 6 xonali maxfiy kod bilan ochadi.",
    create: "Yangi test",
    // Moved here from the SAT hub (banner + card hint + import card).
    importJson: "JSON import",
    infoModules: "2 modulli adaptiv test",
    infoAdaptive: "Modul 2 (Oson/Qiyin) Modul 1 natijasiga qarab",
    infoBank: "O'z bazangizdan yoki yangi savollar",
    infoCode: "6 xonali maxfiy kod",
    emptyTitle: "Hali test yaratilmagan",
    emptyDesc: "Har uchala modulni — Modul 1, Modul 2 Oson, Modul 2 Qiyin — platforma bazasidan yoki o'zingiznikilardan to'ldiring.",
    draft: "Qoralama", published: "Faol", closed: "Yopilgan",
    module1: "Modul 1", module2E: "M2 Oson", module2H: "M2 Qiyin",
    minutes: "daqiqa",
    codeCopied: "Kod nusxalandi",
    publish: "Faollashtirish", close: "Yopish", reopen: "Qayta ochish",
    edit: "Tahrirlash", results: "Natijalar", del: "O'chirish",
    delTitle: "Testni o'chirasizmi?",
    delBody: "Test butunlay o'chiriladi va uning kodi ishlamay qoladi. O'quvchilarning saqlangan natijalari qoladi.",
    cancel: "Bekor qilish",
    shortToPublish: "Faollashtirish uchun har uchala modulda kamida bitta savol bo'lishi kerak.",
    statusFailed: "Holatni o'zgartirib bo'lmadi",
    delFailed: "O'chirib bo'lmadi",
    loadFailed: "Testlarni yuklab bo'lmadi",
  },
  ru: {
    back: "Назад",
    title: "SAT Английский",
    subtitle: "Ваши тесты. Ученик открывает 6-значным секретным кодом.",
    create: "Новый тест",
    importJson: "Импорт JSON",
    infoModules: "Адаптивный тест из 2 модулей",
    infoAdaptive: "Модуль 2 (Лёгкий/Трудный) — по итогам Модуля 1",
    infoBank: "Из своей базы или новые вопросы",
    infoCode: "6-значный секретный код",
    emptyTitle: "Тестов пока нет",
    emptyDesc: "Заполните все три модуля — Модуль 1, Модуль 2 Лёгкий, Модуль 2 Трудный — из платформенной базы или своими вопросами.",
    draft: "Черновик", published: "Активен", closed: "Закрыт",
    module1: "Модуль 1", module2E: "М2 Лёгкий", module2H: "М2 Трудный",
    minutes: "минут",
    codeCopied: "Код скопирован",
    publish: "Активировать", close: "Закрыть", reopen: "Открыть снова",
    edit: "Редактировать", results: "Результаты", del: "Удалить",
    delTitle: "Удалить тест?",
    delBody: "Тест будет удалён, его код перестанет работать. Сохранённые результаты учеников останутся.",
    cancel: "Отмена",
    shortToPublish: "Для активации в каждом из трёх модулей должен быть хотя бы один вопрос.",
    statusFailed: "Не удалось изменить статус",
    delFailed: "Не удалось удалить",
    loadFailed: "Не удалось загрузить тесты",
  },
  en: {
    back: "Back",
    title: "SAT English",
    subtitle: "Your tests. Students open one with a private 6-digit code.",
    create: "New test",
    importJson: "JSON import",
    infoModules: "2-module adaptive test",
    infoAdaptive: "Module 2 (Easier/Harder) from the Module 1 result",
    infoBank: "From your own bank or new questions",
    infoCode: "Private 6-digit code",
    emptyTitle: "No tests yet",
    emptyDesc: "Fill all three modules — Module 1, Module 2 Easier, Module 2 Harder — from the platform bank or your own questions.",
    draft: "Draft", published: "Live", closed: "Closed",
    module1: "Module 1", module2E: "M2 Easier", module2H: "M2 Harder",
    minutes: "minutes",
    codeCopied: "Code copied",
    publish: "Publish", close: "Close", reopen: "Reopen",
    edit: "Edit", results: "Results", del: "Delete",
    delTitle: "Delete this test?",
    delBody: "The test is removed and its code stops working. Students' saved results are kept.",
    cancel: "Cancel",
    shortToPublish: "Publishing needs at least one question in each of the three modules.",
    statusFailed: "Could not change the status",
    delFailed: "Could not delete",
    loadFailed: "Could not load your tests",
  },
};

const STATUS_TONE: Record<SatMathTestStatus, "success" | "warning" | "muted"> = {
  published: "success",
  draft: "warning",
  closed: "muted",
};

export default function SatEnglishTestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = TR[lang] || TR.uz;

  const [tests, setTests] = useState<SatMathTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SatMathTest | null>(null);

  const base = "/teacher/sat/english";

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setTests(await listMySatEnglishTests(user.uid));
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

  const changeStatus = async (test: SatMathTest, status: SatMathTestStatus) => {
    if (status === "published" && (!test.module1.length || !test.module2Easier.length || !test.module2Harder.length)) {
      toast.error(t.shortToPublish);
      return;
    }
    try {
      await setSatEnglishTestStatus(test.id, status);
      // Patch in place rather than re-reading: the list read whole documents
      // with their embedded question arrays, and a refetch would pay for all.
      setTests((prev) => prev.map((x) => (x.id === test.id ? { ...x, status } : x)));
    } catch (err) {
      console.error(err);
      toast.error(t.statusFailed);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSatEnglishTest(pendingDelete.id);
      setTests((prev) => prev.filter((x) => x.id !== pendingDelete.id));
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
          <IconButton aria-label={t.back} size="sm" onClick={() => router.push("/teacher/sat")}>
            <ArrowLeft />
          </IconButton>
          <PageHeader
            className="flex-1"
            title={t.title}
            subtitle={t.subtitle}
            actions={
              <div className="flex flex-wrap gap-2">
                {/* Bulk-add questions to this section's bank (was a card on the SAT hub). */}
                <Button
                  variant="tonal"
                  icon={<FileJson />}
                  onClick={() => router.push(`/teacher/create/import?subject=${SAT_RW_TAXONOMY_SLUG}&back=${base}`)}
                >
                  {t.importJson}
                </Button>
                <Button icon={<Plus />} onClick={() => router.push(`${base}/build`)}>
                  {t.create}
                </Button>
              </div>
            }
          />
        </div>

        {/* Test facts (moved here from the SAT hub). */}
        <div className="flex flex-wrap gap-2">
          <span className="t-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant"><Layers size={14} /> {t.infoModules}</span>
          <span className="t-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant"><Shuffle size={14} /> {t.infoAdaptive}</span>
          <span className="t-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant"><Library size={14} /> {t.infoBank}</span>
          <span className="t-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant"><KeyRound size={14} /> {t.infoCode}</span>
        </div>

        {error && <Banner tone="error" title={error} />}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-m3-lg" />)}
          </div>
        ) : tests.length === 0 ? (
          <EmptyState
            icon={<BookOpenText />}
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
            {tests.map((test) => {
              const complete = test.module1.length > 0 && test.module2Easier.length > 0 && test.module2Harder.length > 0;
              return (
                <Card key={test.id} className="p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-[15px] font-bold text-on-surface">{test.title || "—"}</h2>
                        <StatusChip tone={STATUS_TONE[test.status]}>{t[test.status]}</StatusChip>
                      </div>
                      <p className="text-[12px] font-medium text-on-surface-variant">
                        <span className={cn(!complete && "text-warning")}>
                          {t.module1} {test.module1.length} · {t.module2E} {test.module2Easier.length} · {t.module2H} {test.module2Harder.length}
                        </span>{" "}
                        · {test.module1Minutes + test.module2Minutes} {t.minutes}
                      </p>
                    </div>

                    <button
                      onClick={() => copyCode(test.accessCode)}
                      className="flex flex-none items-center gap-2 rounded-m3-md border border-outline-variant bg-surface-container px-3 py-2 transition-colors hover:bg-surface-container-high"
                    >
                      <KeyRound size={14} className="text-primary" />
                      <span className="text-[18px] font-black tracking-[0.2em] text-on-surface">{test.accessCode}</span>
                      {copied === test.accessCode
                        ? <Check size={14} className="text-success" />
                        : <Copy size={14} className="text-on-surface-variant" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
                    {test.status !== "published" ? (
                      <Button size="sm" variant="tonal" onClick={() => changeStatus(test, "published")}>
                        {test.status === "closed" ? t.reopen : t.publish}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outlined" onClick={() => changeStatus(test, "closed")}>
                        {t.close}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outlined"
                      icon={<BarChart3 />}
                      onClick={() => router.push(`${base}/results/${test.id}`)}
                    >
                      {t.results}
                    </Button>

                    <Button
                      size="sm"
                      variant="text"
                      icon={<Pencil />}
                      onClick={() => router.push(`${base}/build?id=${test.id}`)}
                    >
                      {t.edit}
                    </Button>

                    <Button
                      size="sm"
                      variant="danger-text"
                      className="ml-auto"
                      icon={<Trash2 />}
                      onClick={() => setPendingDelete(test)}
                    >
                      {t.del}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Mocks students generated — copy one to give it to your class by code. */}
        {!loading && (
          <StudentMocks
            mine={tests}
            listShared={listSharedSatEnglishMocks}
            reserveCode={reserveSatEnglishCode}
            newTestId={newSatEnglishTestId}
            save={saveSatEnglishTest}
            onCopied={load}
          />
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
