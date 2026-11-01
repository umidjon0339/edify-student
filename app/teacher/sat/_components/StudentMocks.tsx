"use client";

import { useEffect, useState } from "react";
import { Copy, Users } from "lucide-react";
import toast from "react-hot-toast";

import { useTeacherLanguage } from "@/app/teacher/layout";
import { useAuth } from "@/lib/AuthContext";
import { Button, Card, Skeleton, StatusChip } from "@/components/ui";
import type { SatMathTest, SatMathTestDraft } from "@/types/SatQuiz";

/**
 * "Student mocks" — every mock a student generated on their SAT page
 * (`practice: true`, docs/SAT_QUIZ.md §Student mocks), shared with teachers.
 *
 * "Copy to my tests" writes a NEW teacher-owned test (fresh id, reserved
 * 6-digit code, published) with the mock's three module arrays — the student's
 * doc is never touched (rules: only its owner may write it). The teacher's
 * students then open it by code and the results land on the teacher's normal
 * results page. `sourceMockId` marks the copy so the list shows it as copied.
 * Used by both `/teacher/sat/math` and `/teacher/sat/english`.
 */

const TR: Record<string, Record<string, string>> = {
  uz: {
    title: "O'quvchilar yaratgan mocklar",
    hint: "Nusxa oling — o'quvchilaringiz kod bilan ishlaydi, natijalar sizda.",
    questions: "savol",
    copy: "Testlarimga nusxa",
    copied: "Nusxa olindi",
    inMine: "Testlaringizda",
    done: "Nusxa olindi — kod",
    failed: "Nusxa olib bo'lmadi",
    empty: "Hali mock yo'q",
  },
  ru: {
    title: "Моки учеников",
    hint: "Скопируйте — ваши ученики откроют по коду, результаты у вас.",
    questions: "вопросов",
    copy: "Копировать в мои тесты",
    copied: "Скопировано",
    inMine: "В ваших тестах",
    done: "Скопировано — код",
    failed: "Не удалось скопировать",
    empty: "Моков пока нет",
  },
  en: {
    title: "Student mocks",
    hint: "Copy one — your students open it by code, results come to you.",
    questions: "questions",
    copy: "Copy to my tests",
    copied: "Copied",
    inMine: "In your tests",
    done: "Copied — code",
    failed: "Could not copy",
    empty: "No mocks yet",
  },
};

const millis = (v: unknown) =>
  v && typeof (v as { toMillis?: () => number }).toMillis === "function" ? (v as { toMillis: () => number }).toMillis() : 0;

export default function StudentMocks({
  mine, listShared, reserveCode, newTestId, save, onCopied,
}: {
  /** The teacher's own tests — to mark mocks already copied. */
  mine: SatMathTest[];
  listShared: (max?: number) => Promise<SatMathTest[]>;
  reserveCode: () => Promise<string>;
  newTestId: () => string;
  save: (id: string, draft: SatMathTestDraft) => Promise<void>;
  /** Called after the copy is written — the page reloads its own list. */
  onCopied: () => void;
}) {
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = TR[lang] || TR.uz;

  const [mocks, setMocks] = useState<SatMathTest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listShared(20)
      .then((rows) => { if (!cancelled) setMocks(rows); })
      .catch((err) => {
        console.warn(err);
        if (!cancelled) setMocks([]);
      });
    return () => { cancelled = true; };
  }, [listShared]);

  const copied = new Set(mine.map((x) => x.sourceMockId).filter(Boolean));

  async function copy(mock: SatMathTest) {
    if (!user) return;
    setBusy(mock.id);
    try {
      const code = await reserveCode();
      const draft: SatMathTestDraft = {
        title: mock.title,
        description: "",
        teacherId: user.uid,
        teacherName: user.displayName || "",
        accessCode: code,
        module1: mock.module1,
        module2Easier: mock.module2Easier,
        module2Harder: mock.module2Harder,
        module1Minutes: mock.module1Minutes,
        module2Minutes: mock.module2Minutes,
        routingThreshold: mock.routingThreshold,
        shuffle: false,
        showAnswers: true,
        status: "published",
        sourceMockId: mock.id,
      };
      await save(newTestId(), draft);
      toast.success(`${t.done} ${code}`);
      onCopied();
    } catch (err) {
      console.error(err);
      toast.error(t.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-on-surface">
          <Users size={18} /> {t.title}
          {mocks && <span className="text-[13px] font-semibold text-on-surface-variant">{mocks.length}</span>}
        </h2>
        <p className="text-[12px] font-medium text-on-surface-variant">{t.hint}</p>
      </div>

      {!mocks ? (
        <Skeleton className="h-20 w-full rounded-m3-lg" />
      ) : mocks.length === 0 ? (
        <p className="text-[13px] font-medium text-on-surface-variant">{t.empty}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {mocks.map((mock) => {
            const created = millis(mock.createdAt);
            const isCopied = copied.has(mock.id);
            return (
              <Card key={mock.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-on-surface">{mock.title || "—"}</p>
                  <p className="text-[11.5px] font-medium text-on-surface-variant">
                    {mock.module1.length + mock.module2Easier.length} {t.questions}
                    {created > 0 && <> · {new Date(created).toLocaleDateString()}</>}
                  </p>
                </div>
                {isCopied ? (
                  <StatusChip tone="success">{t.inMine}</StatusChip>
                ) : (
                  <Button
                    size="sm"
                    variant="tonal"
                    icon={<Copy />}
                    loading={busy === mock.id}
                    disabled={busy !== null}
                    onClick={() => copy(mock)}
                  >
                    {t.copy}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
