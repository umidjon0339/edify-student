'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
  Award, Flame, Zap, Calendar, ArrowLeft, User as UserIcon, 
  TrendingUp, Briefcase, MapPin, GraduationCap, Smile, Mail,Trophy, Star,X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStudentLanguage } from '@/app/(student)/layout'; 

// --- 1. TRANSLATION DICTIONARY ---
const PUBLIC_PROFILE_TRANSLATIONS: any = {
  uz: {
    loading: "Profil yuklanmoqda...",
    back: "Ortga",
    notFound: "Foydalanuvchi topilmadi",
    goBack: "Ortga qaytish",
    role: { teacher: "O'qituvchi", student: "O'quvchi", instructor: "Instruktor" },
    stats: { level: "Daraja", xp: "Jami XP", streak: "Kunlik Seriya", days: "kun" },
    labels: { email: "Pochta", location: "Manzil", birthDate: "Tug'ilgan sana", notProvided: "Kiritilmagan", info: "Shaxsiy Ma'lumotlar" },
    charts: {
      weekly: "Haftalik Natijalar (Siz vs U)",
      target: "Ular",
      you: "Siz"
    },
    genders: { male: "Erkak", female: "Ayol" }
  },
  en: {
    loading: "Loading profile...",
    back: "Back",
    notFound: "User not found",
    goBack: "Go Back",
    role: { teacher: "Teacher", student: "Student", instructor: "Instructor" },
    stats: { level: "Level", xp: "Total XP", streak: "Day Streak", days: "days" },
    labels: { email: "Email", location: "Location", birthDate: "Birth Date", notProvided: "Not provided", info: "Personal Info" },
    charts: {
      weekly: "Weekly Comparison (You vs Them)",
      target: "Them",
      you: "You"
    },
    genders: { male: "Male", female: "Female" }
  },
  ru: {
    loading: "Загрузка профиля...",
    back: "Назад",
    notFound: "Пользователь не найден",
    goBack: "Вернуться",
    role: { teacher: "Учитель", student: "Ученик", instructor: "Инструктор" },
    stats: { level: "Уровень", xp: "Всего XP", streak: "Серия", days: "дн." },
    labels: { email: "Email", location: "Локация", birthDate: "Дата рождения", notProvided: "Не указано", info: "Личные данные" },
    charts: {
      weekly: "Сравнение за неделю (Вы vs Они)",
      target: "Они",
      you: "Вы"
    },
    genders: { male: "Мужской", female: "Женский" }
  }
};

interface UserData {
  displayName?: string;
  username?: string;
  bio?: string;
  role?: string;
  gender?: string;
  location?: { region?: string, district?: string };
  photoURL?: string;
  email?: string;
  birthDate?: string;
  totalXP: number;
  currentStreak: number;
  dailyHistory: Record<string, number>; 
}

// 🟢 SMART STREAK CALCULATOR
const calculateTrueStreak = (dailyHistory: Record<string, number> | undefined) => {
  if (!dailyHistory) return 0;
  const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const formatDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  if (!dailyHistory[formatDate(today)] && !dailyHistory[formatDate(yesterday)]) return 0;
  let streakCount = 0; let checkDate = new Date(dailyHistory[formatDate(today)] ? today : yesterday);
  while (dailyHistory[formatDate(checkDate)] && dailyHistory[formatDate(checkDate)] > 0) { streakCount++; checkDate.setDate(checkDate.getDate() - 1); }
  return streakCount;
};

