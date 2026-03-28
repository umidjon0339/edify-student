'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Printer, Columns, Type, Layout, 
  Minus, Plus, Smartphone, Grid, ZoomIn, ZoomOut, 
  CheckSquare, FileText, Download, ScanLine, 
  List, Grid3X3, Shuffle, Settings, Edit3, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import LatexRenderer from '@/components/LatexRenderer';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- 1. TRANSLATION DICTIONARY ---
const PRINT_TRANSLATIONS = {
  uz: {
    title: "Chop Etish Studiyasi", back: "Ortga", shuffle: "Savollarni Aralashtirish",
    layout: "Ko'rinish", cols: "{n} Ustun", lines: "Ajratuvchi chiziqlar",
    header: "Sarlavha Ma'lumotlari", schoolPlace: "Maktab / O'quv markaz nomi", teacherPlace: "O'qituvchi", studentInfo: "O'quvchi Ma'lumotlari (Ism, Sana...)",
    typography: "Matn Sozlamalari", size: "O'lcham",
    answers: "Javoblar Varaqasi", ansStyles: { none: "Yo'q", standard: "Standart", writein: "Yozma (Katak)", grid: "Katakli" },
    keys: "Javoblar Kaliti", keyStyles: { none: "Yashirin", inline: "Savol yonida", end: "Sahifa oxirida" },
    download: "HTML Yuklab Olish", print: "Hujjatni Chop Etish", preview: "Ko'rib Chiqish",
    total: "Jami Savollar", name: "Ism", date: "Sana", group: "Guruh", score: "Ball"
  },
  en: {
    title: "Print Studio", back: "Go Back", shuffle: "Shuffle Questions",
    layout: "Layout", cols: "{n} Col", lines: "Divider Lines",
    header: "Header Details", schoolPlace: "School / Center Name", teacherPlace: "Teacher Name", studentInfo: "Student Info Header",
    typography: "Typography", size: "Size",
    answers: "Bubble Sheet", ansStyles: { none: "None", standard: "Standard", writein: "Write-in", grid: "Grid" },
    keys: "Answer Key", keyStyles: { none: "Hidden", inline: "Inline", end: "End of Page" },
    download: "Download HTML", print: "Print Document", preview: "Preview",
    total: "Total Questions", name: "Name", date: "Date", group: "Group", score: "Score"
  },
  ru: {
    title: "Студия Печати", back: "Назад", shuffle: "Перемешать Вопросы",
    layout: "Макет", cols: "{n} Кол", lines: "Разделительные линии",
    header: "Заголовок", schoolPlace: "Название Школы", teacherPlace: "Имя Учителя", studentInfo: "Шапка Ученика",
    typography: "Типография", size: "Размер",
    answers: "Бланк Ответов", ansStyles: { none: "Нет", standard: "Стандарт", writein: "Вписать", grid: "Сетка" },
    keys: "Ключи Ответов", keyStyles: { none: "Скрыто", inline: "Рядом", end: "В конце" },
    download: "Скачать HTML", print: "Распечатать", preview: "Предпросмотр",
    total: "Всего вопросов", name: "Имя", date: "Дата", group: "Группа", score: "Балл"
  }
};

const getContentText = (content: any) => {
  if (!content) return "";
  if (typeof content === 'string') return content;
  return content.uz || content.en || content.ru || content.text || JSON.stringify(content);
};

