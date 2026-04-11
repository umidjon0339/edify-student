'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, addDoc, updateDoc, 
  doc, serverTimestamp, orderBy, limit, startAfter 
} from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
  X, Search, Loader2, Calendar, Shield, EyeOff, 
  FileBadge, ChevronRight, CheckCircle2, ArrowLeft, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssignExamModal({ classId, isOpen, onClose, editData }: any) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // PAGINATION STATES
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Exam Logic States
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [examDate, setExamDate] = useState('');
  const [duration, setDuration] = useState(45);
  const [hideResults, setHideResults] = useState(true);

  // PRE-FILL DATA FOR EDITING
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setStep(2); 
        setSelectedExam({ id: editData.testId, title: editData.title, assessmentType: editData.assessmentType });
        
        const dateObj = editData.examDate.toDate();
        const offset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(dateObj.getTime() - offset)).toISOString().slice(0, 16);
        
        setExamDate(localISOTime);
        setDuration(editData.durationMinutes);
        setHideResults(editData.hideResults);
      } else {
        setStep(1);
        setSelectedExam(null);
        setExamDate('');
        setDuration(45);
        setHideResults(true);
      }
    }
  }, [isOpen, editData]);

  // INITIAL FETCH
  useEffect(() => {
    if (isOpen && user && step === 1 && !editData) {
      const fetchInitialExams = async () => {
        setLoading(true);
        try {
          const q = query(
            collection(db, 'bsb_chsb_tests'), 
            where('teacherId', '==', user.uid), 
            orderBy('createdAt', 'desc'), 
            limit(10)
          );
          const snap = await getDocs(q);
          setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          
          setLastDoc(snap.docs[snap.docs.length - 1]);
          setHasMore(snap.docs.length === 10);
        } catch (error) {
          console.error("Fetch error:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchInitialExams();
    }
  }, [isOpen, user, step, editData]);

  // LOAD MORE FUNCTION
  const loadMoreExams = async () => {
    if (!lastDoc || !user) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'bsb_chsb_tests'), 
        where('teacherId', '==', user.uid), 
        orderBy('createdAt', 'desc'), 
        startAfter(lastDoc),
        limit(10)
      );
      const snap = await getDocs(q);
      
      setExams(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 10);
    } catch (error) {
      toast.error("Ko'proq yuklashda xatolik yuz berdi");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSave = async () => {
    if (!selectedExam || !examDate) return toast.error("Iltimos, barcha maydonlarni to'ldiring.");
    setLoading(true);

    try {
      if (editData) {
        await updateDoc(doc(db, 'classes', classId, 'exams', editData.id), {
          examDate: new Date(examDate),
          durationMinutes: duration,
          hideResults: hideResults,
        });
        toast.success("Imtihon sozlamalari yangilandi!");
      } else {
        const payload = {
          testId: selectedExam.id,
          title: selectedExam.title,
          assessmentType: selectedExam.assessmentType, 
          examDate: new Date(examDate),
          durationMinutes: duration,
          hideResults: hideResults,
          submittedStudentIds: [], 
          status: 'scheduled',
          teacherId: user?.uid,
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'classes', classId, 'exams'), payload);
        toast.success("Imtihon muvaffaqiyatli saqlandi!");
      }
      onClose();
    } catch (e) {
      toast.error("Saqlashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 HELPER: Set quick start time relative to NOW
  const setQuickStartTime = (minutesToAdd: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutesToAdd);
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
    setExamDate(localISOTime);
  };

  const filteredExams = useMemo(() => exams.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase())), [exams, searchQuery]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
             {step === 2 && !editData ? (
               <button onClick={() => setStep(1)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 active:scale-95 transition-colors"><ArrowLeft size={18} /></button>
             ) : (
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm"><FileBadge size={20} strokeWidth={2.5} /></div>
             )}
            <h2 className="text-[16px] font-black text-slate-900 uppercase tracking-tight">
              {editData ? "Imtihonni Tahrirlash" : (step === 1 ? "Imtihonni tanlang" : "Sozlamalar")}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={18}/></button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA] space-y-6 custom-scrollbar pb-20 sm:pb-8">
            {step === 1 && !editData ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                  type="text" 
                  placeholder="Qidiruv..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-[14px] font-bold outline-none focus:border-rose-400 shadow-sm transition-colors" 
                />
              </div>
              
              <div className="space-y-2.5">
                {loading && exams.length === 0 ? (
                  <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-rose-500" /></div>
                ) : (
                  <>
                    {filteredExams.map(exam => (
                      <div key={exam.id} onClick={() => setSelectedExam(exam)} className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center active:scale-[0.98] ${selectedExam?.id === exam.id ? 'border-rose-500 bg-rose-50 shadow-sm ring-2 ring-rose-500/20' : 'border-slate-200/80 bg-white hover:border-rose-300'}`}>
                        <div className="min-w-0 pr-4">
                          <p className="font-black text-[14px] text-slate-800 truncate">{exam.title}</p>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{exam.assessmentType} • {exam.questionCount} Savol</p>
                        </div>
                        {selectedExam?.id === exam.id && <CheckCircle2 size={20} className="text-rose-500 shrink-0" />}
                      </div>
                    ))}

                    {hasMore && !searchQuery && (
                      <button 
                        onClick={loadMoreExams} 
                        disabled={loadingMore}
                        className="w-full py-4 mt-2 bg-white border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-[13px]"
                      >
                        {loadingMore ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                        Yana yuklash
                      </button>
                    )}
                    
                    {searchQuery && filteredExams.length === 0 && (
                       <p className="text-center text-[12px] font-bold text-slate-400 py-6">Yuklanganlar orasidan topilmadi. Qidiruvni tozalab "Yana yuklash" tugmasini bosing.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-in slide-in-from-right-5 duration-300">
              <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/80 shadow-sm space-y-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={14}/> Vaqt va Davomiylik</h3>
                
                {/* 🟢 START TIME WITH QUICK SELECT */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-2 ml-1">Boshlanish vaqti</label>
                  <input type="datetime-local" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-800 outline-none focus:border-rose-400 transition-colors" />
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {[
                      { label: '+10 daq', val: 10 },
                      { label: '+1 soat', val: 60 },
                      { label: '+2 soat', val: 120 },
                      { label: '+24 soat', val: 1440 }
                    ].map(opt => (
                      <button 
                        key={opt.label} 
                        type="button" 
                        onClick={() => setQuickStartTime(opt.val)} 
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-black rounded-lg transition-all active:scale-95 border border-slate-200/60"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 🟢 DURATION WITH QUICK SELECT */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-[12px] font-bold text-slate-700 mb-2 ml-1">Davomiyligi (minut)</label>
                  <input type="number" min="5" max="300" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-800 outline-none focus:border-rose-400 transition-colors" />
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {[30, 45, 60, 90, 120].map(val => (
                      <button 
                        key={val} 
                        type="button" 
                        onClick={() => setDuration(val)} 
                        className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all active:scale-95 border ${
                          duration === val 
                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/20' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200/60'
                        }`}
                      >
                        {val === 60 ? '1 soat' : val === 120 ? '2 soat' : `${val} daq`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/80 shadow-sm space-y-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Shield size={14}/> Xavfsizlik</h3>
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="pr-4">
                    <span className="text-[13px] md:text-[14px] font-black text-slate-700 flex items-center gap-1.5"><EyeOff size={16} className="text-indigo-500"/> Natijalarni Yashirish</span>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">O'quvchilar to'g'ri javoblarni ko'rmaydi.</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 relative ${hideResults ? 'bg-rose-500' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${hideResults ? 'translate-x-6' : 'translate-x-0'}`}/>
                  </div>
                  <input type="checkbox" checked={hideResults} onChange={() => setHideResults(!hideResults)} className="hidden"/>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 z-20 shadow-[0_-10px_30px_rgb(0,0,0,0.03)]">
          {step === 1 && !editData ? (
            <button disabled={!selectedExam} onClick={() => setStep(2)} className="w-full py-3.5 sm:py-4 bg-slate-900 hover:bg-black text-white font-black rounded-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md">Keyingi qadam <ChevronRight size={18} /></button>
          ) : (
            <button disabled={loading} onClick={handleSave} className="w-full py-3.5 sm:py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl active:scale-95 flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition-all">
              {loading && step === 2 ? <Loader2 className="animate-spin" /> : <FileBadge size={18} />}
              {editData ? "O'zgarishlarni Saqlash" : "Imtihonni rejalashtirish"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}