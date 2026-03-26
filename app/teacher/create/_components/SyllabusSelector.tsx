'use client';

import { useState, useEffect } from 'react';
import rawSyllabusData from '@/data/syllabus.json';

interface Props {
  onChange: (selection: any) => void;
}

export default function SyllabusSelector({ onChange }: Props) {
  const categories: any[] = Array.isArray(rawSyllabusData) ? rawSyllabusData : [];

  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<any | null>(null);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  useEffect(() => {
    onChange({
      topic: selectedTopic,
      chapter: selectedChapter,
      subtopic: selectedSubtopic,
      difficulty: difficulty
    });
  }, [selectedTopic, selectedChapter, selectedSubtopic, difficulty, onChange]);

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
      
      {/* TOPIC */}
      <div>
        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Subject Topic</label>
        <select 
          className="w-full p-2.5 rounded-lg border border-slate-300 text-sm outline-none"
          value={selectedTopic?.index || ""}
          onChange={(e) => {
            const topic = categories.find(c => c.index === Number(e.target.value)) || null;
            setSelectedTopic(topic);
            setSelectedChapter(null);
            setSelectedSubtopic(null);
          }}
        >
          <option value="" disabled>Select a Topic...</option>
          {categories.map(cat => <option key={cat.index} value={cat.index}>{cat.category}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* CHAPTER */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Chapter</label>
          <select 
            disabled={!selectedTopic}
            className="w-full p-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100 outline-none"
            value={selectedChapter?.index || ""}
            onChange={(e) => {
              const chapter = selectedTopic?.chapters.find((c: any) => c.index === Number(e.target.value)) || null;
              setSelectedChapter(chapter);
              setSelectedSubtopic(null);
            }}
          >
            <option value="" disabled>Select Chapter...</option>
            {selectedTopic?.chapters?.map((chap: any) => <option key={chap.index} value={chap.index}>{chap.chapter}</option>)}
          </select>
        </div>

        {/* SUBTOPIC */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Subtopic</label>
          <select 
            disabled={!selectedChapter}
            className="w-full p-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100 outline-none"
            value={selectedSubtopic?.index || ""}
            onChange={(e) => {
              const sub = selectedChapter?.subtopics.find((s: any) => s.index === Number(e.target.value)) || null;
              setSelectedSubtopic(sub);
            }}
          >
            <option value="" disabled>Select Subtopic...</option>
            {selectedChapter?.subtopics?.map((sub: any) => <option key={sub.index} value={sub.index}>{sub.name}</option>)}
          </select>
        </div>
      </div>

      {/* DIFFICULTY */}
      <div className="pt-2 border-t border-slate-200 mt-2">
          <label className="text-xs font-bold text-slate-500 mb-2 block">Difficulty Level</label>
          <div className="flex gap-2">
            {['Easy', 'Medium', 'Hard'].map((lvl: any) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDifficulty(lvl)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                  difficulty === lvl 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
      </div>
    </div>
  );
}