export default function PrintStudioPage() {
  const { lang } = useTeacherLanguage();
  const t = PRINT_TRANSLATIONS[lang] || PRINT_TRANSLATIONS['en'];

  const [isLoaded, setIsLoaded] = useState(false);
  const [originalData, setOriginalData] = useState<{ title: string; questions: any[] } | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]);

  // --- CONFIGURATION ---
  const [columns, setColumns] = useState<1 | 2 | 3>(2);
  const [showLines, setShowLines] = useState(true);
  const [headerInfo, setHeaderInfo] = useState({ school: '', teacher: '' });
  const [showStudentHeader, setShowStudentHeader] = useState(true);
  const [fontSize, setFontSize] = useState<number>(11);
  const [showAnswers, setShowAnswers] = useState<'none' | 'inline' | 'end'>('none');
  const [answerSheet, setAnswerSheet] = useState<'none' | 'standard' | 'writein' | 'grid'>('none');
  const [previewZoom, setPreviewZoom] = useState(1);
  
  const printRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('print_payload');
      if (stored) {
        const parsed = JSON.parse(stored);
        setOriginalData(parsed);
        setActiveQuestions(parsed.questions || []);
      }
    } catch (e) { console.error("Load error"); } 
    finally { setIsLoaded(true); }
  }, []);

  const handleShuffle = () => {
    const shuffled = [...activeQuestions].sort(() => 0.5 - Math.random());
    setActiveQuestions(shuffled);
  };

  // 🟢 NATIVE PRINT TRIGGER
  const handleNativePrint = () => {
    window.print();
  };

  if (!isLoaded) return null;
  if (!originalData) return <div className="p-10 text-center font-bold text-slate-500">No data found. Please return to the library and select a test to print.</div>;

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col md:flex-row font-sans text-slate-900 print:bg-white print:block">
      
      {/* --- SIDEBAR CONTROLS (Vercel Style) --- */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200/80 h-auto md:h-screen overflow-y-auto shrink-0 shadow-xl z-20 flex flex-col print:hidden">
        
        <div className="p-5 border-b border-slate-100 bg-white sticky top-0 z-10 flex items-center justify-between">
          <h2 className="font-black text-[16px] text-slate-900 tracking-tight flex items-center gap-2">
            <Printer size={18} className="text-indigo-600"/> {t.title}
          </h2>
          <Link href="/teacher/library" className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <ArrowLeft size={16} strokeWidth={2.5}/>
          </Link>
        </div>

        <div className="p-5 space-y-5 flex-1 custom-scrollbar">
          
          <button onClick={handleShuffle} className="w-full py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-[1rem] flex items-center justify-center gap-2 transition-colors border border-indigo-100 active:scale-95">
            <Shuffle size={18} strokeWidth={2.5} /> {t.shuffle}
          </button>

          {/* Layout Block */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-[1.2rem] shadow-sm space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Layout size={14}/> {t.layout}</label>
            <div className="grid grid-cols-3 gap-2">
               {[1, 2, 3].map(col => (
                 <button key={col} onClick={() => setColumns(col as any)} className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1.5 transition-all ${columns === col ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                   {col === 1 ? <Smartphone size={16}/> : col === 2 ? <Columns size={16}/> : <Grid size={16}/>} {t.cols.replace("{n}", col.toString())}
                 </button>
               ))}
            </div>
            {columns > 1 && (
              <label className="flex items-center gap-2 cursor-pointer mt-3 text-[12px] font-bold text-slate-600">
                <input type="checkbox" checked={showLines} onChange={() => setShowLines(!showLines)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/> {t.lines}
              </label>
            )}
          </div>

          {/* Header Info Block */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-[1.2rem] shadow-sm space-y-3">
             <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Settings size={14}/> {t.header}</label>
             <input type="text" placeholder={t.schoolPlace} value={headerInfo.school} onChange={e => setHeaderInfo({...headerInfo, school: e.target.value})} className="w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-medium transition-colors" />
             <input type="text" placeholder={t.teacherPlace} value={headerInfo.teacher} onChange={e => setHeaderInfo({...headerInfo, teacher: e.target.value})} className="w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-medium transition-colors" />
             <label className="flex items-center gap-2 cursor-pointer mt-2 text-[12px] font-bold text-slate-600">
                <input type="checkbox" checked={showStudentHeader} onChange={() => setShowStudentHeader(!showStudentHeader)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/> {t.studentInfo}
             </label>
          </div>

          {/* Typography Block */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-[1.2rem] shadow-sm space-y-3">
             <div className="flex justify-between items-center">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Type size={14}/> {t.typography}</label>
                <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{fontSize}pt</span>
             </div>
             <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                <button onClick={() => setFontSize(Math.max(8, fontSize - 1))} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg shadow-sm"><Minus size={14}/></button>
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${((fontSize - 8) / 16) * 100}%` }}></div>
                </div>
                <button onClick={() => setFontSize(Math.min(24, fontSize + 1))} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg shadow-sm"><Plus size={14}/></button>
             </div>
          </div>

          {/* Answer Sheet Block */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-[1.2rem] shadow-sm space-y-3">
             <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ScanLine size={14}/> {t.answers}</label>
             <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAnswerSheet('none')} className={`p-2 rounded-xl border text-[11px] font-bold ${answerSheet === 'none' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{t.ansStyles.none}</button>
                <button onClick={() => setAnswerSheet('standard')} className={`p-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 ${answerSheet === 'standard' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}><List size={14}/> {t.ansStyles.standard}</button>
                <button onClick={() => setAnswerSheet('writein')} className={`p-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 ${answerSheet === 'writein' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}><Edit3 size={14}/> {t.ansStyles.writein}</button>
                <button onClick={() => setAnswerSheet('grid')} className={`p-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 ${answerSheet === 'grid' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}><Grid3X3 size={14}/> {t.ansStyles.grid}</button>
             </div>
          </div>

          {/* Answer Key Block */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-[1.2rem] shadow-sm space-y-3">
             <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CheckSquare size={14}/> {t.keys}</label>
             <select value={showAnswers} onChange={(e) => setShowAnswers(e.target.value as any)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-colors cursor-pointer">
               <option value="none">{t.keyStyles.none}</option>
               <option value="inline">{t.keyStyles.inline}</option>
               <option value="end">{t.keyStyles.end}</option>
             </select>
          </div>

        </div>

        <div className="p-5 border-t border-slate-200/80 bg-white sticky bottom-0 space-y-2 z-10">
          <button onClick={handleNativePrint} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition-all active:scale-95">
            <Printer size={18} /> {t.print}
          </button>
        </div>
      </div>

      {/* --- PREVIEW AREA --- */}
      <div className="flex-1 bg-slate-200/50 relative overflow-hidden flex flex-col print:bg-white print:p-0 print:overflow-visible">
        
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-sm border border-slate-200/80 print:hidden">
          <button onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500"><ZoomOut size={16}/></button>
          <span className="text-[12px] font-black self-center w-12 text-center text-slate-700">{Math.round(previewZoom * 100)}%</span>
          <button onClick={() => setPreviewZoom(Math.min(1.5, previewZoom + 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500"><ZoomIn size={16}/></button>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center print:p-0 print:block custom-scrollbar">
          
          {/* --- A4 PAPER CANVAS --- */}
          <div 
            id="print-root" 
            ref={printRootRef}
            className="bg-white shadow-2xl transition-transform duration-200 origin-top print:shadow-none print:w-full print:scale-100 print:transform-none"
            style={{
              transform: `scale(${previewZoom})`,
              width: '210mm',
              minHeight: '297mm', 
              padding: '5mm 15mm 15mm 15mm', // 🟢 CHANGED: 5mm top padding, 15mm sides
              fontSize: `${fontSize}pt`
            }}
          >
            {/* INJECTED PRINT CSS */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                /* 1. Set margin to 0 to forcefully hide Browser URLs and Dates */
                @page { size: A4; margin: 0; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
                
                /* 2. Hide ALL global Next.js Layout elements (Navbars, Sidebars) */
                body * { visibility: hidden; }
                
                /* 3. Extract ONLY our A4 paper and make it visible */
                #print-root, #print-root * { visibility: visible; }
                
                /* 4. Snap the paper to the absolute top-left of the real printer page */
                #print-root { 
                  position: absolute; 
                  left: 0; 
                  top: 0; 
                  width: 100%; 
                  padding: 15mm !important; /* Our custom safe margin */
                  transform: none !important; /* Ignore the UI zoom level */
                }
                
                .avoid-break { break-inside: avoid-column; page-break-inside: avoid; }
                .break-before { page-break-before: always; }
              }
            `}} />

            {/* HEADER */}
            <div className="mb-5 pb-3 border-b-2 border-slate-800">
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  {headerInfo.school && <h3 className="text-[1.1em] font-black uppercase tracking-widest text-slate-500 mb-1">{headerInfo.school}</h3>}
                  <h1 className="text-[2em] font-black text-black uppercase leading-tight">{originalData.title}</h1>
                  {headerInfo.teacher && <div className="text-[0.9em] font-bold text-slate-600 mt-1">{t.teacherPlace}: {headerInfo.teacher}</div>}
                </div>
                <div className="text-right shrink-0">
                   <div className="font-bold text-slate-500 text-[0.8em] uppercase tracking-widest">
                      {t.total}: <span className="text-black text-[1.2em] ml-1">{activeQuestions.length}</span>
                   </div>
                </div>
              </div>
              
              {showStudentHeader && (
                <div className="flex gap-4 mt-5 pt-2 text-[0.9em]">
                    <div className="flex-1 flex items-end gap-2">
                      <span className="font-bold uppercase tracking-wide shrink-0">{t.name}:</span>
                      <div className="flex-1 border-b border-slate-400 h-4"></div>
                    </div>
                    <div className="w-32 flex items-end gap-2">
                      <span className="font-bold uppercase tracking-wide shrink-0">{t.date}:</span>
                      <div className="flex-1 border-b border-slate-400 h-4"></div>
                    </div>
                    <div className="w-24 flex items-end gap-2">
                      <span className="font-bold uppercase tracking-wide shrink-0">{t.group}:</span>
                      <div className="flex-1 border-b border-slate-400 h-4"></div>
                    </div>
                    <div className="w-20 flex items-end gap-2">
                      <span className="font-bold uppercase tracking-wide shrink-0">{t.score}:</span>
                      <div className="flex-1 border-b border-slate-400 h-4"></div>
                    </div>
                </div>
              )}
            </div>

            {/* 🟢 FIXED: INLINE STYLES FOR COLUMNS (Prevents Tailwind Stripping) */}
            <div style={{
                columnCount: columns,
                columnGap: columns > 1 ? '2rem' : '0',
                columnRule: (columns > 1 && showLines) ? '1px solid #cbd5e1' : 'none'
            }}>
              {activeQuestions.map((q: any, idx: number) => {
                const sortedOptions = Object.entries(q.options || {}).sort(([keyA], [keyB]) => 
                  String(keyA).localeCompare(String(keyB))
                );

                return (
                  <div 
                    key={q.id || idx} 
                    className="mb-4 avoid-break" 
                    style={{ breakInside: 'avoid-column', display: 'inline-block', width: '100%' }}
                  >
                    <div className="flex gap-2 mb-1.5">
                      <span className="font-black text-black shrink-0 text-[1.1em]">{idx + 1}.</span>
                      <div className="font-medium text-black leading-relaxed text-[1em]">
                        <LatexRenderer latex={getContentText(q.question)} />
                      </div>
                    </div>
                    
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: columns === 3 ? '1fr' : 'repeat(2, 1fr)',
                        gap: '0.25rem 0.5rem',
                        marginLeft: '1.5rem'
                    }}>
                      {sortedOptions.map(([key, val]: any) => {
                        const isCorrect = key === q.answer;
                        const showCorrect = (showAnswers === 'inline' && isCorrect);
                        return (
                          <div key={key} className={`flex items-start gap-2 ${showCorrect ? 'font-bold text-black' : 'text-slate-800'}`}>
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[0.7em] font-black shrink-0 mt-0.5 ${showCorrect ? 'border-black bg-slate-200' : 'border-slate-400'}`}>
                              {key}
                            </span>
                            <span className="text-[0.95em] leading-snug"><LatexRenderer latex={getContentText(val)} /></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TEACHER KEY */}
            {showAnswers === 'end' && (
              <div className="break-before mt-8 pt-6 border-t-2 border-dashed border-slate-400">
                <h3 className="font-black text-[1.2em] text-black mb-4 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={18}/> {t.keys}</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[1em] font-mono">
                  {activeQuestions.map((q: any, idx: number) => (
                    <span key={idx} className="inline-block bg-slate-50 px-2 py-1 border border-slate-200 rounded">
                      <strong className="text-slate-500 mr-1">{idx + 1}.</strong> <span className="font-black">{q.answer}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 🟢 FIXED: INLINE STYLES FOR ANSWER SHEETS */}
            {answerSheet !== 'none' && (
               <div className="avoid-break mt-8 pt-6 border-t-2 border-black">
                  
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-[1.2em] font-black uppercase tracking-widest">{t.answers}</h2>
                     <div className="flex items-end gap-2">
                        <span className="text-[0.9em] font-bold uppercase tracking-wide">{t.score}:</span>
                        <div className="w-16 h-8 border-2 border-black rounded-md"></div>
                     </div>
                  </div>

                  {/* 1. STANDARD BUBBLES */}
                  {answerSheet === 'standard' && (
                     <div style={{ columnCount: columns === 1 ? 2 : columns === 2 ? 3 : 4, columnGap: '2rem', fontSize: '0.9em' }}>
                       {activeQuestions.map((q, idx) => (
                         <div key={idx} className="flex items-center gap-3 mb-2 avoid-break" style={{ breakInside: 'avoid' }}>
                            <span className="font-black w-6 text-right">{idx + 1}.</span>
                            <div className="flex gap-1.5">
                               {['A','B','C','D'].map(opt => (
                                 <div key={opt} className="w-5 h-5 rounded-full border-2 border-slate-400 flex items-center justify-center font-bold text-[0.7em] text-slate-500">
                                   {opt}
                                 </div>
                               ))}
                            </div>
                         </div>
                       ))}
                     </div>
                  )}

                  {/* 2. WRITE-IN STYLE */}
                  {answerSheet === 'writein' && (
                     <div style={{ columnCount: columns === 1 ? 2 : columns === 2 ? 4 : 5, columnGap: '1.5rem', fontSize: '0.9em' }}>
                       {activeQuestions.map((q, idx) => (
                         <div key={idx} className="flex items-end gap-2 mb-3 avoid-break" style={{ breakInside: 'avoid' }}>
                            <span className="font-black w-6 text-right">{idx + 1}.</span>
                            <div className="w-10 h-6 border-b-2 border-black bg-slate-50/50"></div>
                         </div>
                       ))}
                     </div>
                  )}

                  {/* 3. GRID STYLE */}
                  {answerSheet === 'grid' && (
                     <div style={{ 
                       display: 'grid', 
                       gridTemplateColumns: `repeat(${columns === 1 ? 2 : columns === 2 ? 4 : 5}, 1fr)`, 
                       gap: '0.75rem', 
                       fontSize: '0.85em' 
                     }}>
                       {activeQuestions.map((q, idx) => (
                         <div key={idx} className="border-2 border-slate-300 p-2 rounded-lg flex justify-between items-center bg-slate-50/50">
                            <span className="font-black mr-2">{idx + 1}</span>
                            <div className="flex gap-1">
                               {['A','B','C','D'].map(opt => (
                                 <div key={opt} className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[0.65em] font-bold text-slate-500 bg-white">
                                   {opt}
                                 </div>
                               ))}
                            </div>
                         </div>
                       ))}
                     </div>
                  )}
               </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}