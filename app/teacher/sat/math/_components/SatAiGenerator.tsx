"use client";

import { useState } from "react";
import {
  AlertTriangle, Check, Coins, Pencil, Plus, RefreshCw, Sparkles, Trash2,
} from "lucide-react";

import LatexRenderer from "@/components/LatexRenderer";
import { useAuth } from "@/lib/AuthContext";
import { useMonthlyLimit } from "@/hooks/useMonthlyLimit";
import { SAT_MATH_DOMAINS } from "@/lib/SatMathQuiz";
import {
  generateSatMathQuestions, SatAiFailure,
  type SatAiDifficulty, type SatAiDraft, type SatAiError,
} from "@/services/satQuestionGenerator";
import { Banner, Button, TextArea, TextField, cn } from "@/components/ui";
import type { SatMathDomain, SatQuizItem } from "@/types/SatQuiz";
import type { Lang } from "@/types/Math";

/**
 * "AI bilan yaratish" inside the SAT Math builder's bank picker (2026-11-01,
 * docs/SAT_QUIZ.md): pick a domain + difficulty + count, generate `mcq`
 * drafts, then edit the text and reassign which option is correct BEFORE
 * adding any of them to the module — unlike the classroom-games generator
 * (docs/GAMES.md), which is read-only/play-only, a SAT item is graded, so the
 * teacher gets a real editing pass here.
 */

const LETTERS = ["A", "B", "C", "D"] as const;
const COUNTS = [3, 5, 8];
const DIFFICULTY_ID: Record<SatAiDifficulty, number> = { easy: 1, medium: 2, hard: 3 };
let draftSeq = 0;

interface T9n {
  domain: string; difficulty: string; count: string;
  easy: string; medium: string; hard: string;
  generate: string; generating: string;
  left: (n: number) => string;
  unlimited: string; limitReached: string; upgrade: string;
  errBadTopic: string; errFailed: string;
  ready: (n: number) => string;
  edit: string; done: string; remove: string;
  correct: string;
  add: string; added: string; addAll: string;
  again: string; solution: string;
  questionLabel: string; optionLabel: string;
}

const T: Record<Lang, T9n> = {
  uz: {
    domain: "Yo'nalish", difficulty: "Daraja", count: "Nechta",
    easy: "Oson", medium: "O'rta", hard: "Qiyin",
    generate: "Yaratish", generating: "Yaratilmoqda…",
    left: (n) => `Oyiga yana ${n} ta savol qolgan.`,
    unlimited: "Cheksiz AI limiti.",
    limitReached: "Oylik AI limitingiz tugadi.",
    upgrade: "Tarifni oshirish",
    errBadTopic: "AI savol yarata olmadi. Qayta urinib ko'ring.",
    errFailed: "Xatolik yuz berdi. Qayta urinib ko'ring.",
    ready: (n) => `${n} ta savol tayyor — tekshiring, kerak bo'lsa tahrirlang.`,
    edit: "Tahrirlash", done: "Tayyor", remove: "O'chirish",
    correct: "To'g'ri javob qilib belgilash",
    add: "Modulga qo'shish", added: "Qo'shildi", addAll: "Barchasini qo'shish",
    again: "Qayta yaratish", solution: "Yechim",
    questionLabel: "Savol matni", optionLabel: "Variant",
  },
  ru: {
    domain: "Домен", difficulty: "Уровень", count: "Количество",
    easy: "Лёгкий", medium: "Средний", hard: "Сложный",
    generate: "Создать", generating: "Создаётся…",
    left: (n) => `Осталось ${n} вопросов в этом месяце.`,
    unlimited: "Безлимитный AI.",
    limitReached: "Ваш месячный лимит AI исчерпан.",
    upgrade: "Улучшить тариф",
    errBadTopic: "Не удалось создать вопрос. Попробуйте ещё раз.",
    errFailed: "Произошла ошибка. Попробуйте ещё раз.",
    ready: (n) => `${n} вопрос(ов) готово — проверьте и при необходимости отредактируйте.`,
    edit: "Редактировать", done: "Готово", remove: "Удалить",
    correct: "Отметить как правильный",
    add: "Добавить в модуль", added: "Добавлено", addAll: "Добавить все",
    again: "Создать ещё", solution: "Решение",
    questionLabel: "Текст вопроса", optionLabel: "Вариант",
  },
  en: {
    domain: "Domain", difficulty: "Difficulty", count: "Count",
    easy: "Easy", medium: "Medium", hard: "Hard",
    generate: "Generate", generating: "Generating…",
    left: (n) => `${n} questions left this month.`,
    unlimited: "Unlimited AI.",
    limitReached: "Your monthly AI limit is used up.",
    upgrade: "Upgrade plan",
    errBadTopic: "Couldn't generate a question. Try again.",
    errFailed: "Something went wrong. Try again.",
    ready: (n) => `${n} question(s) ready — review and edit if needed.`,
    edit: "Edit", done: "Done", remove: "Remove",
    correct: "Mark as correct",
    add: "Add to module", added: "Added", addAll: "Add all",
    again: "Generate more", solution: "Solution",
    questionLabel: "Question text", optionLabel: "Option",
  },
};

