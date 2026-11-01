// app/(student)/raschmodel/page.tsx
'use client';

// Components
import MathematicsCard from './components/MathematicsCard';
import RaschNav from './_components/RaschNav';
import MathLevelSummary from './components/MathLevelSummary';
import MmsCard from './components/MmsCard';
import { useStudentLanguage } from '../layout';
import { Page } from '@/components/student-ui';

// Edify style (2026-10-31): no page header — the "RASCH" wordmark meant nothing
// to a student and the subtitle repeated what the nav already says. The level
// card is the first thing on the page.

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function RaschmodelPage() {
  // One language switcher for the whole student app — it lives in the top navbar
  // (app/(student)/layout.tsx) and reaches every page through this context.
  const { lang } = useStudentLanguage();

  return (
    <Page>
      <RaschNav lang={lang} />
      {/* ── Where the student actually stands ───────────────────────────── */}
      <MathLevelSummary lang={lang} />

      {/* ── The exam itself ─────────────────────────────────────────────────
          ⚠️ `MmsCard` moved here from the student dashboard on 2026-07-30. It
          names the paper, prints the expected score at the measured θ and the
          weakest dimension, and starts a sitting. It reads the SAME 12h-cached
          `RASCH_levels/{uid}` document as `MathLevelSummary` above and the nav's
          level chip, so the three of them cost one read between them. */}
      <MmsCard lang={lang} className="mb-6" />

      {/* ── Mathematics Section ─────────────────────────────────────────── */}
      <MathematicsCard lang={lang} />
    </Page>
  );
}
