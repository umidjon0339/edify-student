'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, orderBy, limit, getDocs, startAfter, 
  QueryDocumentSnapshot, DocumentData, doc, setDoc, serverTimestamp, getDoc 
} from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { useStudentLanguage } from '../layout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, ChevronRight, ArrowLeft, GraduationCap, 
  Award, BookOpen, Loader2, CheckCircle, Lock 
} from 'lucide-react';

// --- TRANSLATION DICTIONARY ---
const EXPLORE_TRANSLATIONS: any = {
  uz: {
    title: "Eng Yaxshi O'qituvchilar", subtitle: "O'z sohasining ustalarini toping.",
    students: "O'quvchilar", courses: "Sinflar", activeClasses: "Faol Sinflar", subject: "Fan",
    viewProfile: "Sinflarni ko'rish", back: "Ortga qaytish",
    teacherClasses: "O'qituvchining Sinflari", noClasses: "Bu o'qituvchida hozircha sinflar yo'q.",
    requestBtn: "Qo'shilish", pendingBtn: "Kutilmoqda", joinedBtn: "Qo'shilgansiz", closedBtn: "Yopiq",
    success: "So'rov yuborildi!"
  },
  en: {
    title: "Top Instructors", subtitle: "Discover master teachers.",
    students: "Students", courses: "Classes", activeClasses: "Active Classes", subject: "Subject",
    viewProfile: "View Classes", back: "Back to Instructors",
    teacherClasses: "Instructor's Classes", noClasses: "This instructor hasn't published any classes yet.",
    requestBtn: "Request to Join", pendingBtn: "Requested", joinedBtn: "Joined", closedBtn: "Closed",
    success: "Request sent successfully!"
  },
  ru: {
    title: "Лучшие Преподаватели", subtitle: "Найдите мастеров своего дела.",
    students: "Учеников", courses: "Классов", activeClasses: "Активные классы", subject: "Предмет",
    viewProfile: "Смотреть классы", back: "Назад",
    teacherClasses: "Классы Преподавателя", noClasses: "У этого преподавателя пока нет классов.",
    requestBtn: "Присоединиться", pendingBtn: "В ожидании", joinedBtn: "Вы в классе", closedBtn: "Закрыто",
    success: "Запрос отправлен!"
  }
};

// Helper for dynamic card banners
const getBannerGradient = (index: number) => {
  const gradients = [
    "from-blue-500 to-cyan-400",
    "from-indigo-500 to-purple-500",
    "from-violet-500 to-fuchsia-500",
    "from-emerald-400 to-teal-500",
    "from-orange-400 to-amber-400"
  ];
  return gradients[index % gradients.length];
};

