'use client';

// Student-kit port of the teacher IELTS question renderer
// (app/teacher/ielts/reading/view/[id]/_components/question_renderer.tsx).
// All 13 question types, same block shapes, same gap-token grammar — but:
//   • answers are keyed by String(question_number) to match the submit payload;
//   • list_selection span comes from end−start+1 (public docs carry no
//     correct_answer to count) and its string[] lives under the FIRST number;
//   • gap tokens ([0], [ 1 ], [_], []) are POSITIONAL → start_question + index;
//   • multiple_choice renders single-select (multi-answer MCQs are authored as
//     list_selection — without the key the client cannot know the arity);
//   • optional review mode: disabled inputs + per-question verdict, correct
//     answer, explanation and a Locate button (passage_reference).
import { Fragment } from 'react';
import { ArrowDown, CheckCircle2, Flag, XCircle } from 'lucide-react';
import { useStudentLanguage } from '@/app/(student)/layout';
import { cn } from '@/components/student-ui';
import { fmtAnswer, GAP_TOKEN_SPLIT, isGapToken, listBaseQn, listSpan, type AnswerMap } from './shared';
import { runnerT } from './i18n';

export interface ReviewCtx {
  perQuestion?: Record<string, { correct: boolean; type?: string }>;
  correctAnswers?: Record<string, string | string[]>;
  /** Reading: scroll/flash the reference in the passage. Listening: open transcript. */
  onLocate?: (qn: number, reference: string) => void;
}

export interface StudentQuestionRendererProps {
  qb: any;
  answers: AnswerMap;
  onAnswer?: (qn: number, value: string | string[]) => void;
  review?: ReviewCtx | null;
  flagged?: boolean;
  onToggleFlag?: () => void;
}

// Underline inputs, kit tokens only, comfortably tappable (≥2em tall).
const INPUT_CLS =
  'inline-block h-[2em] min-w-[7em] w-auto border-b-2 border-outline bg-transparent px-1 text-center font-bold text-primary outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary disabled:opacity-90';
const SELECT_CLS =
  'inline-block h-[2em] min-w-[4.5em] cursor-pointer border-b-2 border-outline bg-transparent text-center font-bold text-primary outline-none transition-colors focus:border-primary disabled:cursor-default disabled:opacity-90';
const NUM_BADGE =
  'flex h-[1.7em] w-[1.7em] shrink-0 items-center justify-center rounded-m3-xs bg-primary text-[0.8em] font-bold text-on-primary';

