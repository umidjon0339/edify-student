'use client';

import { Info, Play } from 'lucide-react';
import { Button, Chip } from '@/components/ui';
import { MIN_GAME_QUESTIONS } from '../../_lib/questionDeck';
import type { PickedTest } from '../../_components/TestPicker';
import { QuestionSummary, TeamSetup, TimerField } from '../../_components/TeamGameSettings';
import { questionsFor, ROAD_LENGTHS } from '../_lib/engine';
import type { CaravanText } from '../_lib/i18n';

interface Props {
  picked: PickedTest | null;
  teamCount: number;
  onTeamCount: (n: number) => void;
  names: string[];
  onName: (i: number, value: string) => void;
  length: number;
  onLength: (n: number) => void;
  seconds: number | null;
  onSeconds: (s: number | null) => void;
  onStart: () => void;
  t: CaravanText;
}

/**
 * Road length is never locked by the test size: the whole deck is played and
 * running out just ends the race early (furthest caravan wins), so a short
 * test only gets a gentle note.
 */
export default function CaravanSettings({ picked, teamCount, onTeamCount, names, onName, length, onLength, seconds, onSeconds, onStart, t }: Props) {
  const usable = picked?.analysis.usable.length ?? 0;
  const enough = usable >= MIN_GAME_QUESTIONS;
  const need = questionsFor(length);

  return (
    <div className="flex flex-col gap-4">
      <TeamSetup teamCount={teamCount} onTeamCount={onTeamCount} names={names} onName={onName} t={t} />

      <div>
        <p className="mb-2 text-[13px] font-bold text-on-surface">{t.road}</p>
        <div className="flex flex-wrap gap-2">
          {ROAD_LENGTHS.map((n, i) => (
            <Chip key={n} selected={length === n} onClick={() => onLength(n)}>
              {t.roadNames[i]} · {t.steps(n)}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-medium text-on-surface-variant">{t.roadHint(need)}</p>
        {picked && enough && usable < need && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[12px] font-semibold text-warning">
            <Info size={14} className="mt-px shrink-0" /> {t.roadShort(usable)}
          </p>
        )}
      </div>

      <TimerField seconds={seconds} onSeconds={onSeconds} t={t} />
      <QuestionSummary picked={picked} t={t} />

      <Button size="lg" icon={<Play />} disabled={!picked || !enough} onClick={onStart} className="w-full">
        {t.start}
      </Button>
    </div>
  );
}