export default function ExploreTeachersPage() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = EXPLORE_TRANSLATIONS[lang] || EXPLORE_TRANSLATIONS['en'];

  // --- STATE ---
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // 🟢 NEW: Tracks infinite scroll load
  const [lastTeacherDoc, setLastTeacherDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreTeachers, setHasMoreTeachers] = useState(false);

  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  // 🟢 1. FETCH TOP TEACHERS
  const fetchTopTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'teacher'),
        orderBy('totalStudents', 'desc'), 
        limit(10)
      );

      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setTeachers(fetched);
      setLastTeacherDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMoreTeachers(snap.docs.length === 10);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => { fetchTopTeachers(); }, []);

 // 🟢 2. LOAD MORE TEACHERS (For Infinite Scroll)
  const loadMoreTeachers = useCallback(async () => {
    if (!lastTeacherDoc || loadingMore || !hasMoreTeachers) return;
    
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'teacher'),
        orderBy('totalStudents', 'desc'), 
        startAfter(lastTeacherDoc),
        limit(10)
      );

      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 🟢 THE FIX: Automatically filter out any duplicate teachers
      setTeachers(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newUniqueTeachers = fetched.filter(t => !existingIds.has(t.id));
        return [...prev, ...newUniqueTeachers];
      });
      
      setLastTeacherDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMoreTeachers(snap.docs.length === 10);
    } catch (e) { 
      console.error(e); 
    } finally {
      setLoadingMore(false);
    }
  }, [lastTeacherDoc, loadingMore, hasMoreTeachers]);

  // 🟢 3. INFINITE SCROLL LISTENER
  useEffect(() => {
    const handleScroll = () => {
      // If user scrolls within 500px of the bottom of the page, fetch next batch
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (hasMoreTeachers && !loadingMore && !loadingTeachers) {
          loadMoreTeachers();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMoreTeachers, loadingMore, loadingTeachers, loadMoreTeachers]);

  // 🟢 4. FETCH CLASSES FOR SPECIFIC TEACHER
  const handleSelectTeacher = async (teacher: any) => {
    setSelectedTeacher(teacher);
    setLoadingClasses(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const q = query(
        collection(db, 'classes'),
        where('teacherId', '==', teacher.id),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeacherClasses(fetched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClasses(false);
    }
  };

  // 🟢 5. REQUEST TO JOIN CLASS
  const handleJoinRequest = async (classId: string) => {
    if (!user) return;
    setProcessingIds(prev => new Set(prev).add(classId));
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const requestRef = doc(db, 'classes', classId, 'requests', user.uid);
      
      await setDoc(requestRef, {
        studentId: user.uid,
        studentName: userData.displayName || user.displayName || 'Student',
        studentUsername: userData.username || '',
        photoURL: userData.photoURL || user.photoURL || '',
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setRequestedIds(prev => new Set(prev).add(classId));
      alert(t.success);
    } catch (error) { console.error(error); } 
    finally {
      setProcessingIds(prev => {
        const next = new Set(prev); next.delete(classId); return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-28 md:pb-12">
      
      {/* HEADER */}
      <div className="bg-white border-b border-zinc-200 py-4 px-4 sm:px-6 md:px-8 mb-6 shadow-sm z-10 relative">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl text-indigo-500 flex items-center justify-center border border-indigo-100 shrink-0">
              <Award size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-zinc-900 tracking-tight line-clamp-1">
              {t.title}
            </h1>
          </div>
          <p className="hidden md:block text-zinc-400 font-bold text-[13px]">{t.subtitle}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <AnimatePresence mode="wait">
          
          {/* ========================================================= */}
          {/* VIEW 1: TEACHERS LIST */}
          {/* ========================================================= */}
          {!selectedTeacher ? (
            <motion.div 
              key="teacher-list"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
              className="flex flex-col gap-8"
            >
              {loadingTeachers ? (
                // Skeletons
                [1,2,3].map(i => <div key={i} className="w-full h-64 bg-zinc-200 rounded-[2rem] animate-pulse"></div>)
              ) : (
                <>
                  {teachers.map((teacher, index) => (
                    
                    <div 
                      key={teacher.id}
                      onClick={() => handleSelectTeacher(teacher)}
                      className="w-full bg-white rounded-[2rem] border-2 border-zinc-200 overflow-hidden cursor-pointer hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group relative"
                    >
                      {/* Banner */}
                      <div className={`h-28 md:h-32 w-full bg-gradient-to-r ${getBannerGradient(index)} relative`}>
                        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white font-black text-[13px] border border-white/30 shadow-sm">
                          #{index + 1}
                        </div>
                      </div>

                      <div className="px-6 pb-6 relative">
                        
                        {/* Overlapping Avatar */}
                        <div className="absolute -top-12 md:-top-14 left-6 w-24 h-24 md:w-28 md:h-28 bg-white rounded-[1.5rem] p-1.5 shadow-sm border-2 border-zinc-100 z-10 transition-transform group-hover:-translate-y-1">
                          <div className="w-full h-full bg-zinc-100 rounded-[1.2rem] flex items-center justify-center overflow-hidden">
                            {teacher.photoURL ? (
                              <img src={teacher.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl md:text-4xl font-black text-zinc-400">
                                {teacher.displayName?.charAt(0).toUpperCase() || 'T'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end pt-4 mb-2">
                          <button className="px-5 py-2.5 bg-zinc-50 text-indigo-600 font-black text-[13px] rounded-xl border-2 border-zinc-100 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all flex items-center gap-1">
                            {t.viewProfile} <ChevronRight size={16} strokeWidth={3} />
                          </button>
                        </div>

                        <div className="mt-2 md:mt-0">
                          <h3 className="text-2xl md:text-3xl font-black text-zinc-900 group-hover:text-indigo-600 transition-colors tracking-tight line-clamp-1">
                            {teacher.displayName || "Unknown Teacher"}
                          </h3>
                          {teacher.username && <p className="text-[15px] font-bold text-zinc-400 mt-1">@{teacher.username}</p>}
                        </div>

                        {/* 🟢 TALL STATS GRID (Replaced XP with Subject) */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 border-t-2 border-zinc-100 pt-6">
                           
                           {/* Students Pill */}
                           <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-zinc-50 rounded-[1.2rem] p-4 border border-zinc-100">
                             <div className="w-10 h-10 bg-amber-100 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                               <Users size={20} strokeWidth={2.5}/>
                             </div>
                             <div className="min-w-0">
                               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">{t.students}</p>
                               <p className="text-xl font-black text-zinc-900 leading-none truncate">{teacher.totalStudents?.toLocaleString() || 0}</p>
                             </div>
                           </div>

                           {/* Active Classes Pill */}
                           <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-zinc-50 rounded-[1.2rem] p-4 border border-zinc-100">
                             <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                               <BookOpen size={20} strokeWidth={2.5}/>
                             </div>
                             <div className="min-w-0">
                               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">{t.activeClasses}</p>
                               <p className="text-xl font-black text-zinc-900 leading-none truncate">{teacher.activeClassCount || 0}</p>
                             </div>
                           </div>

                           {/* 🟢 Subject Pill (Spans 2 columns on mobile, 1 on desktop) */}
                           <div className="col-span-2 md:col-span-1 flex flex-col md:flex-row items-start md:items-center gap-3 bg-zinc-50 rounded-[1.2rem] p-4 border border-zinc-100">
                             <div className="w-10 h-10 bg-emerald-100 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                               <GraduationCap size={20} strokeWidth={2.5}/>
                             </div>
                             <div className="min-w-0">
                               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">{t.subject}</p>
                               <p className="text-xl font-black text-zinc-900 leading-none truncate">{teacher.subject || "—"}</p>
                             </div>
                           </div>

                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 🟢 INFINITE SCROLL LOADER */}
                  {loadingMore && (
                    <div className="mt-4 mb-10 flex justify-center">
                      <Loader2 className="animate-spin text-indigo-500" size={36} />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ) : (

          /* ========================================================= */
          /* VIEW 2: TEACHER PROFILE & CLASSES (DRILL-DOWN)            */
          /* ========================================================= */
            <motion.div 
              key="teacher-detail"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <button 
                onClick={() => setSelectedTeacher(null)} 
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-black transition-all hover:-translate-x-1 px-4 py-2 rounded-xl hover:bg-zinc-100 w-fit"
              >
                <ArrowLeft size={18} strokeWidth={3} /> {t.back}
              </button>

              <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center md:items-start gap-6 shadow-lg shadow-indigo-500/20">
                <div className="w-24 h-24 rounded-[1.5rem] bg-white p-1 shrink-0">
                  <div className="w-full h-full bg-zinc-100 rounded-[1.2rem] flex items-center justify-center overflow-hidden text-indigo-500 font-black text-3xl">
                    {selectedTeacher.photoURL ? <img src={selectedTeacher.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : selectedTeacher.displayName?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-3xl font-black tracking-tight mb-2">{selectedTeacher.displayName}</h2>
                  <p className="text-indigo-100 font-bold mb-4">{selectedTeacher.bio || "Master Instructor"}</p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                     <span className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl font-black text-[13px] flex items-center gap-2">
                       <Users size={16} /> {selectedTeacher.totalStudents?.toLocaleString() || 0} {t.students}
                     </span>
                     {selectedTeacher.subject && (
                       <span className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl font-black text-[13px] flex items-center gap-2">
                         <GraduationCap size={16} /> {selectedTeacher.subject}
                       </span>
                     )}
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-black text-zinc-900 mt-6 tracking-tight flex items-center gap-2">
                <BookOpen className="text-indigo-500" /> {t.teacherClasses}
              </h3>

              {loadingClasses ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
              ) : teacherClasses.length === 0 ? (
                <div className="text-center py-20 bg-white border-2 border-zinc-200 border-dashed rounded-[2rem]">
                  <p className="text-zinc-400 font-bold">{t.noClasses}</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {teacherClasses.map((cls) => {
                    const isProcessing = processingIds.has(cls.id);
                    const hasRequested = requestedIds.has(cls.id);
                    const alreadyJoined = cls.studentIds?.includes(user?.uid);

                    return (
                      <div key={cls.id} className="bg-white rounded-[2rem] border-2 border-zinc-200 border-b-[6px] hover:border-indigo-300 hover:border-b-indigo-400 transition-all flex flex-col p-6">
                        <h4 className="text-xl font-black text-zinc-900 mb-2 line-clamp-1">{cls.title}</h4>
                        <p className="text-[14px] text-zinc-500 font-bold line-clamp-2 h-10 mb-6">{cls.description || "No description provided."}</p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t-2 border-zinc-100">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-xl font-black text-[12px]">
                            <Users size={14} strokeWidth={3} /> {cls.studentIds?.length || 0}
                          </div>

                          {alreadyJoined ? (
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[12px]"><CheckCircle size={14} strokeWidth={3} /> {t.joinedBtn}</div>
                          ) : hasRequested ? (
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-black text-[12px]"><Loader2 size={14} className="animate-spin" /> {t.pendingBtn}</div>
                          ) : cls.isLocked ? (
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-500 rounded-xl font-black text-[12px]"><Lock size={14} strokeWidth={3} /> {t.closedBtn}</div>
                          ) : (
                            <button 
                              onClick={() => handleJoinRequest(cls.id)} disabled={isProcessing}
                              className="px-5 py-2.5 bg-zinc-900 text-white hover:bg-indigo-600 rounded-xl font-black text-[13px] transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                              {isProcessing && <Loader2 size={14} className="animate-spin" />} {t.requestBtn}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}