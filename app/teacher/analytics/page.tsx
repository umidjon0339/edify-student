'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, orderBy, limit, startAfter } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { useTeacherLanguage } from '@/app/teacher/layout'; 
import { 
  Sparkles, ChevronDown, Loader2, BookOpen, FileText, BrainCircuit, 
  AlertCircle, Users, XCircle, RefreshCcw, Send, MessageSquare, Clock, ArrowLeft,
  // 🎙️ VOICE ICONS ADDED HERE
  Mic, Volume2, Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import { remoteConfig } from '@/lib/firebase';
import { fetchAndActivate, getNumber } from 'firebase/remote-config';

const AI_ANALYTICS_TRANSLATIONS = {
  uz: {
    title: "AI Tahlilchi", subtitle: "Sinf natijalarini chuqur tahlil qiling.",
    modeAssign: "Topshiriq bo'yicha", modeStudent: "O'quvchi bo'yicha",
    selectClass: "1. Sinfni tanlang", selectAssign: "2. Topshiriqni tanlang", selectStudent: "2. O'quvchini tanlang",
    generateBtn: "AI Tahlilni Boshlash", generating: "Tahlil qilinmoqda...",
    noData: "Ma'lumot yetarli emas.", emptyAssign: "Topshiriqlar yo'q.", emptyStudent: "O'quvchilar yo'q.",
    resultTitle: "AI Xulosasi", limitTitle: "Kunlik Limit Tugadi", limitDesc: "Ertaga qayta urinib ko'ring.",
    errorTitle: "Tizim Band", errorDesc: "Birozdan so'ng urinib ko'ring.",
    chatPlaceholder: "AI dan savol so'rang...", historyEmpty: "Hali saqlangan tahlillar yo'q.",
    chipA1: "Yordamga muhtojlarga xabar", chipA2: "Eng ko'p qilingan xato?", chipA3: "Isinish mashqi",
    chipS1: "Ota-onalar uchun xulosa", chipS2: "Tezlik yoki aniqlik?", chipS3: "Uyga vazifa tavsiyasi",
    loadMore: "Yana yuklash", backToChat: "Tahlilga qaytish",
    playVoice: "Ovozli eshitish", stopVoice: "To'xtatish"
  },
  en: {
    title: "AI Analyst", subtitle: "Get deep insights into your classroom performance.",
    modeAssign: "By Assignment", modeStudent: "By Student",
    selectClass: "1. Select a Class", selectAssign: "2. Select an Assignment", selectStudent: "2. Select a Student",
    generateBtn: "Generate Insights", generating: "Generating insights...",
    noData: "Not enough data.", emptyAssign: "No assignments.", emptyStudent: "No students.",
    resultTitle: "AI Summary", limitTitle: "Daily Limit Reached", limitDesc: "Please come back tomorrow.",
    errorTitle: "System Busy", errorDesc: "Servers are busy. Please try again.",
    chatPlaceholder: "Ask a follow-up question...", historyEmpty: "No saved insights yet.",
    chipA1: "Message struggling students", chipA2: "Common mistake?", chipA3: "Warm-up activity",
    chipS1: "Parent update", chipS2: "Speed or accuracy?", chipS3: "Homework suggestion",
    loadMore: "Load More", backToChat: "Back to Analysis",
    playVoice: "Listen Aloud", stopVoice: "Stop"
  },
  ru: {
    title: "ИИ Аналитик", subtitle: "Глубокий анализ результатов класса.",
    modeAssign: "По Заданию", modeStudent: "По Ученику",
    selectClass: "1. Выберите Класс", selectAssign: "2. Выберите Задание", selectStudent: "2. Выберите Ученика",
    generateBtn: "Сгенерировать Анализ", generating: "Создание отчета...",
    noData: "Недостаточно данных.", emptyAssign: "Нет заданий.", emptyStudent: "Нет учеников.",
    resultTitle: "ИИ Отчет", limitTitle: "Дневной лимит исчерпан", limitDesc: "Приходите завтра.",
    errorTitle: "Сервер Занят", errorDesc: "Повторите попытку.",
    chatPlaceholder: "Задайте дополнительный вопрос...", historyEmpty: "Нет сохраненных отчетов.",
    chipA1: "Сообщение отстающим", chipA2: "Частая ошибка?", chipA3: "Разминка",
    chipS1: "Отчет для родителей", chipS2: "Скорость или точность?", chipS3: "Рекомендация по домашке",
    loadMore: "Загрузить еще", backToChat: "Назад к анализу",
    playVoice: "Прослушать", stopVoice: "Остановить"
  }
};

type ChatMessage = { role: 'user' | 'model'; text: string; isHidden?: boolean };

export default function AIAnalyticsPage() {
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = AI_ANALYTICS_TRANSLATIONS[lang];

  // UI STATE
  const [analysisMode, setAnalysisMode] = useState<'assignment' | 'student'>('assignment');
  const [showHistoryView, setShowHistoryView] = useState(false);
  
  // SELECTION STATE
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignId, setSelectedAssignId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // AI & CHAT STATE
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<'NONE' | 'LIMIT' | 'BUSY'>('NONE');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentPayload, setCurrentPayload] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // HISTORY STATE (PAGINATION)
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [lastHistoryDoc, setLastHistoryDoc] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // =========================================================================
  // === 🎙️ VOICE FEATURES STATE (OPTIONAL: Comment out if disabling voice) ===
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // =========================================================================

  // 1. INITIAL LOAD
  useEffect(() => {
    if (!user) return;
    const fetchClasses = async () => {
      try {
        const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchClasses();
  }, [user]);

  // 2. FETCH CLASS DETAILS
  useEffect(() => {
    if (!selectedClassId) return;
    const fetchClassDetails = async () => {
      try {
        const assignSnap = await getDocs(collection(db, 'classes', selectedClassId, 'assignments'));
        const assignData = assignSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAssignments(assignData);
        if (assignData.length > 0) setSelectedAssignId(assignData[0].id); else setSelectedAssignId('');

        const classDoc = await getDoc(doc(db, 'classes', selectedClassId));
        const sIds = classDoc.data()?.studentIds || [];
        if (sIds.length > 0) {
            const studentPromises = sIds.map((id:string) => getDoc(doc(db, 'users', id)));
            const studentSnaps = await Promise.all(studentPromises);
            const studentData = studentSnaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() }));
            setStudents(studentData);
            if(studentData.length > 0) setSelectedStudentId(studentData[0].id);
        } else {
            setStudents([]); setSelectedStudentId('');
        }
        setChatHistory([]); setApiError('NONE');
      } catch (e) { console.error(e); }
    };
    fetchClassDetails();
  }, [selectedClassId]);

  // 3. AUTO-SCROLL
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  // 4. HISTORY PAGINATION LOGIC
  const fetchHistoryPage = async (isNextPage = false) => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      let qHistory = query(collection(db, 'ai_sessions'), where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'), limit(5));
      if (isNextPage && lastHistoryDoc) {
        qHistory = query(collection(db, 'ai_sessions'), where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'), startAfter(lastHistoryDoc), limit(5));
      }
      const snapHistory = await getDocs(qHistory);
      const newDocs = snapHistory.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (isNextPage) { setHistorySessions(prev => [...prev, ...newDocs]); } 
      else { setHistorySessions(newDocs); }

      setLastHistoryDoc(snapHistory.docs[snapHistory.docs.length - 1]);
      setHasMoreHistory(snapHistory.docs.length === 5);
    } catch(e) { console.error(e); } finally { setLoadingHistory(false); }
  };

  const openHistoryView = () => {
      setShowHistoryView(true);
      fetchHistoryPage(false);
  };

  const saveSessionToFirebase = async (sessionId: string, newHistory: ChatMessage[], title: string) => {
    if (!user) return;
    await setDoc(doc(db, 'ai_sessions', sessionId), {
      teacherId: user.uid, title: title, createdAt: new Date().toISOString(), messages: newHistory
    }, { merge: true });
  };

  // 5. GENERATE INSIGHTS
  const handleGenerateInsights = async () => {
    if (!selectedClassId) return;
    if (analysisMode === 'assignment' && !selectedAssignId) return;
    if (analysisMode === 'student' && !selectedStudentId) return;

    setIsGenerating(true); setChatHistory([]); setApiError('NONE'); setCurrentSessionId(null);

    try {
      let dynamicDailyLimit = 15; 
      if (remoteConfig) {
         try {
           await fetchAndActivate(remoteConfig);
           dynamicDailyLimit = getNumber(remoteConfig, 'ai_daily_limit');
         } catch(e) { console.error("Remote Config Error:", e); }
      }

      let payloadForAI: any = {};
      let title = "Analysis";

      if (analysisMode === 'assignment') {
        const assignSnap = await getDoc(doc(db, 'classes', selectedClassId, 'assignments', selectedAssignId));
        title = assignSnap.data()?.title || "Assignment Analysis";
        const attemptsSnap = await getDocs(query(collection(db, 'attempts'), where('classId', '==', selectedClassId), where('assignmentId', '==', selectedAssignId)));
        if (attemptsSnap.empty) { toast.error(t.noData); setIsGenerating(false); return; }

        const attemptsData = await Promise.all(attemptsSnap.docs.map(async (d) => {
           const data = d.data();
           let name = "Unknown";
           if (data.userId) { const uSnap = await getDoc(doc(db, 'users', data.userId)); if (uSnap.exists()) name = uSnap.data().displayName || "Unknown"; }
           return { studentName: name, scorePct: Math.round((data.score / data.totalQuestions) * 100) + "%", attemptsUsed: data.attemptsTaken, tabSwitches: data.tabSwitches };
        }));
        payloadForAI = { assignmentTitle: title, totalSubmissions: attemptsData.length, studentResults: attemptsData };
      } else {
        const studentSnap = await getDoc(doc(db, 'users', selectedStudentId));
        title = studentSnap.data()?.displayName || "Student Analysis";
        const attemptsSnap = await getDocs(query(collection(db, 'attempts'), where('classId', '==', selectedClassId), where('userId', '==', selectedStudentId)));
        if (attemptsSnap.empty) { toast.error(t.noData); setIsGenerating(false); return; }

        const attemptsData = attemptsSnap.docs.map(d => {
           const data = d.data(); return { testTitle: data.testTitle || "Test", scorePct: Math.round((data.score / data.totalQuestions) * 100) + "%", attemptsUsed: data.attemptsTaken, tabSwitches: data.tabSwitches };
        });
        payloadForAI = { studentName: title, testsTaken: attemptsData.length, performanceHistory: attemptsData };
      }

      setCurrentPayload(payloadForAI);

      const response = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "initial", promptData: payloadForAI, lang, analysisMode, userId: user?.uid, dailyLimit: dynamicDailyLimit })
      });

      if (response.status === 429) { setApiError('LIMIT'); setIsGenerating(false); return; }
      if (!response.ok) throw new Error("API_LIMIT");
      
      const result = await response.json();
      const newHistory: ChatMessage[] = [ { role: 'user', text: result.initialPromptSent, isHidden: true }, { role: 'model', text: result.text } ];
      setChatHistory(newHistory);
      
      const newSessionId = `sess_${Date.now()}`;
      setCurrentSessionId(newSessionId);
      await saveSessionToFirebase(newSessionId, newHistory, title);

    } catch (error) { setApiError('BUSY'); } finally { setIsGenerating(false); }
  };

  // 6. SEND CHAT
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || (!currentPayload && !showHistoryView) || !currentSessionId) return;

    const newMsg: ChatMessage = { role: 'user', text: textToSend };
    const tempHistory = [...chatHistory, newMsg];
    setChatHistory(tempHistory); setChatInput(''); setIsChatting(true); setApiError('NONE');

    try {
      let dynamicDailyLimit = 15; 
      if (remoteConfig) {
         try {
           await fetchAndActivate(remoteConfig);
           dynamicDailyLimit = getNumber(remoteConfig, 'ai_daily_limit');
         } catch(e) { console.error("Remote Config Error:", e); }
      }

      const formattedHistory = chatHistory.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
      const response = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "chat", promptData: currentPayload || {}, lang, analysisMode, message: textToSend, history: formattedHistory, userId: user?.uid, dailyLimit: dynamicDailyLimit })
      });

      if (response.status === 429) { setApiError('LIMIT'); setIsChatting(false); return; }
      if (!response.ok) throw new Error("API_LIMIT");
      
      const result = await response.json();
      const finalHistory: ChatMessage[] = [...tempHistory, { role: 'model', text: result.text }];
      
      setChatHistory(finalHistory);
      await saveSessionToFirebase(currentSessionId, finalHistory, "Continued Analysis");
    } catch (error) { setApiError('BUSY'); } finally { setIsChatting(false); }
  };

  // =========================================================================
  // === 🎙️ VOICE FUNCTIONS (OPTIONAL: Comment out if disabling voice) =======

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        stream.getTracks().forEach(track => track.stop());

        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
          const res = await fetch('/api/stt', { method: 'POST', body: formData });
          if (!res.ok) throw new Error("STT failed");
          const data = await res.json();
          setChatInput((prev) => (prev + " " + data.text).trim());
        } catch (error) {
          toast.error("Ovozni aniqlashda xatolik yuz berdi.");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Mikrofonga ruxsat berilmagan.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlayAudio = async (text: string, index: number) => {
    if (isPlaying === index && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(index);
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'female' }) 
      });

      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current = new Audio(url);
      audioRef.current.play();
      audioRef.current.onended = () => setIsPlaying(null);
    } catch (error) {
      toast.error("Ovozni yuklashda xatolik yuz berdi.");
      setIsPlaying(null);
    }
  };
  // =========================================================================

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800 pb-20 relative">
      
      {/* HEADER & HISTORY TOGGLE */}
      <div className="max-w-4xl mx-auto mb-10 flex flex-col md:flex-row items-center justify-between relative">
        {!showHistoryView && (
           <button onClick={openHistoryView} className="absolute top-0 right-0 p-3 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 rounded-2xl shadow-sm transition-all flex items-center gap-2 font-bold text-sm">
             <Clock size={18} /> <span className="hidden md:inline">{t.modeHistory}</span>
           </button>
        )}
        <div className="text-center w-full mt-8 md:mt-0">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-100 text-indigo-600 rounded-full mb-4"><BrainCircuit size={40} /></div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">{t.title}</h1>
          <p className="text-slate-500 font-medium text-lg">{t.subtitle}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* === HISTORY VIEW === */}
        {showHistoryView ? (
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-300">
             <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Clock className="text-indigo-500"/> {t.modeHistory}</h3>
                <button onClick={() => {setShowHistoryView(false); setChatHistory([]);}} className="text-slate-400 hover:text-slate-700 flex items-center gap-1 font-bold text-sm bg-slate-100 px-4 py-2 rounded-xl"><ArrowLeft size={16}/> {t.backToChat}</button>
             </div>
             
             {loadingHistory && historySessions.length === 0 ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400"/></div> : 
              historySessions.length === 0 ? <p className="text-center text-slate-500 py-8 font-medium">{t.historyEmpty}</p> : (
               <div className="space-y-4">
                 {historySessions.map(session => (
                   <div key={session.id} onClick={() => { setChatHistory(session.messages); setCurrentSessionId(session.id); setShowHistoryView(false); }} className="group p-5 bg-slate-50 rounded-2xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 border border-transparent transition-all flex justify-between items-center shadow-sm">
                     <div>
                        <p className="font-bold text-slate-800 group-hover:text-indigo-700 text-lg mb-1">{session.title}</p>
                        <p className="text-sm text-slate-500 font-medium">{new Date(session.createdAt).toLocaleString()}</p>
                     </div>
                     <ChevronDown className="text-slate-300 -rotate-90 group-hover:text-indigo-400"/>
                   </div>
                 ))}
                 {hasMoreHistory && (
                    <button onClick={() => fetchHistoryPage(true)} disabled={loadingHistory} className="w-full py-3 mt-4 text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex justify-center items-center gap-2">
                       {loadingHistory ? <Loader2 className="animate-spin" size={18}/> : t.loadMore}
                    </button>
                 )}
               </div>
             )}
          </div>
        ) : (
        /* === MAIN CREATION VIEW === */
        <>
          <div className="flex justify-center mb-6">
            <div className="bg-slate-200/50 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner">
               <button onClick={() => { setAnalysisMode('assignment'); setChatHistory([]); setApiError('NONE'); }} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${analysisMode === 'assignment' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.modeAssign}</button>
               <button onClick={() => { setAnalysisMode('student'); setChatHistory([]); setApiError('NONE'); }} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${analysisMode === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.modeStudent}</button>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><BookOpen size={16}/> {t.selectClass}</label>
              <div className="relative">
                <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none appearance-none">
                  {classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
              </div>
            </div>

            <div className="flex-1">
              {analysisMode === 'assignment' ? (
                <>
                  <label className="block text-sm font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><FileText size={16}/> {t.selectAssign}</label>
                  <div className="relative">
                    <select value={selectedAssignId} onChange={(e) => setSelectedAssignId(e.target.value)} disabled={assignments.length === 0} className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none appearance-none disabled:opacity-50">
                      {assignments.length === 0 ? <option value="">{t.emptyAssign}</option> : assignments.map(a => <option key={a.id} value={a.id}>{a.testTitle || a.title}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                  </div>
                </>
              ) : (
                <>
                  <label className="block text-sm font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Users size={16}/> {t.selectStudent}</label>
                  <div className="relative">
                    <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} disabled={students.length === 0} className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none appearance-none disabled:opacity-50">
                      {students.length === 0 ? <option value="">{t.emptyStudent}</option> : students.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                  </div>
                </>
              )}
            </div>
          </div>

          {chatHistory.length === 0 && (
            <div className="flex justify-center">
              <button onClick={handleGenerateInsights} disabled={isGenerating || (analysisMode === 'assignment' && !selectedAssignId) || (analysisMode === 'student' && !selectedStudentId)} className="group relative px-8 py-4 bg-slate-900 text-white font-black text-lg rounded-2xl shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-3">
                {isGenerating ? <><Loader2 className="animate-spin" size={24} /> Generating...</> : <><Sparkles className="text-amber-400" size={24} /> {t.generateBtn}</>}
              </button>
            </div>
          )}
        </>
        )}

        {/* ERROR ALERTS */}
        {apiError === 'LIMIT' && (
          <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-200 text-center animate-in fade-in slide-in-from-bottom-4">
            <AlertCircle size={32} className="text-amber-500 mx-auto mb-2"/>
            <h2 className="text-xl font-black text-amber-900">{t.limitTitle}</h2>
            <p className="text-amber-800 font-medium">{t.limitDesc}</p>
          </div>
        )}

        {/* THE CHAT UI */}
        {chatHistory.length > 0 && apiError !== 'LIMIT' && (
          <div className="bg-white rounded-[2rem] border-2 border-indigo-100 shadow-2xl mt-8 relative flex flex-col animate-in fade-in slide-in-from-bottom-8">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <div className="p-6 md:p-8 flex-1 space-y-6 max-h-[600px] overflow-y-auto">
            {chatHistory.map((msg, idx) => {
                if (msg.isHidden) return null;
                const isAI = msg.role === 'model';
                return (
                  <div key={idx} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[90%] md:max-w-[80%] p-6 rounded-[2rem] relative group ${isAI ? 'bg-white border-2 border-slate-100 text-slate-800 rounded-tl-sm shadow-sm' : 'bg-indigo-600 text-white rounded-tr-sm shadow-md'}`}>
                      
                      {isAI && idx === 1 && <h2 className="text-xl font-black mb-5 flex items-center gap-2"><Sparkles className="text-indigo-600" size={24}/> {t.resultTitle}</h2>}
                      
                      <div className={`prose max-w-none text-[15px] leading-relaxed font-medium ${isAI ? 'prose-slate' : 'text-white'}`}>
                        {msg.text.split('\n').map((p, pIdx) => p.trim() !== '' && <p key={pIdx} className="mb-2">{p}</p>)}
                      </div>

                      {/* ========================================================= */}
                      {/* === 🎙️ PREMIUM VOICE ACTION BAR (Inside the bubble) === */}
                      {isAI && (
                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center">
                          <button 
                            onClick={() => handlePlayAudio(msg.text, idx)}
                            className={`
                              group flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-black transition-all duration-300 active:scale-95
                              ${isPlaying === idx 
                                ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-indigo-500' 
                                : 'bg-indigo-50/50 text-indigo-600 shadow-sm border border-indigo-100 hover:bg-white hover:shadow-md hover:border-indigo-300'}
                            `}
                          >
                            {isPlaying === idx ? (
                              <>
                                <Square size={14} className="fill-white" />
                                <span>{t.stopVoice}</span>
                                {/* Fake Animated Equalizer Waveform */}
                                <div className="flex items-end gap-[3px] ml-1 h-3.5 opacity-90">
                                  <div className="w-1 bg-white animate-[bounce_1s_infinite] h-full rounded-full"></div>
                                  <div className="w-1 bg-white animate-[bounce_1s_infinite_0.2s] h-2/3 rounded-full"></div>
                                  <div className="w-1 bg-white animate-[bounce_1s_infinite_0.4s] h-full rounded-full"></div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-indigo-100/80 p-1.5 rounded-full group-hover:bg-indigo-100 transition-colors">
                                  <Volume2 size={16} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                                </div>
                                <span>{t.playVoice}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {/* ========================================================= */}

                    </div>
                  </div>
                );
              })}
              {isChatting && (
                 <div className="flex justify-start"><div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl rounded-tl-sm text-slate-400 flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> AI is thinking...</div></div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* QUICK CHIPS */}
            {!showHistoryView && (
              <div className="px-6 md:px-8 pt-4 pb-2 flex flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 w-full mb-1"><Sparkles size={12}/> Suggestions</span>
                {analysisMode === 'assignment' ? (
                  <><button onClick={() => handleSendMessage(t.chipA1)} className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-full hover:bg-indigo-100">{t.chipA1}</button>
                  <button onClick={() => handleSendMessage(t.chipA2)} className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-full hover:bg-indigo-100">{t.chipA2}</button></>
                ) : (
                  <><button onClick={() => handleSendMessage(t.chipS1)} className="px-4 py-2 bg-purple-50 text-purple-700 text-sm font-bold rounded-full hover:bg-purple-100">{t.chipS1}</button>
                  <button onClick={() => handleSendMessage(t.chipS2)} className="px-4 py-2 bg-purple-50 text-purple-700 text-sm font-bold rounded-full hover:bg-purple-100">{t.chipS2}</button></>
                )}
              </div>
            )}

            <div className="p-6 md:p-8 pt-4 border-t border-slate-100 bg-white">
               <div className="relative flex items-center">
                  <MessageSquare className="absolute left-4 text-slate-400" size={20} />
                  
                  {/* 🎙️ NOTE: If disabling voice, change pr-24 back to pr-14 in className below */}
                  <input 
                    type="text" 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                    placeholder={isRecording ? "Eshitmoqdaman..." : t.chatPlaceholder} 
                    disabled={isChatting || isTranscribing} 
                    className={`w-full pl-12 pr-24 py-4 border-2 rounded-2xl font-medium outline-none transition-all ${isRecording ? 'bg-red-50 border-red-300 text-red-900 placeholder-red-400' : 'bg-slate-50 border-slate-100 focus:border-indigo-300'}`} 
                  />

                  {/* ========================================================= */}
                  {/* === 🎙️ VOICE FEATURE MIC BUTTON (OPTIONAL: Comment out) === */}
                  {/* <div className="absolute right-14 flex items-center">
                    {isTranscribing ? (
                      <Loader2 className="animate-spin text-indigo-400" size={20} />
                    ) : (
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isChatting}
                        className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                        title="Ovoz orqali yozish"
                      >
                        <Mic size={20} />
                      </button>
                    )}
                  </div> */}
                  {/* ========================================================= */}

                  <button 
                    onClick={() => handleSendMessage()} 
                    disabled={!chatInput.trim() || isChatting || isRecording || isTranscribing} 
                    className="absolute right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    <Send size={20} />
                  </button>
               </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}