type EditableDraft = SatAiDraft & { id: string; editing: boolean };

function draftToItem(
  d: EditableDraft, domainId: SatMathDomain, difficulty: SatAiDifficulty, creatorId: string, creatorName: string | null,
): SatQuizItem {
  const item: SatQuizItem = {
    id: d.id,
    qType: "mcq",
    domain: domainId,
    domainLabel: SAT_MATH_DOMAINS.find((x) => x.id === domainId)!.name,
    difficultyId: DIFFICULTY_ID[difficulty],
    question: { en: d.q, uz: "", ru: "" },
    imageUrl: null,
    optionKeys: [...LETTERS],
    options: Object.fromEntries(LETTERS.map((l, i) => [l, { en: d.o[i] ?? "", uz: "", ru: "" }])),
    answer: LETTERS[d.a] ?? "A",
    creatorId,
  };
  if (d.e) item.explanation = { en: d.e, uz: "", ru: "" };
  if (creatorName) item.creatorName = creatorName;
  return item;
}

export default function SatAiGenerator({
  lang, disabled, picked, onAdd,
}: {
  lang: Lang;
  disabled: boolean;
  picked: Set<string>;
  onAdd: (item: SatQuizItem) => void;
}) {
  const t = T[lang] ?? T.uz;
  const { user } = useAuth();
  const limit = useMonthlyLimit();

  const [domain, setDomain] = useState<SatMathDomain>(SAT_MATH_DOMAINS[0].id);
  const [difficulty, setDifficulty] = useState<SatAiDifficulty>("medium");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SatAiError | null>(null);
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);

  const remaining = limit.isUnlimited ? Infinity : limit.remaining;
  const outOfCredits = !limit.loading && remaining < 1;
  const canGenerate = !disabled && !loading && !limit.loading && !outOfCredits;

  const generate = async () => {
    if (!canGenerate) return;
    setError(null);
    setLoading(true);
    try {
      const found = await generateSatMathQuestions({ domain, difficulty, count });
      setDrafts((prev) => [...prev, ...found.map((f) => ({ ...f, id: `sat_ai_${Date.now().toString(36)}_${draftSeq++}`, editing: false }))]);
    } catch (e) {
      setError(e instanceof SatAiFailure ? e.code : "FAILED");
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (id: string, patch: Partial<EditableDraft>) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const updateOption = (id: string, i: number, text: string) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, o: d.o.map((o, k) => (k === i ? text : o)) } : d)));
  const removeDraft = (id: string) => setDrafts((prev) => prev.filter((d) => d.id !== id));

  const add = (d: EditableDraft) => onAdd(draftToItem(d, domain, difficulty, user?.uid ?? "", user?.displayName ?? null));
  const addAll = () => drafts.forEach((d) => { if (!picked.has(d.id)) add(d); });

  const chip = (active: boolean) => cn(
    "m3-interactive rounded-m3-sm px-3 py-1.5 text-[11px] font-bold transition-colors",
    active ? "bg-primary text-on-primary" : "border border-outline-variant bg-surface-container-lowest text-on-surface-variant",
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t.domain}</span>
        {SAT_MATH_DOMAINS.map((d) => (
          <button key={d.id} onClick={() => setDomain(d.id)} className={chip(domain === d.id)}>{d.name.uz}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t.difficulty}</span>
        {(["easy", "medium", "hard"] as SatAiDifficulty[]).map((d) => (
          <button key={d} onClick={() => setDifficulty(d)} className={chip(difficulty === d)}>{t[d]}</button>
        ))}
        <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t.count}</span>
        {COUNTS.map((c) => (
          <button key={c} onClick={() => setCount(c)} className={chip(count === c)}>{c}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" icon={<Sparkles />} loading={loading} disabled={!canGenerate} onClick={generate}>
          {loading ? t.generating : t.generate}
        </Button>
        {!limit.loading && (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant">
            <Coins size={13} className="text-primary" /> {limit.isUnlimited ? t.unlimited : t.left(limit.remaining)}
          </p>
        )}
      </div>

      {error && (
        <Banner tone="error" icon={<AlertTriangle />}>
          {error === "LIMIT_REACHED" ? t.limitReached : error === "BAD_TOPIC" ? t.errBadTopic : t.errFailed}
        </Banner>
      )}
      {outOfCredits && !error && <Banner tone="warning" icon={<AlertTriangle />}>{t.limitReached}</Banner>}

      {drafts.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-on-surface-variant">{t.ready(drafts.length)}</p>
            <Button size="sm" variant="tonal" icon={<Plus />} disabled={disabled} onClick={addAll}>{t.addAll}</Button>
          </div>

          <ul className="flex flex-col gap-2">
            {drafts.map((d, idx) => {
              const already = picked.has(d.id);
              return (
                <li key={d.id} className="rounded-m3-md border border-outline-variant bg-surface-container-lowest p-2.5">
                  {d.editing ? (
                    <div className="flex flex-col gap-2">
                      <TextArea
                        label={t.questionLabel}
                        value={d.q}
                        onChange={(e) => updateDraft(d.id, { q: e.target.value })}
                        rows={2}
                      />
                      {d.q && <LatexRenderer latex={d.q} className="text-[12.5px] text-on-surface-variant" />}
                      {d.o.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateDraft(d.id, { a: i })}
                            title={t.correct}
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-black",
                              d.a === i ? "border-success bg-success-container text-on-success-container" : "border-outline-variant text-on-surface-variant",
                            )}
                          >
                            {LETTERS[i]}
                          </button>
                          <TextField label={`${t.optionLabel} ${LETTERS[i]}`} value={opt} onChange={(e) => updateOption(d.id, i, e.target.value)} className="flex-1" />
                        </div>
                      ))}
                      <Button size="sm" variant="tonal" icon={<Check />} onClick={() => updateDraft(d.id, { editing: false })} className="self-end">
                        {t.done}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-m3-xs bg-surface-container px-1.5 text-[11px] font-bold tabular-nums text-on-surface-variant">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1 text-[13px] font-medium text-on-surface">
                          <LatexRenderer latex={d.q} />
                        </div>
                      </div>
                      <div className="mt-2 grid gap-1.5 pl-9 sm:grid-cols-2">
                        {d.o.map((opt, i) => (
                          <span
                            key={i}
                            className={cn(
                              "flex items-center gap-1.5 rounded-m3-sm px-2.5 py-1.5 text-[12.5px]",
                              i === d.a ? "bg-success-container font-bold text-on-success-container" : "bg-surface-container text-on-surface-variant",
                            )}
                          >
                            {i === d.a ? <Check size={13} className="shrink-0" strokeWidth={3} /> : <span className="w-[13px] shrink-0" />}
                            <LatexRenderer latex={opt} />
                          </span>
                        ))}
                      </div>
                      <div className="mt-2.5 flex items-center justify-end gap-1.5 pl-9">
                        <Button size="sm" variant="text" icon={<Pencil />} onClick={() => updateDraft(d.id, { editing: true })}>{t.edit}</Button>
                        <Button size="sm" variant="text" icon={<Trash2 />} onClick={() => removeDraft(d.id)}>{t.remove}</Button>
                        <Button
                          size="sm"
                          variant={already ? "text" : "tonal"}
                          icon={already ? <Check /> : <Plus />}
                          disabled={already || disabled}
                          onClick={() => add(d)}
                        >
                          {already ? t.added : t.add}
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          <Button variant="outlined" size="sm" icon={<RefreshCw />} loading={loading} disabled={!canGenerate} onClick={generate}>
            {t.again}
          </Button>
        </>
      )}
    </div>
  );
}
