"use client";

/**
 * MY MISTAKES — the student's own bucket of questions they got wrong or left
 * blank, with a "practise 5 similar" set per mistake. Contract: docs/MISTAKES.md.
 *
 * Filled automatically when a SAT, Milliy sertifikat or Rasch paper is
 * submitted (`recordMistakes`); nothing here writes a mistake, it only reads,
 * resolves and deletes them.
 *
 * ⚠️ The five practice questions are SIMILAR, not clones — nothing in the
 * schema models a variant family and question ids are random, so "same
 * subject+topic, ranked by subtopic and difficulty" is the closest honest
 * thing. A mistake from the legacy `questions1` bank shows none at all (its
 * taxonomy doesn't map) and says so, rather than showing a wrong set.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain, Check, ChevronDown, Dumbbell, Minus, RotateCcw, Trash2, X,
} from "lucide-react";

import LatexRenderer from "@/components/LatexRenderer";
import { useAuth } from "@/lib/AuthContext";
import { useStudentLanguage } from "../layout";
import { canPractise } from "@/lib/mistakes";
import {
  SIMILAR_COUNT, deleteMistake, fetchSimilarQuestions, listMistakes, setMistakeResolved,
} from "@/services/mistakeService";
import { MISTAKE_SOURCE_LABELS, type MistakeDoc } from "@/types/mistakes";
import type { NormalizedQuestion } from "@/types/question";
import {
  Banner, Button, Card, Chip, EmptyState, Page, PageHeader, Spinner, Tabs, cn,
} from "@/components/student-ui";
import type { Lang } from "@/types/Math";

import SolutionSteps from "@/components/SolutionSteps";
const TR = {
  uz: {
    title: "Mening xatolarim",
    subtitle: "Xato qilgan va tashlab ketgan savollaringiz — shu yerda mashq qiling.",
    open: "Ishlanmagan",
    resolved: "O'rganilgan",
    emptyOpen: "Xatolar yo'q",
    emptyOpenDesc: "SAT, Milliy sertifikat yoki sinov testini topshiring — xato qilgan savollaringiz shu yerda to'planadi.",
    emptyDone: "Hali hech narsa belgilanmagan",
    emptyDoneDesc: "Savolni o'rganganingizdan so'ng «O'rgandim» tugmasini bosing.",
    wrong: "Xato",
    blank: "Bo'sh qoldirilgan",
    timesWrong: (n: number) => `${n} marta`,
    correctAnswer: "To'g'ri javob",
    explanation: "Izoh",
    practise: "Shunga o'xshash 5 ta savol",
    practising: "Yuklanmoqda…",
    noPractice: "Bu savol uchun mashq to'plami yo'q — u eski bazadan olingan.",
    noneFound: "Bu mavzuda boshqa savol topilmadi.",
    markDone: "O'rgandim",
    unresolve: "Qaytarish",
    remove: "O'chirish",
    loadError: "Xatolarni yuklashda muammo.",
    practiceError: "Mashq savollarini yuklab bo'lmadi.",
  },
  en: {
    title: "My Mistakes",
    subtitle: "Questions you got wrong or left blank — practise them here.",
    open: "To practise",
    resolved: "Learned",
    emptyOpen: "No mistakes",
    emptyOpenDesc: "Sit a SAT, Milliy sertifikat or mock test — anything you miss collects here.",
    emptyDone: "Nothing marked yet",
    emptyDoneDesc: "Press \"Got it\" once you have learned a question.",
    wrong: "Wrong",
    blank: "Left blank",
    timesWrong: (n: number) => `${n}×`,
    correctAnswer: "Correct answer",
    explanation: "Explanation",
    practise: `Practise ${SIMILAR_COUNT} similar questions`,
    practising: "Loading…",
    noPractice: "No practice set for this one — it came from the legacy bank.",
    noneFound: "No other questions found on this topic.",
    markDone: "Got it",
    unresolve: "Undo",
    remove: "Delete",
    loadError: "Could not load your mistakes.",
    practiceError: "Could not load practice questions.",
  },
  ru: {
    title: "Мои ошибки",
    subtitle: "Вопросы с ошибками и пропущенные — тренируйтесь здесь.",
    open: "К разбору",
    resolved: "Изучено",
    emptyOpen: "Ошибок нет",
    emptyOpenDesc: "Пройдите SAT, Национальный сертификат или пробный тест — всё, что не решите, попадёт сюда.",
    emptyDone: "Пока ничего не отмечено",
    emptyDoneDesc: "Нажмите «Понял», когда разберёте вопрос.",
    wrong: "Ошибка",
    blank: "Пропущен",
    timesWrong: (n: number) => `${n}×`,
    correctAnswer: "Правильный ответ",
    explanation: "Пояснение",
    practise: `${SIMILAR_COUNT} похожих вопросов`,
    practising: "Загрузка…",
    noPractice: "Для этого вопроса нет набора — он из старой базы.",
    noneFound: "Других вопросов по этой теме не найдено.",
    markDone: "Понял",
    unresolve: "Вернуть",
    remove: "Удалить",
    loadError: "Не удалось загрузить ошибки.",
    practiceError: "Не удалось загрузить вопросы для практики.",
  },
} as const;

const localized = (v: { uz?: string; ru?: string; en?: string } | undefined, lang: Lang): string =>
  v?.[lang] || v?.en || v?.uz || v?.ru || "";

export default function MyMistakesPage() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = TR[(lang as keyof typeof TR)] ?? TR.uz;
  const uid = user?.uid;

  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [rows, setRows] = useState<MistakeDoc[] | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setRows(null);
    setError("");
    try {
      setRows(await listMistakes(uid, { resolved: tab === "resolved" }));
    } catch (e) {
      console.error("listMistakes failed:", e);
      setError(t.loadError);
      setRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, tab]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (m: MistakeDoc, resolved: boolean) => {
    if (!uid) return;
    setBusy(m.slotKey);
    try {
      await setMistakeResolved(uid, m.slotKey, resolved);
      // Drop it from the list in place — it belongs to the other tab now.
      setRows((prev) => (prev ?? []).filter((r) => r.slotKey !== m.slotKey));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (m: MistakeDoc) => {
    if (!uid) return;
    setBusy(m.slotKey);
    try {
      await deleteMistake(uid, m.slotKey);
      setRows((prev) => (prev ?? []).filter((r) => r.slotKey !== m.slotKey));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Page>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
        <PageHeader title={t.title} />

        <Tabs
          label={t.title}
          tabs={[
            { value: "open" as const, label: t.open },
            { value: "resolved" as const, label: t.resolved },
          ]}
          value={tab}
          onChange={(v) => { setTab(v); setExpanded(null); }}
        />

        {error && <Banner status="error" title={error} />}

        {rows === null ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Brain />}
            title={tab === "open" ? t.emptyOpen : t.emptyDone}
            description={tab === "open" ? t.emptyOpenDesc : t.emptyDoneDesc}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {rows.map((m) => (
              <MistakeRow
                key={m.slotKey}
                m={m}
                t={t}
                lang={lang as Lang}
                open={expanded === m.slotKey}
                busy={busy === m.slotKey}
                onToggle={() => setExpanded(expanded === m.slotKey ? null : m.slotKey)}
                onResolve={() => resolve(m, tab === "open")}
                onRemove={() => remove(m)}
              />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}

function MistakeRow({
  m, t, lang, open, busy, onToggle, onResolve, onRemove,
}: {
  m: MistakeDoc;
  t: (typeof TR)[keyof typeof TR];
  lang: Lang;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onResolve: () => void;
  onRemove: () => void;
}) {
  const [similar, setSimilar] = useState<NormalizedQuestion[] | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarError, setSimilarError] = useState("");

  const practisable = useMemo(() => canPractise(m), [m]);
  const sourceLabel = MISTAKE_SOURCE_LABELS[m.source]?.[lang as "uz" | "ru" | "en"] ?? m.source;

  // Loaded only when the row is opened AND the button is pressed — a bucket of
  // 40 mistakes must not fire 40 sampling queries on mount.
  const loadSimilar = async () => {
    setLoadingSimilar(true);
    setSimilarError("");
    try {
      setSimilar(await fetchSimilarQuestions(m));
    } catch (e) {
      console.error("fetchSimilarQuestions failed:", e);
      setSimilarError(t.practiceError);
    } finally {
      setLoadingSimilar(false);
    }
  };

  return (
    <Card className="flex flex-col gap-2 p-0">
      <button onClick={onToggle} aria-expanded={open} className="flex items-start gap-3 p-3.5 text-left">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full",
            m.outcome === "blank"
              ? "bg-surface-container-highest text-on-surface-variant"
              : "bg-error-container text-on-error-container",
          )}
        >
          {m.outcome === "blank" ? <Minus size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[13.5px] font-semibold text-on-surface">
            <LatexRenderer latex={localized(m.question, lang)} />
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-on-surface-variant">
            <span>{m.outcome === "blank" ? t.blank : t.wrong}</span>
            {m.timesWrong > 1 && <span className="text-error">{t.timesWrong(m.timesWrong)}</span>}
            <span className="normal-case tracking-normal opacity-80">{sourceLabel}</span>
            {m.topicName && <span className="normal-case tracking-normal opacity-80">· {m.topicName}</span>}
          </span>
        </span>

        <ChevronDown
          size={16}
          className={cn("mt-1 flex-none text-on-surface-variant transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-3 px-3.5 pb-3.5">
          {m.stem && (
            <p className="text-[12.5px] font-medium text-on-surface-variant">
              <LatexRenderer latex={localized(m.stem, lang)} />
            </p>
          )}
          {m.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.imageUrl} alt="" className="max-h-56 w-full rounded-m3-sm object-contain" />
          )}

          {m.optionKeys.length > 0 && (
            <ul className="flex flex-col gap-1">
              {m.optionKeys.map((k) => (
                <li
                  key={k}
                  className={cn(
                    "flex gap-2 rounded-m3-sm px-2.5 py-1.5 text-[12.5px]",
                    k === m.answer
                      ? "bg-success-container font-bold text-on-success-container"
                      : "text-on-surface-variant",
                  )}
                >
                  <span className="font-black">{k}.</span>
                  <LatexRenderer latex={localized(m.options?.[k], lang)} />
                </li>
              ))}
            </ul>
          )}

          {m.optionKeys.length === 0 && (
            <p className="text-[12.5px] font-medium text-on-surface">
              <span className="text-on-surface-variant">{t.correctAnswer}: </span>
              <b>{m.answer}</b>
            </p>
          )}

          {localized(m.explanation, lang) && (
            <div className="rounded-m3-sm bg-state-hover p-2.5 text-[12px] font-medium text-on-surface-variant">
              <b className="mb-1 block">{t.explanation}:</b>
              <SolutionSteps text={localized(m.explanation, lang)} />
            </div>
          )}

          {/* ── practise ────────────────────────────────────────────────── */}
          {!practisable ? (
            <p className="text-[11.5px] font-medium italic text-on-surface-variant">{t.noPractice}</p>
          ) : similar === null ? (
            <Button variant="tonal" icon={<Dumbbell />} loading={loadingSimilar} onClick={loadSimilar}>
              {loadingSimilar ? t.practising : t.practise}
            </Button>
          ) : similar.length === 0 ? (
            <p className="text-[11.5px] font-medium italic text-on-surface-variant">{t.noneFound}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {similar.map((q, i) => (
                <li key={q.id} className="rounded-m3-sm border border-outline-variant p-2.5">
                  <p className="text-[12.5px] font-medium text-on-surface">
                    <span className="font-black text-primary">{i + 1}. </span>
                    <LatexRenderer latex={localized(q.question, lang)} />
                  </p>
                  {q.optionList.length > 0 && (
                    <ul className="mt-1.5 flex flex-col gap-0.5">
                      {q.optionList.map((o) => (
                        <li
                          key={o.id}
                          className={cn(
                            "text-[11.5px]",
                            o.id === q.answer ? "font-bold text-success" : "text-on-surface-variant",
                          )}
                        >
                          {o.id}. <LatexRenderer latex={localized(o.text, lang)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}

          {similarError && <Banner status="error" title={similarError} />}

          <div className="flex flex-wrap gap-2">
            <Button
              variant={m.resolved ? "outlined" : "filled"}
              size="sm"
              icon={m.resolved ? <RotateCcw /> : <Check />}
              loading={busy}
              onClick={onResolve}
            >
              {m.resolved ? t.unresolve : t.markDone}
            </Button>
            <Button variant="text" size="sm" icon={<Trash2 />} loading={busy} onClick={onRemove}>
              {t.remove}
            </Button>
            <Chip className="ml-auto">{m.testTitle}</Chip>
          </div>
        </div>
      )}
    </Card>
  );
}