export default function StudentQuestionRenderer({
  qb, answers, onAnswer, review, flagged, onToggleFlag,
}: StudentQuestionRendererProps) {
  const { lang } = useStudentLanguage();
  const t = runnerT(lang);

  const disabled = !!review;
  const get = (qn: number) => answers[String(qn)];
  const getStr = (qn: number): string => {
    const v = get(qn);
    return typeof v === 'string' ? v : '';
  };
  const getArr = (qn: number): string[] => {
    const v = get(qn);
    return Array.isArray(v) ? v : [];
  };
  const set = (qn: number, v: string | string[]) => onAnswer?.(qn, v);

  const verdict = (qn: number): boolean | null => {
    const pq = review?.perQuestion?.[String(qn)];
    return pq ? !!pq.correct : null;
  };
  // In review mode the underline gets a green/red border so gap blanks read at a glance.
  const toneCls = (qn: number): string => {
    if (!review) return '';
    const v = verdict(qn);
    if (v === true) return 'border-success text-success';
    if (v === false) return 'border-error text-error';
    return '';
  };

  /** Verdict row shown under a question in review mode (render fn — a component
   *  here would remount on every parent render and drop input focus). */
  const renderReviewLine = (qn: number, row?: any) => {
    if (!review) return null;
    const v = verdict(qn);
    const correct = review.correctAnswers?.[String(qn)];
    const given = get(qn);
    const reference: string = row?.passage_reference || '';
    const explanation: string = row?.explanation || '';
    return (
      <div className="mt-1.5 rounded-m3-sm bg-surface-container-low px-3 py-2 text-[0.85em]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {v === true && <CheckCircle2 size={15} strokeWidth={3} className="shrink-0 text-success" />}
          {v === false && <XCircle size={15} strokeWidth={3} className="shrink-0 text-error" />}
          <span className={cn('font-bold', v === true ? 'text-success' : v === false ? 'text-error' : 'text-on-surface-variant')}>
            {t.review.yourAnswer}: {fmtAnswer(given as string | string[] | undefined) || '—'}
          </span>
          {correct !== undefined && (
            <span className="font-bold text-on-surface">
              {t.review.correct}: <span className="text-success">{fmtAnswer(correct)}</span>
            </span>
          )}
          {reference && review.onLocate && (
            <button
              type="button"
              onClick={() => review.onLocate!(qn, reference)}
              className="rounded-full bg-primary-container px-2.5 py-0.5 font-bold text-on-primary-container s-press"
            >
              {t.review.locate}
            </button>
          )}
        </div>
        {explanation && (
          <p className="mt-1 font-medium leading-relaxed text-on-surface-variant">
            <span className="font-bold text-on-surface">{t.review.explanation}:</span> {explanation}
          </p>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Positional gap-text renderer (summary / table / flowchart — block-scoped).
  // `counter` persists across every text fragment of the block so the i-th gap
  // anywhere in the block maps to start_question + i.
  // -------------------------------------------------------------------------
  const hasBank = Array.isArray(qb.options) && qb.options.length > 0;

  const renderGapText = (text: string, counter: { i: number }) => {
    if (!text) return null;
    return text.split(GAP_TOKEN_SPLIT).map((part: string, i: number) => {
      if (isGapToken(part)) {
        const qn = (qb.start_question || 1) + counter.i;
        counter.i += 1;
        return (
          <span key={i} className="inline-flex items-end px-1 align-baseline" id={`question-${qn}`}>
            <span className="mb-[0.1em] mr-1 text-[0.85em] font-bold text-primary">{qn}.</span>
            {hasBank ? (
              <select
                value={getStr(qn)}
                disabled={disabled}
                onChange={(e) => set(qn, e.target.value)}
                className={cn(SELECT_CLS, 'min-w-[5.5em]', toneCls(qn))}
              >
                <option value=""></option>
                {qb.options.map((opt: any, oIdx: number) => (
                  <option key={oIdx} value={opt.id}>{opt.id}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={getStr(qn)}
                disabled={disabled}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => set(qn, e.target.value)}
                className={cn(INPUT_CLS, toneCls(qn))}
              />
            )}
          </span>
        );
      }
      return <span key={i} className="break-words">{part}</span>;
    });
  };

  /** Per-row gap renderer (sentence_completion — the row owns its number). */
  const renderGapRow = (text: string, qn: number) => {
    if (!text) return null;
    return text.split(GAP_TOKEN_SPLIT).map((part: string, i: number) => {
      if (isGapToken(part)) {
        return (
          <span key={i} className="inline-flex items-end px-1 align-baseline">
            <input
              type="text"
              value={getStr(qn)}
              disabled={disabled}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => set(qn, e.target.value)}
              placeholder={String(qn)}
              className={cn(INPUT_CLS, 'min-w-[8em]', toneCls(qn))}
            />
          </span>
        );
      }
      return <span key={i} className="break-words">{part}</span>;
    });
  };

  // A letters-only bank ({id:"A", text:"A"} — map/plan labelling, where the
  // letters live on the image) has nothing to list; the dropdowns are enough.
  const labelledDiagram = qb.type === 'diagram_completion'
    && Array.isArray(qb.questions) && qb.questions.some((q: { question_text?: string }) => q?.question_text);
  const lettersOnlyBank = hasBank && qb.options.every(
    (o: { id?: unknown; text?: unknown }) => String(o?.text ?? '').trim() === String(o?.id ?? '').trim(),
  );

  const renderWordBank = () =>
    hasBank && !lettersOnlyBank ? (
      <div className="rounded-m3-sm border border-outline-variant bg-surface-container-low p-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {qb.options.map((opt: any, i: number) => (
            <div key={i} className="flex items-start text-[1em] text-on-surface">
              <strong className="mr-1.5 w-[1.5em] shrink-0 text-right text-primary">{opt.id}</strong>
              <span className="leading-snug">{opt.text}</span>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  /** Underline select for the matching families (headings / paragraph / features / endings). */
  const renderMatchSelect = (qn: number) => (
    <select
      value={getStr(qn)}
      disabled={disabled}
      onChange={(e) => set(qn, e.target.value)}
      className={cn(SELECT_CLS, toneCls(qn))}
    >
      <option value=""></option>
      {Array.isArray(qb.options) && qb.options.map((o: any, idx: number) => (
        <option key={idx} value={o.id || o}>{o.id || o}</option>
      ))}
    </select>
  );

  return (
    <div className="border-b border-outline-variant pb-6 last:border-0">
      {/* Sticky block header: range + instructions + review flag */}
      <div className="sticky top-0 z-20 mb-3 bg-surface-blur py-1.5 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-on-surface">
            Questions {qb.start_question}–{qb.end_question}
          </h3>
          {onToggleFlag && (
            <button
              type="button"
              onClick={onToggleFlag}
              aria-label={flagged ? t.runner.flagged : t.runner.flag}
              aria-pressed={flagged}
              className={cn(
                's-press flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-bold',
                flagged
                  ? 'border-transparent bg-gold-container text-on-gold-container'
                  : 'border-outline-variant text-on-surface-variant hover:bg-state-hover',
              )}
            >
              <Flag size={13} strokeWidth={3} fill={flagged ? 'currentColor' : 'none'} />
              <span className="hidden sm:inline">{flagged ? t.runner.flagged : t.runner.flag}</span>
            </button>
          )}
        </div>
        {qb.instructions && (
          <div
            className="text-[0.9em] italic text-on-surface-variant"
            dangerouslySetInnerHTML={{ __html: String(qb.instructions).replace(/\n/g, '<br/>') }}
          />
        )}
      </div>

      {/* Shared block titles */}
      {(qb.summary_title || qb.table_title || qb.flowchart_title || qb.diagram_title) && (
        <h4 className="mb-3 text-center text-[1.05em] font-bold text-on-surface">
          {qb.summary_title || qb.table_title || qb.flowchart_title || qb.diagram_title}
        </h4>
      )}

      {/* ================= 1. MATCHING HEADINGS ================= */}
      {qb.type === 'matching_headings' && (
        <div className="space-y-5">
          {hasBank && (
            <div className="rounded-m3-sm border border-outline-variant bg-surface-container-low p-4">
              <h5 className="mb-3 text-center font-bold text-on-surface">List of Headings</h5>
              <div className="flex flex-col space-y-2.5">
                {qb.options.map((opt: any, idx: number) => (
                  <div key={idx} className="flex items-start text-on-surface">
                    <span className="w-[3em] shrink-0 font-bold text-primary">{opt.id || '?'}</span>
                    <span className="flex-1 break-words leading-relaxed">{opt.text || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {Array.isArray(qb.questions) && qb.questions.map((q: any, i: number) => (
              <div key={i} id={`question-${q?.question_number || i}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className={NUM_BADGE}>{q.question_number || '?'}</div>
                  <p className="min-w-[120px] flex-1 text-on-surface">
                    Paragraph <strong>{q.target_paragraph || '?'}</strong>
                  </p>
                  {renderMatchSelect(q.question_number)}
                </div>
                {renderReviewLine(q.question_number, q)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 2. TRUE / FALSE / NOT GIVEN ================= */}
      {qb.type === 'true_false_not_given' && (
        <div className="space-y-5">
          {Array.isArray(qb.options) && qb.options.length > 0 && (
            <div className="ml-1 flex flex-col space-y-1.5">
              {qb.options.map((opt: any, idx: number) => (
                <div key={idx} className="flex items-start text-[1em] text-on-surface">
                  <strong className="w-[7.5em] shrink-0 font-bold uppercase tracking-wide">{opt.label || '?'}</strong>
                  <span className="flex-1 leading-relaxed">{opt.description || ''}</span>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-4">
            {Array.isArray(qb.questions) && qb.questions.map((q: any, i: number) => (
              <div key={i} id={`question-${q?.question_number || i}`}>
                <div className="flex items-start gap-3">
                  <div className={cn(NUM_BADGE, 'mt-[0.15em]')}>{q.question_number || '?'}</div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 break-words font-medium leading-relaxed text-on-surface">{q.statement || ''}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {(Array.isArray(qb.options) && qb.options.length > 0
                        ? qb.options
                        : [{ label: 'TRUE' }, { label: 'FALSE' }, { label: 'NOT GIVEN' }]
                      ).map((opt: any, oIdx: number) => (
                        <label
                          key={oIdx}
                          className={cn(
                            'flex w-fit items-center gap-2 rounded-m3-sm px-2 py-1.5',
                            !disabled && 'cursor-pointer hover:bg-state-hover',
                          )}
                        >
                          <input
                            type="radio"
                            name={`q${q.question_number}`}
                            value={opt.label}
                            disabled={disabled}
                            checked={getStr(q.question_number) === opt.label}
                            onChange={(e) => set(q.question_number, e.target.value)}
                            className="h-[1.1em] w-[1.1em] cursor-pointer border-outline text-primary focus:ring-primary"
                          />
                          <span className="text-[1em] font-medium uppercase text-on-surface">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                {renderReviewLine(q.question_number, q)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 3. MULTIPLE CHOICE (single-select) ================= */}
      {qb.type === 'multiple_choice' && (
        <div className="space-y-5">
          {Array.isArray(qb.questions) && qb.questions.map((q: any, i: number) => (
            <div key={i} id={`question-${q?.question_number || i}`}>
              <div className="flex items-start gap-3">
                <div className={cn(NUM_BADGE, 'mt-[0.1em]')}>{q.question_number || '?'}</div>
                <div className="min-w-0 flex-1">
                  <p className="mb-2 break-words font-medium leading-normal text-on-surface">{q.question_text || ''}</p>
                  <div className="flex flex-col space-y-1">
                    {Array.isArray(q.options) && q.options.map((opt: any, oIdx: number) => (
                      <label
                        key={oIdx}
                        className={cn(
                          'flex w-full items-start gap-2.5 break-words rounded-m3-sm px-2 py-1.5 sm:w-fit',
                          !disabled && 'cursor-pointer hover:bg-state-hover',
                        )}
                      >
                        <input
                          type="radio"
                          name={`q${q.question_number}`}
                          value={opt.id}
                          disabled={disabled}
                          checked={getStr(q.question_number) === opt.id}
                          onChange={(e) => set(q.question_number, e.target.value)}
                          className="mt-[0.2em] h-[1.1em] w-[1.1em] shrink-0 cursor-pointer border-outline text-primary focus:ring-primary"
                        />
                        <span className="text-[1em] font-medium leading-snug text-on-surface">
                          <strong className="mr-2">{opt.id}</strong>
                          {opt.text || ''}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {renderReviewLine(q.question_number, q)}
            </div>
          ))}
        </div>
      )}

      {/* ================= 4. LIST SELECTION (span = end−start+1) ================= */}
      {qb.type === 'list_selection' && (() => {
        const span = listSpan(qb);
        const base = listBaseQn(qb);
        const row = Array.isArray(qb.questions) ? qb.questions[0] : null;
        const rangeLabel = qb.start_question === qb.end_question
          ? String(qb.start_question)
          : `${qb.start_question}–${qb.end_question}`;
        const selected = getArr(base);
        return (
          <div id={`question-${base}`}>
            <div className="flex items-start gap-3">
              <div className={cn(NUM_BADGE, 'w-auto min-w-[1.7em] px-1.5')}>{rangeLabel}</div>
              <div className="min-w-0 flex-1">
                <p className="mb-2 break-words font-medium leading-normal text-on-surface">{row?.question_text || ''}</p>
                <div className="flex flex-col space-y-1">
                  {Array.isArray(row?.options) && row.options.map((opt: any, oIdx: number) => {
                    const on = selected.includes(opt.id);
                    return (
                      <label
                        key={oIdx}
                        className={cn(
                          'flex w-full items-start gap-2.5 break-words rounded-m3-sm px-2 py-1.5 sm:w-fit',
                          !disabled && 'cursor-pointer hover:bg-state-hover',
                        )}
                      >
                        <input
                          type="checkbox"
                          value={opt.id}
                          disabled={disabled || (!on && selected.length >= span)}
                          checked={on}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (selected.length < span) set(base, [...selected, opt.id]);
                            } else {
                              set(base, selected.filter((v) => v !== opt.id));
                            }
                          }}
                          className="mt-[0.2em] h-[1.1em] w-[1.1em] shrink-0 cursor-pointer rounded-m3-xs border-outline text-primary focus:ring-primary"
                        />
                        <span className="text-[1em] font-medium leading-snug text-on-surface">
                          <strong className="mr-2">{opt.id}</strong>
                          {opt.text || ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            {renderReviewLine(base, row)}
          </div>
        );
      })()}

      {/* ============ 5–7. MATCHING (paragraph info / features / endings) ============ */}
      {(qb.type === 'matching_paragraph_information'
        || qb.type === 'matching_features'
        || qb.type === 'matching_sentence_endings') && (
        <div className="space-y-4">
          {(qb.type === 'matching_features' || qb.type === 'matching_sentence_endings') && hasBank && (
            <div className="rounded-m3-sm border border-outline-variant bg-surface-container-low p-4">
              <div className="flex flex-col space-y-2.5">
                {qb.options.map((opt: any, idx: number) => (
                  <div key={idx} className="flex items-start text-[1em] text-on-surface">
                    <strong className="w-[3em] shrink-0 font-bold text-primary">{opt.id || '?'}</strong>
                    <span className="flex-1 leading-relaxed">{opt.text || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(qb.questions) && qb.questions.map((q: any, i: number) => (
            <div key={i} id={`question-${q?.question_number || i}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className={NUM_BADGE}>{q.question_number || '?'}</div>
                <p className="min-w-[120px] flex-1 break-words font-medium leading-normal text-on-surface">
                  {q.statement || q.sentence_start || ''}
                </p>
                {renderMatchSelect(q.question_number)}
              </div>
              {renderReviewLine(q.question_number, q)}
            </div>
          ))}
        </div>
      )}

      {/* ================= 8. SUMMARY COMPLETION ================= */}
      {qb.type === 'summary_completion' && (() => {
        const counter = { i: 0 };
        return (
          <div className="space-y-4">
            {renderWordBank()}
            <div className="rounded-m3-sm border border-outline-variant bg-surface-container p-4">
              {/* pre-wrap: note/form-style summaries (most listening Parts 1 & 4, the
                  C18 reading notes) are authored as "\n"-separated lines + bullets. */}
              <div className="whitespace-pre-wrap text-[1em] font-medium leading-[2.4] text-on-surface">
                {renderGapText(qb.summary_text || '', counter)}
              </div>
            </div>
            {review && Array.isArray(qb.questions) && qb.questions.map((q: any, i: number) => (
              <Fragment key={i}>{renderReviewLine(q.question_number, q)}</Fragment>
            ))}
          </div>
        );
      })()}

      {/* ================= 9. SENTENCE COMPLETION ================= */}
      {qb.type === 'sentence_completion' && (
        <div className="space-y-4">
          {Array.isArray(qb.questions) && qb.questions.map((q: any, i: number) => (
            <div key={i} id={`question-${q?.question_number || i}`}>
              <div className="flex items-start gap-3">
                <div className={cn(NUM_BADGE, 'mt-[0.3em]')}>{q.question_number || '?'}</div>
                <div className="min-w-0 flex-1 text-[1em] font-medium leading-[2.4] text-on-surface">
                  {renderGapRow(q.sentence || '', q.question_number)}
                </div>
              </div>
              {renderReviewLine(q.question_number, q)}
            </div>
          ))}
        </div>
      )}

      {/* ================= 10. SHORT ANSWER ================= */}
      {qb.type === 'short_answer' && (
        <div className="space-y-4">
          {Array.isArray(qb.questions) && qb.questions.map((q: any, i: number) => (
            <div key={i} id={`question-${q?.question_number || i}`}>
              <div className="flex items-start gap-3">
                <div className={cn(NUM_BADGE, 'mt-[0.15em]')}>{q.question_number || '?'}</div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 break-words font-medium leading-normal text-on-surface">{q.question_text || ''}</p>
                  <input
                    type="text"
                    value={getStr(q.question_number)}
                    disabled={disabled}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => set(q.question_number, e.target.value)}
                    className={cn(INPUT_CLS, 'w-full text-left sm:w-[16em]', toneCls(q.question_number))}
                  />
                </div>
              </div>
              {renderReviewLine(q.question_number, q)}
            </div>
          ))}
        </div>
      )}

      {/* ================= 11. TABLE COMPLETION ================= */}
      {qb.type === 'table_completion' && Array.isArray(qb.headers) && Array.isArray(qb.rows) && (() => {
        const counter = { i: 0 };
        return (
          <div className="space-y-4">
            {renderWordBank()}
            <div className="overflow-x-auto rounded-m3-sm border border-outline-variant">
              <table className="w-full border-collapse bg-surface-container-low text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-high">
                    {qb.headers.map((h: string, i: number) => (
                      <th key={i} className="border-r border-outline-variant px-3 py-2 text-[0.85em] font-bold uppercase tracking-wide text-on-surface last:border-r-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {qb.rows.map((rowObj: any, rIdx: number) => {
                    const cells = Array.isArray(rowObj) ? rowObj : (rowObj.cells || []);
                    return (
                      <tr key={rIdx} className="border-b border-outline-variant last:border-b-0">
                        {cells.map((cell: string, cIdx: number) => (
                          <td key={cIdx} className="whitespace-pre-wrap border-r border-outline-variant px-3 py-2.5 align-top leading-[2.4] text-on-surface last:border-r-0">
                            {renderGapText(cell, counter)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {review && Array.isArray(qb.questions) && qb.questions.map((q: any, i: number) => (
              <Fragment key={i}>{renderReviewLine(q.question_number, q)}</Fragment>
            ))}
          </div>
        );
      })()}

      {/* ================= 12. FLOWCHART COMPLETION ================= */}
      {qb.type === 'flowchart_completion' && Array.isArray(qb.steps) && (() => {
        const counter = { i: 0 };
        return (
          <div className="space-y-4">
            {renderWordBank()}
            <div className="flex flex-col items-center rounded-m3-sm border border-outline-variant bg-surface-container px-3 py-5">
              {qb.steps.map((step: string, sIdx: number) => (
                <div key={sIdx} className="flex w-full max-w-lg flex-col items-center">
                  {sIdx > 0 && (
                    <div className="my-1.5 flex flex-col items-center">
                      <div className="h-4 w-px bg-outline"></div>
                      <ArrowDown size={15} className="text-on-surface-variant" strokeWidth={2} />
                    </div>
                  )}
                  <div className="w-full rounded-m3-sm border border-outline-variant bg-surface-container-lowest p-3">
                    <div className="whitespace-pre-wrap text-center text-[1em] font-medium leading-[2.4] text-on-surface">
                      {renderGapText(step, counter)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {review && Array.isArray(qb.questions) && qb.questions.map((q: any, i: number) => (
              <Fragment key={i}>{renderReviewLine(q.question_number, q)}</Fragment>
            ))}
          </div>
        );
      })()}

      {/* ================= 13. DIAGRAM COMPLETION ================= */}
      {qb.type === 'diagram_completion' && (
        <div className="space-y-4">
          {renderWordBank()}
          <div className="flex justify-center rounded-m3-sm border border-outline-variant bg-surface-container p-3">
            {qb.diagram_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qb.diagram_url}
                alt={qb.diagram_alt_text || 'Diagram'}
                className="max-h-[70vh] w-auto max-w-full rounded-m3-sm object-contain"
              />
            ) : (
              <div className="flex h-40 w-full max-w-md items-center justify-center rounded-m3-sm border-2 border-dashed border-outline text-[0.9em] text-on-surface-variant">
                —
              </div>
            )}
          </div>
          {/* Labelled rows (map/plan labelling: "15 School [B]") stack as a list;
              bare rows (labels printed inside the image) keep the compact wrap. */}
          <div className={cn(
            'pt-1',
            labelledDiagram ? 'space-y-2.5' : 'flex flex-wrap items-start justify-center gap-x-6 gap-y-3',
          )}>
            {Array.isArray(qb.questions) && qb.questions.map((q: any, i: number) => (
              <div key={i} id={`question-${q?.question_number || i}`}>
                <div className="flex items-center gap-2.5">
                  <span className={NUM_BADGE}>{q.question_number || '?'}</span>
                  {labelledDiagram && (
                    <span className="min-w-[9em] flex-1 font-medium text-on-surface sm:flex-none">{q.question_text || ''}</span>
                  )}
                  {hasBank ? (
                    <select
                      value={getStr(q.question_number)}
                      disabled={disabled}
                      onChange={(e) => set(q.question_number, e.target.value)}
                      className={cn(SELECT_CLS, 'min-w-[6em]', toneCls(q.question_number))}
                    >
                      <option value=""></option>
                      {qb.options.map((opt: any, oIdx: number) => (
                        <option key={oIdx} value={opt.id}>{opt.id}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={getStr(q.question_number)}
                      disabled={disabled}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      onChange={(e) => set(q.question_number, e.target.value)}
                      className={cn(INPUT_CLS, 'min-w-[10em]', toneCls(q.question_number))}
                    />
                  )}
                </div>
                {renderReviewLine(q.question_number, q)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