// 🟢 WEEKLY COMPARISON GENERATOR
const generateComparisonData = (targetHistory: Record<string, number> | undefined, myHistory: Record<string, number> | undefined, lang: string, t: any) => {
  const data = []; const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(today.getDate() - i);
    const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' });
    data.push({
      name: dayLabel.toUpperCase(),
      [t.charts.target]: targetHistory?.[dateStr] || 0,
      [t.charts.you]: myHistory?.[dateStr] || 0, 
    });
  }
  return data;
};

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;
  
  const { lang } = useStudentLanguage();
  const t = PUBLIC_PROFILE_TRANSLATIONS[lang] || PUBLIC_PROFILE_TRANSLATIONS['en'];

  const [userData, setUserData] = useState<UserData | null>(null);
  const [myUserData, setMyUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  // REDIRECT IF VIEWING SELF
  useEffect(() => {
    if (currentUser && currentUser.uid === userId) {
      router.replace('/profile');
    }
  }, [currentUser, userId, router]);

  // FETCH DATA
  useEffect(() => {
    async function fetchData() {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData({
            ...data,
            displayName: data.displayName || 'Student',
            totalXP: data.totalXP ?? data.xp ?? 0,
            currentStreak: calculateTrueStreak(data.dailyHistory),
            dailyHistory: data.dailyHistory || {}
          } as UserData);
        } else {
          setUserData(null);
        }

        if (currentUser && currentUser.uid !== userId) {
           const myDocRef = doc(db, 'users', currentUser.uid);
           const myDocSnap = await getDoc(myDocRef);
           if (myDocSnap.exists()) {
             setMyUserData({
               ...myDocSnap.data(),
               dailyHistory: myDocSnap.data().dailyHistory || {}
             } as UserData);
           }
        }
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchData();
  }, [userId, currentUser]);

  const currentLevel = Math.floor((userData?.totalXP || 0) / 1000) + 1;
  const comparisonData = useMemo(() => generateComparisonData(userData?.dailyHistory, myUserData?.dailyHistory, lang, t), [userData, myUserData, lang, t]);
  
  // 🟢 TACTILE LOADING SKELETON
  if (loading) {
    return (
      <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-12 animate-pulse">
        <div className="w-24 h-10 bg-zinc-200 rounded-xl mb-6"></div>
        <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 md:p-8 flex gap-6 md:gap-8 mb-6 h-48">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-zinc-200 shrink-0"></div>
          <div className="flex-1 space-y-4 pt-2">
            <div className="h-8 bg-zinc-200 rounded-lg w-1/3"></div>
            <div className="h-5 bg-zinc-200 rounded-lg w-1/4"></div>
            <div className="h-20 bg-zinc-200 rounded-xl w-3/4"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-200 rounded-3xl border-2 border-zinc-100"></div>)}
        </div>
      </div>
    );
  }
  
  // 🟢 NOT FOUND STATE
  if (!userData) return (
    <div className="w-full max-w-[800px] mx-auto px-4 py-20 text-center flex flex-col items-center">
      <div className="w-24 h-24 bg-zinc-100 rounded-3xl flex items-center justify-center text-zinc-400 mb-6 border-2 border-zinc-200"><UserIcon size={40} strokeWidth={3} /></div>
      <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight mb-2">{t.notFound}</h1>
      <button onClick={() => router.back()} className="mt-6 px-6 py-3 bg-white border-2 border-zinc-200 border-b-4 active:border-b-2 active:translate-y-[2px] rounded-xl text-zinc-600 font-black transition-all">
        {t.goBack}
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-12">
      
      {/* Back Button */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-black transition-all hover:-translate-x-1 mb-6 px-3 py-2 rounded-xl hover:bg-zinc-100 w-fit"
      >
        <ArrowLeft size={18} strokeWidth={3} /> {t.back}
      </button>

      <div className="space-y-5 md:space-y-6">
        
        {/* ========================================= */}
        {/* 1. PREMIUM HEADER IDENTITY CARD */}
        {/* ========================================= */}
        <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 md:p-8 relative overflow-hidden shadow-sm">
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 relative z-10">
            
            {/* 🟢 AVATAR CONTAINER (Clickable for Photo Viewer) */}
            <div className="relative shrink-0 group">
              <div 
                onClick={() => userData?.photoURL ? setShowPhotoViewer(true) : null}
                className={`w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-1.5 shadow-xl flex items-center justify-center relative transition-transform ${userData?.photoURL ? 'cursor-pointer active:scale-95 hover:scale-105' : ''}`}
              >
                <div className="w-full h-full bg-white rounded-[2.2rem] flex items-center justify-center overflow-hidden border-4 border-white">
                  {userData?.photoURL ? (
                    <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-black text-violet-600 bg-violet-50 w-full h-full flex items-center justify-center">
                      {userData?.displayName?.charAt(0).toUpperCase() || 'S'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 w-full text-center md:text-left mt-2 md:mt-3">
              {/* Name & Username */}
              <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight mb-1 flex items-center justify-center md:justify-start gap-3">
                {userData.displayName || 'Student'}
              </h2>
              {userData.username && <p className="text-[15px] font-bold text-zinc-500 mb-4">@{userData.username}</p>}
              
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 border-2 border-violet-100 rounded-xl font-black text-[11px] uppercase tracking-widest">
                  {userData.role === 'teacher' ? <Briefcase size={16} strokeWidth={3} /> : <GraduationCap size={16} strokeWidth={3} />} 
                  {userData.role === 'teacher' ? t.role.teacher : t.role.student}
                </span>
                
                {userData.gender && (
                  <span title={userData.gender === 'male' ? t.genders.male : t.genders.female} className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 ${userData.gender === 'male' ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                    {userData.gender === 'male' ? <UserIcon size={16} strokeWidth={3}/> : <Smile size={16} strokeWidth={3}/>}
                  </span>
                )}
              </div>

              {/* Premium Quote Bio Bubble */}
              {userData.bio ? (
                <div className="bg-zinc-50 border-2 border-zinc-200/60 rounded-2xl p-5 text-[14px] font-bold text-zinc-600 max-w-lg mx-auto md:mx-0 text-center md:text-left relative inline-block">
                  <span className="absolute -top-4 -left-2 text-5xl font-serif text-zinc-200 select-none">"</span>
                  <span className="relative z-10 leading-relaxed block px-2 break-words">{userData.bio}</span>
                  <span className="absolute -bottom-6 -right-2 text-5xl font-serif text-zinc-200 select-none">"</span>
                </div>
              ) : (
                <div className="text-[13px] font-bold text-zinc-400 italic">
                  {t.labels.notProvided} bio
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* 2. TACTILE STATS GRID */}
        {/* ========================================= */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border-2 border-zinc-200 p-5 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-[1rem] bg-amber-100 flex items-center justify-center text-amber-500 border-2 border-amber-200 mb-3"><Trophy size={24} strokeWidth={2.5}/></div>
            <p className="text-3xl font-black text-zinc-900 tracking-tight">{(userData.totalXP || 0).toLocaleString()}</p>
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t.stats.xp}</span>
          </div>
          <div className="bg-white rounded-3xl border-2 border-zinc-200 p-5 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-[1rem] bg-orange-100 flex items-center justify-center text-orange-500 border-2 border-orange-200 mb-3"><Flame size={24} strokeWidth={2.5}/></div>
            <p className={`text-3xl font-black tracking-tight ${userData.currentStreak > 0 ? 'text-orange-500' : 'text-zinc-900'}`}>{userData.currentStreak || 0}</p>
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t.stats.streak}</span>
          </div>
          <div className="bg-white rounded-3xl border-2 border-zinc-200 p-5 flex flex-col items-center text-center col-span-2 md:col-span-1">
            <div className="w-12 h-12 rounded-[1rem] bg-emerald-100 flex items-center justify-center text-emerald-500 border-2 border-emerald-200 mb-3"><Star size={24} strokeWidth={2.5}/></div>
            <p className="text-3xl font-black text-zinc-900 tracking-tight">{currentLevel}</p>
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t.stats.level}</span>
          </div>
        </div>

        {/* ========================================= */}
        {/* 3 & 4. CHARTS & INFO GRID */}
        {/* ========================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* A. WEEKLY COMPARISON CHART (Recharts Line) */}
          <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-zinc-900 flex items-center gap-2 text-[16px] tracking-tight">
                <TrendingUp size={20} strokeWidth={3} className="text-blue-500" /> {t.charts.weekly}
              </h3>
            </div>
            
            <div className="w-full min-h-[220px] h-[220px] mt-2 relative">
               {/* Custom Tooltip Legend for Line Chart */}
               <div className="absolute top-0 right-0 flex gap-4 z-10 bg-white/80 px-2 py-1 rounded-lg">
                 <div className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full bg-blue-500"></span><span className="text-[10px] font-black text-zinc-500 uppercase">{t.charts.target}</span></div>
                 {myUserData && <div className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full bg-zinc-300"></span><span className="text-[10px] font-black text-zinc-500 uppercase">{t.charts.you}</span></div>}
               </div>

              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA', fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA', fontWeight: 900 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181B', borderRadius: '12px', border: 'none', color: '#fff', fontWeight: '900', fontSize: '13px', padding: '8px 12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }} cursor={{ stroke: '#E4E4E7', strokeWidth: 2, strokeDasharray: '4 4' }} />
                  
                  {/* Target Line (Them) */}
                  <Line type="monotone" dataKey={t.charts.target} stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3 }} />
                  
                  {/* My Line (You) */}
                  {myUserData && (
                    <Line type="monotone" dataKey={t.charts.you} stroke="#D4D4D8" strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={{ r: 5, fill: '#D4D4D8', stroke: '#fff', strokeWidth: 2 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 🟢 B. INFO CARD (Replaces 30 Days Chart) */}
          <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 flex flex-col shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-[14px] flex items-center justify-center text-emerald-500 border-2 border-emerald-100">
                <UserIcon size={20} strokeWidth={2.5}/>
              </div>
              <h3 className="font-black text-zinc-900 text-[16px] tracking-tight">{t.labels.info}</h3>
            </div>
            
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Mail size={16} strokeWidth={2.5}/> {t.labels.email}
                </span>
                <span className="text-zinc-900 font-black text-[14px] truncate max-w-[180px]">
                  {userData.email || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}
                </span>
              </div>
              <div className="h-0.5 w-full bg-zinc-100"></div>

              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin size={16} strokeWidth={2.5}/> {t.labels.location}
                </span>
                <span className="text-zinc-900 font-black text-[14px] text-right truncate max-w-[180px]">
                  {[userData.location?.district, userData.location?.region].filter(Boolean).join(', ') || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}
                </span>
              </div>
              <div className="h-0.5 w-full bg-zinc-100"></div>

              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={16} strokeWidth={2.5}/> {t.labels.birthDate}
                </span>
                <span className="text-zinc-900 font-black text-[14px]">
                  {userData.birthDate || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
      
      {/* 🟢 FULL-SCREEN PHOTO VIEWER MODAL (Read-Only) */}
      <AnimatePresence>
        {showPhotoViewer && userData?.photoURL && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            
            {/* Dark Blur Background */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm" 
              onClick={() => setShowPhotoViewer(false)} 
            />
            
            {/* Photo Container */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} 
              className="relative w-full max-w-sm aspect-square rounded-[2.5rem] bg-zinc-100 overflow-hidden shadow-2xl border-4 border-white z-10"
            >
              <img src={userData.photoURL} alt="Full Profile" className="w-full h-full object-cover" />
              
              {/* Close Button (No Delete button here since it's someone else's profile!) */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-end items-center bg-gradient-to-b from-zinc-900/60 to-transparent">
                <button 
                  onClick={() => setShowPhotoViewer(false)} 
                  className="w-10 h-10 rounded-full bg-zinc-900/40 text-white flex items-center justify-center hover:bg-zinc-900/60 backdrop-blur-md transition-colors"
                >
                  <X size={20} strokeWidth={3}/>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}