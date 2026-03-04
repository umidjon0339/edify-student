'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, documentId } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { useTeacherLanguage } from '@/app/teacher/layout'; 
import { 
  Sparkles, ChevronDown, Loader2, BookOpen, 
  FileText, BrainCircuit, AlertCircle, Users, XCircle, RefreshCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

const AI_ANALYTICS_TRANSLATIONS = {
  uz: {
    title: "AI Tahlilchi",
    subtitle: "Sun'iy intellekt yordamida sinf natijalarini chuqur tahlil qiling.",
    modeAssign: "Topshiriq bo'yicha",
    modeStudent: "O'quvchi bo'yicha",
    selectClass: "1. Sinfni tanlang",
    selectAssign: "2. Topshiriqni tanlang",
    selectStudent: "2. O'quvchini tanlang",
    generateBtn: "AI Tahlilni Boshlash",
    generating: "Ma'lumotlar o'qilmoqda va tahlil qilinmoqda...",
    noData: "Tahlil qilish uchun ma'lumot yetarli emas.",
    emptyAssign: "Bu sinfda topshiriqlar yo'q.",
    emptyStudent: "Bu sinfda o'quvchilar yo'q.",
    resultTitle: "AI Xulosasi",
    errorTitle: "Tizim Band Yoki Limit Tugadi",
    errorDesc: "Google AI serverlari ayni damda band yoki sizning so'rov limitlaringiz tugadi. Iltimos, birozdan so'ng qayta urinib ko'ring."
  },
  en: {
    title: "AI Analyst",
    subtitle: "Get deep, instant insights into your classroom performance using AI.",
    modeAssign: "By Assignment",
    modeStudent: "By Student",
    selectClass: "1. Select a Class",
    selectAssign: "2. Select an Assignment",
    selectStudent: "2. Select a Student",
    generateBtn: "Generate AI Insights",
    generating: "Reading data and generating insights...",
    noData: "Not enough data to analyze yet.",
    emptyAssign: "No assignments in this class.",
    emptyStudent: "No students in this class.",
    resultTitle: "AI Summary",
    errorTitle: "API Limit Reached or Busy",
    errorDesc: "The Google AI servers are currently busy, or your API rate limit has been exceeded. Please wait a moment and try again."
  },
  ru: {
    title: "ИИ Аналитик",
    subtitle: "Глубокий анализ результатов класса с помощью искусственного интеллекта.",
    modeAssign: "По Заданию",
    modeStudent: "По Ученику",
    selectClass: "1. Выберите Класс",
    selectAssign: "2. Выберите Задание",
    selectStudent: "2. Выберите Ученика",
    generateBtn: "Сгенерировать ИИ Анализ",
    generating: "Чтение данных и создание отчета...",
    noData: "Недостаточно данных для анализа.",
    emptyAssign: "В этом классе нет заданий.",
    emptyStudent: "В этом классе нет учеников.",
    resultTitle: "ИИ Отчет",
    errorTitle: "Лимит API или Сервер Занят",
    errorDesc: "Серверы Google AI сейчас заняты или превышен лимит запросов. Пожалуйста, подождите немного и повторите попытку."
  }
};

export default function AIAnalyticsPage() {
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = AI_ANALYTICS_TRANSLATIONS[lang];

  // --- STATE ---
  const [analysisMode, setAnalysisMode] = useState<'assignment' | 'student'>('assignment');
  
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignId, setSelectedAssignId] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [apiError, setApiError] = useState(false);

  // 1. FETCH CLASSES
  useEffect(() => {
    if (!user) return;
    const fetchClasses = async () => {
      try {
        const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchClasses();
  }, [user]);

  // 2. FETCH ASSIGNMENTS & STUDENTS WHEN CLASS CHANGES
  useEffect(() => {
    if (!selectedClassId) return;
    const fetchClassDetails = async () => {
      try {
        // A. Fetch Assignments
        const assignSnap = await getDocs(collection(db, 'classes', selectedClassId, 'assignments'));
        const assignData = assignSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAssignments(assignData);
        if (assignData.length > 0) setSelectedAssignId(assignData[0].id);
        else setSelectedAssignId('');

        // B. Fetch Students
        const classDoc = await getDoc(doc(db, 'classes', selectedClassId));
        const studentIds = classDoc.data()?.studentIds || [];
        
        if (studentIds.length > 0) {
          // Fetch student profiles in chunks of 10 to avoid Firebase 'in' limits
          const studentChunks = [];
          for (let i = 0; i < studentIds.length; i += 10) {
             studentChunks.push(studentIds.slice(i, i + 10));
          }
          const studentPromises = studentChunks.map(chunk => 
             getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
          );
          const studentSnaps = await Promise.all(studentPromises);
          const studentData = studentSnaps.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
          
          setStudents(studentData);
          if (studentData.length > 0) setSelectedStudentId(studentData[0].id);
        } else {
          setStudents([]);
          setSelectedStudentId('');
        }

        setAiResponse(null);
        setApiError(false);
      } catch (e) { console.error(e); }
    };
    fetchClassDetails();
  }, [selectedClassId]);

  // 3. GENERATE AI INSIGHTS
  const handleGenerateInsights = async () => {
    if (!selectedClassId) return;
    if (analysisMode === 'assignment' && !selectedAssignId) return;
    if (analysisMode === 'student' && !selectedStudentId) return;

    setIsGenerating(true);
    setAiResponse(null);
    setApiError(false);

    try {
      let payloadForAI: any = {};

      if (analysisMode === 'assignment') {
        // --- BY ASSIGNMENT LOGIC ---
        const assignSnap = await getDoc(doc(db, 'classes', selectedClassId, 'assignments', selectedAssignId));
        const attemptsQuery = query(collection(db, 'attempts'), where('classId', '==', selectedClassId), where('assignmentId', '==', selectedAssignId));
        const attemptsSnap = await getDocs(attemptsQuery);
        
        if (attemptsSnap.empty) {
          toast.error(t.noData);
          setIsGenerating(false); return;
        }

        const attemptsData = await Promise.all(attemptsSnap.docs.map(async (d) => {
           const data = d.data();
           let name = "Unknown";
           if (data.userId) {
              const uSnap = await getDoc(doc(db, 'users', data.userId));
              if (uSnap.exists()) name = uSnap.data().displayName || "Unknown";
           }
           return {
             studentName: name,
             scorePct: Math.round((data.score / data.totalQuestions) * 100) + "%",
             attemptsUsed: data.attemptsTaken,
             tabSwitches: data.tabSwitches
           };
        }));

        payloadForAI = {
          assignmentTitle: assignSnap.data()?.title || "Test",
          totalSubmissions: attemptsData.length,
          studentResults: attemptsData
        };

      } else {
        // --- BY STUDENT LOGIC ---
        const studentSnap = await getDoc(doc(db, 'users', selectedStudentId));
        const attemptsQuery = query(collection(db, 'attempts'), where('classId', '==', selectedClassId), where('userId', '==', selectedStudentId));
        const attemptsSnap = await getDocs(attemptsQuery);

        if (attemptsSnap.empty) {
          toast.error(t.noData);
          setIsGenerating(false); return;
        }

        const attemptsData = attemptsSnap.docs.map(d => {
           const data = d.data();
           return {
             testTitle: data.testTitle || "Unknown Test",
             scorePct: Math.round((data.score / data.totalQuestions) * 100) + "%",
             attemptsUsed: data.attemptsTaken,
             tabSwitches: data.tabSwitches
           };
        });

        payloadForAI = {
          studentName: studentSnap.data()?.displayName || "Student",
          testsTaken: attemptsData.length,
          performanceHistory: attemptsData
        };
      }

      // SEND TO BACKEND
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptData: payloadForAI, lang: lang, analysisMode: analysisMode })
      });

      if (!response.ok) throw new Error("API_LIMIT");
      
      const result = await response.json();
      setAiResponse(result.text);

    } catch (error) {
      console.error(error);
      // 🟢 TRIGGER THE ERROR UI CARD INSTEAD OF CRASHING
      setApiError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800 pb-20">
      
      {/* HEADER */}
      <div className="max-w-4xl mx-auto mb-10 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-100 text-indigo-600 rounded-full mb-4">
          <BrainCircuit size={40} />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">{t.title}</h1>
        <p className="text-slate-500 font-medium text-lg">{t.subtitle}</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* TABS CONTROLLER */}
        <div className="flex justify-center mb-6">
          <div className="bg-slate-200/50 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner">
             <button 
               onClick={() => { setAnalysisMode('assignment'); setAiResponse(null); setApiError(false); }}
               className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${analysisMode === 'assignment' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                {t.modeAssign}
             </button>
             <button 
               onClick={() => { setAnalysisMode('student'); setAiResponse(null); setApiError(false); }}
               className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${analysisMode === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                {t.modeStudent}
             </button>
          </div>
        </div>

        {/* SELECTION CONTROLS */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row gap-6 transition-all duration-300">
          
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <BookOpen size={16}/> {t.selectClass}
            </label>
            <div className="relative">
              <select 
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-slate-100 hover:border-indigo-200 rounded-xl font-bold text-slate-700 outline-none appearance-none cursor-pointer transition-colors"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
            </div>
          </div>

          <div className="flex-1 animate-in fade-in zoom-in duration-300">
            {analysisMode === 'assignment' ? (
              <>
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText size={16}/> {t.selectAssign}
                </label>
                <div className="relative">
                  <select 
                    value={selectedAssignId}
                    onChange={(e) => setSelectedAssignId(e.target.value)}
                    disabled={assignments.length === 0}
                    className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-slate-100 hover:border-indigo-200 rounded-xl font-bold text-slate-700 outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {assignments.length === 0 ? <option value="">{t.emptyAssign}</option> : assignments.map(a => <option key={a.id} value={a.id}>{a.testTitle || a.title}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                </div>
              </>
            ) : (
              <>
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Users size={16}/> {t.selectStudent}
                </label>
                <div className="relative">
                  <select 
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={students.length === 0}
                    className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-slate-100 hover:border-indigo-200 rounded-xl font-bold text-slate-700 outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {students.length === 0 ? <option value="">{t.emptyStudent}</option> : students.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                </div>
              </>
            )}
          </div>
        </div>

        {/* GENERATE BUTTON */}
        <div className="flex justify-center">
          <button 
            onClick={handleGenerateInsights}
            disabled={isGenerating || (analysisMode === 'assignment' && !selectedAssignId) || (analysisMode === 'student' && !selectedStudentId)}
            className="group relative px-8 py-4 bg-slate-900 text-white font-black text-lg rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-20 transition-opacity bg-[length:200%_auto] animate-gradient"></div>
            
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={24} /> Generating...</>
            ) : (
              <><Sparkles className="text-amber-400" size={24} /> {t.generateBtn}</>
            )}
          </button>
        </div>

        {/* LOADING UI */}
        {isGenerating && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-[2rem] border border-indigo-100 text-center animate-pulse mt-8">
             <BrainCircuit size={48} className="text-indigo-400 mx-auto mb-4 animate-bounce" />
             <p className="text-lg font-bold text-indigo-800">{t.generating}</p>
          </div>
        )}

        {/* 🟢 ERROR UI (Graceful Fallback) */}
        {apiError && !isGenerating && (
          <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100 mt-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
             <div className="flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                 <XCircle size={32} />
               </div>
               <h2 className="text-xl font-black text-red-900 mb-2">{t.errorTitle}</h2>
               <p className="text-red-700/80 font-medium max-w-md mx-auto mb-6">{t.errorDesc}</p>
               <button 
                 onClick={handleGenerateInsights}
                 className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 font-bold rounded-xl shadow-sm border border-red-100 hover:bg-red-50 active:scale-95 transition-all"
               >
                 <RefreshCcw size={18} /> Retry
               </button>
             </div>
          </div>
        )}

        {/* AI RESPONSE UI */}
        {aiResponse && !isGenerating && !apiError && (
          <div className="bg-white p-8 md:p-10 rounded-[2rem] border-2 border-indigo-100 shadow-2xl shadow-indigo-100/50 mt-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Sparkles className="text-indigo-600" size={28}/> {t.resultTitle}
            </h2>
            
            <div className="prose prose-slate max-w-none text-lg leading-relaxed font-medium text-slate-700">
              {aiResponse.split('\n').map((paragraph, idx) => (
                paragraph.trim() !== '' && <p key={idx} className="mb-4">{paragraph}</p>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3 text-sm font-bold text-slate-400 bg-slate-50 p-4 rounded-xl">
              <AlertCircle size={18} className="text-indigo-400 shrink-0"/>
              AI-generated insights are based on completed attempts. Review raw data for final grading.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}