'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import { 
  ChevronLeft, Award, Star, Flame, School, 
  MapPin, Phone, Loader2, BadgeCheck, Mail, 
  CalendarDays, Activity, UserCircle, BookOpen, ChevronRight 
} from 'lucide-react';
import { useTeacherLanguage } from '@/app/teacher/layout';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts';

// ============================================================================
// 🟢 1. GLOBAL CACHE (Saves Firebase Reads & Surivives Back Navigation)
// ============================================================================
const globalStudentProfileCache: Record<string, { profile: any, enrolledClasses: any[], timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds

// --- TRANSLATION DICTIONARY ---
const PROFILE_TRANSLATIONS: any = {
  uz: {
    back: "Ortga", loading: "Yuklanmoqda...", notFound: "O'quvchi topilmadi",
    unknown: "Noma'lum O'quvchi", notProvided: "Kiritilmagan",
    level: "Daraja", totalXP: "Umumiy XP", streak: "Davomiylik",
    academic: "Akademik Ma'lumotlar", contact: "Aloqa va Hisob", activity: "Faollik Tarixi (14 kun)",
    institution: "Muassasa", grade: "Sinf / Kurs", location: "Joylashuv", 
    phone: "Telefon", email: "Email", birthDate: "Tug'ilgan Sana", 
    joined: "Qo'shilgan vaqti", lastActive: "Oxirgi faollik",
    enrolledClasses: "Sinflari", noClasses: "Hech qanday sinfga a'zo emas."
  },
  en: {
    back: "Back", loading: "Loading data...", notFound: "Student not found",
    unknown: "Unknown Student", notProvided: "Not provided",
    level: "Level", totalXP: "Total XP", streak: "Streak",
    academic: "Academic Details", contact: "Contact Details", activity: "Activity (14 Days)",
    institution: "Institution", grade: "Grade", location: "Location", 
    phone: "Phone", email: "Email", birthDate: "Birth Date", 
    joined: "Joined", lastActive: "Last Active",
    enrolledClasses: "Enrolled Classes", noClasses: "Not enrolled in any classes."
  },
  ru: {
    back: "Назад", loading: "Загрузка...", notFound: "Ученик не найден",
    unknown: "Неизвестный ученик", notProvided: "Не указано",
    level: "Уровень", totalXP: "Всего XP", streak: "Серия дней",
    academic: "Академические данные", contact: "Контакты", activity: "Активность (14 дней)",
    institution: "Учреждение", grade: "Класс", location: "Локация", 
    phone: "Телефон", email: "Email", birthDate: "Дата Рождения", 
    joined: "Регистрация", lastActive: "Был(а) в сети",
    enrolledClasses: "Классы", noClasses: "Не состоит ни в одном классе."
  }
};

// 🟢 SMART STREAK CALCULATOR
const calculateTrueStreak = (dailyHistory: Record<string, number> | undefined) => {
  if (!dailyHistory) return 0;
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(yesterday);

  if (!dailyHistory[todayStr] && !dailyHistory[yesterdayStr]) return 0;

  let streakCount = 0;
  let checkDate = new Date(dailyHistory[todayStr] ? today : yesterday);

  while (true) {
    const checkStr = formatDate(checkDate);
    if (dailyHistory[checkStr] && dailyHistory[checkStr] > 0) {
      streakCount++;
      checkDate.setDate(checkDate.getDate() - 1); 
    } else {
      break; 
    }
  }

  return streakCount;
};

// 🟢 CHART DATA GENERATOR
const generateChartData = (dailyHistory: Record<string, number> | undefined, lang: string) => {
  const data = [];
  const today = new Date();
  
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    
    const offset = d.getTimezoneOffset() * 60000;
    const dateStr = new Date(d.getTime() - offset).toISOString().split('T')[0];
    const displayDate = d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-US', { month: 'short', day: 'numeric' });
    
    data.push({ name: displayDate, XP: dailyHistory?.[dateStr] || 0 });
  }
  return data;
};

export default function StudentProfilePage() {
  const router = useRouter();
  const { studentId } = useParams() as { studentId: string };
  const { lang } = useTeacherLanguage();
  const t = PROFILE_TRANSLATIONS[lang] || PROFILE_TRANSLATIONS['en'];

  const [profile, setProfile] = useState<any>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // 🟢 2. SWR FETCH LOGIC (100k Scale Optimized)
  // ============================================================================
  useEffect(() => {
    if (!studentId) return;

    const fetchProfileAndClasses = async () => {
      const now = Date.now();
      const cached = globalStudentProfileCache[studentId];

      // 🟢 Cache Hit: Instant Load!
      if (cached) {
        setProfile(cached.profile);
        setEnrolledClasses(cached.enrolledClasses);
        setLoading(false);

        // Stop here if data is fresh. 0 Firebase Reads!
        if (now - cached.timestamp < CACHE_LIFESPAN) return;
      } else {
        setLoading(true);
      }

      // 🟢 Background Fetch (or initial fetch)
      try {
        const [profileSnap, classesSnap] = await Promise.all([
          getDoc(doc(db, 'users', studentId)),
          getDocs(query(collection(db, 'classes'), where('studentIds', 'array-contains', studentId)))
        ]);

        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          const classesData = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          setProfile(profileData);
          setEnrolledClasses(classesData);

          // Update Cache
          globalStudentProfileCache[studentId] = {
            profile: profileData,
            enrolledClasses: classesData,
            timestamp: Date.now()
          };
        } else {
          setProfile(null); 
        }
      } catch (e) {
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndClasses();
  }, [studentId]);

  // Derived Data
  const trueStreak = useMemo(() => calculateTrueStreak(profile?.dailyHistory), [profile]);
  const chartData = useMemo(() => generateChartData(profile?.dailyHistory, lang), [profile, lang]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-indigo-500" size={28} />
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.loading}</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col items-center justify-center gap-4 p-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center shadow-sm border border-slate-200"><UserCircle size={32} /></div>
        <p className="font-black text-slate-800 text-[16px] tracking-tight">{t.notFound}</p>
        <button onClick={() => router.back()} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-sm active:scale-95 text-[13px]">{t.back}</button>
      </div>
    );
  }

  // --- SAFE DATA PARSING ---
  const displayName = profile.displayName || t.unknown;
  const username = profile.username || 'student';
  const bio = profile.bio;
  const initial = displayName.charAt(0).toUpperCase();
  const avatarUrl = profile.photoURL || profile.photoUrl || profile.avatar || null;

  const institution = profile.institution;
  const grade = profile.grade;
  const rawLocation = [profile.location?.district, profile.location?.region, profile.location?.country].filter(Boolean).join(', ');
  const location = rawLocation.length > 0 ? rawLocation : null;
  const email = profile.email;
  const phone = profile.phone;
  const birthDate = profile.birthDate; 

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      
      {/* 🟢 ULTRA MINIMALISTIC HEADER */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3 flex items-center shadow-sm">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors font-bold text-[13px] active:scale-95">
          <ChevronLeft size={18} strokeWidth={2.5} /> {t.back}
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 font-black text-[15px] text-slate-900 truncate max-w-[150px] md:max-w-xs opacity-0 md:opacity-100">
          {displayName}
        </h1>
      </header>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 md:py-8 space-y-4 md:space-y-6 animate-in fade-in duration-300">
        
        {/* --- 1. HERO SECTION (Native Mobile Profile Style) --- */}
        <div className="flex flex-col items-center md:flex-row md:items-start gap-4 md:gap-6 bg-transparent md:bg-white md:border border-slate-200/80 md:p-6 rounded-[1.5rem] md:shadow-sm">
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-3xl md:text-4xl text-white shadow-sm overflow-hidden border-[3px] border-white ring-1 ring-slate-200">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : initial}
            </div>
            {/* Level Badge Overlay */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-sm">
              Lvl {profile.level || 1}
            </div>
          </div>

          <div className="text-center md:text-left flex-1 min-w-0 px-2">
            <h1 className="text-[18px] md:text-[22px] font-black text-slate-900 tracking-tight leading-tight truncate">{displayName}</h1>
            <p className="text-[12px] md:text-[14px] font-bold text-slate-400 mt-0.5">@{username}</p>
            {bio && <p className="text-[13px] md:text-[14px] font-medium text-slate-600 leading-relaxed mt-3 bg-white md:bg-slate-50 p-3 rounded-xl border border-slate-100 md:border-slate-200/60 text-left inline-block w-full shadow-sm md:shadow-none">"{bio}"</p>}
          </div>
        </div>

        {/* --- 2. STATS ROW (Segmented Block) --- */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm flex divide-x divide-slate-100 overflow-hidden">
          <div className="flex-1 p-3 md:p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[16px] md:text-[20px] font-black text-slate-900">{profile.level || 1}</span>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1"><Award size={12} className="text-indigo-400"/> {t.level}</span>
          </div>
          <div className="flex-1 p-3 md:p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[16px] md:text-[20px] font-black text-slate-900">{(profile.totalXP || 0).toLocaleString()}</span>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1"><Star size={12} className="text-amber-400"/> {t.totalXP}</span>
          </div>
          <div className="flex-1 p-3 md:p-4 flex flex-col items-center justify-center text-center bg-slate-50/50">
            <span className={`text-[16px] md:text-[20px] font-black ${trueStreak > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{trueStreak}</span>
            <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1 ${trueStreak > 0 ? 'text-orange-500' : 'text-slate-400'}`}><Flame size={12} className={trueStreak > 0 ? 'text-orange-500' : 'text-slate-300'}/> {t.streak}</span>
          </div>
        </div>

        {/* --- 3. RECHARTS ACTIVITY GRAPH --- */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 md:p-6">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] md:text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Activity size={14} className="text-emerald-500"/> {t.activity}
              </h3>
              {profile.totalXP > 0 && <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-widest">Live</span>}
           </div>
           
           <div className="w-full h-[180px] md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorXP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} dy={10} minTickGap={20} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '12px', padding: '6px 10px' }}
                    itemStyle={{ color: '#10B981' }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="XP" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorXP)" activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* --- 4. DETAILS LISTS (Apple Settings Style) --- */}
        <div className="space-y-4 md:space-y-6">
          
          {/* Academic Info */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><School size={14} className="text-indigo-400"/> {t.academic}</h3>
            </div>
            <div className="flex flex-col">
              <DetailRow icon={<School size={16}/>} label={t.institution} value={institution} fallback={t.notProvided} />
              <div className="h-px bg-slate-100 mx-4"></div>
              <DetailRow icon={<BadgeCheck size={16}/>} label={t.grade} value={grade} fallback={t.notProvided} />
              <div className="h-px bg-slate-100 mx-4"></div>
              <DetailRow icon={<MapPin size={16}/>} label={t.location} value={location} fallback={t.notProvided} />
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><UserCircle size={14} className="text-blue-400"/> {t.contact}</h3>
            </div>
            <div className="flex flex-col">
              <DetailRow icon={<Mail size={16}/>} label={t.email} value={email} fallback={t.notProvided} />
              <div className="h-px bg-slate-100 mx-4"></div>
              <DetailRow icon={<Phone size={16}/>} label={t.phone} value={phone} fallback={t.notProvided} />
              <div className="h-px bg-slate-100 mx-4"></div>
              <DetailRow icon={<CalendarDays size={16}/>} label={t.birthDate} value={birthDate} fallback={t.notProvided} />
            </div>
          </div>

          {/* Enrolled Classes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen size={14} className="text-purple-500"/> {t.enrolledClasses}
              </h3>
              <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-md">{enrolledClasses.length}</span>
            </div>
            <div className="p-2 sm:p-3">
              {enrolledClasses.length === 0 ? (
                 <div className="text-center py-6 text-slate-400 text-[12px] font-bold bg-slate-50/50 rounded-xl">{t.noClasses}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {enrolledClasses.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-9 h-9 bg-slate-100 text-slate-500 rounded-[10px] flex items-center justify-center shrink-0">
                          <School size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-900 truncate leading-snug">{cls.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">{cls.teacherName}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENT FOR ROWS (Minimalist) ---
function DetailRow({ icon, label, value, fallback }: { icon: React.ReactNode, label: string, value: string | null | undefined, fallback: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="w-8 h-8 bg-slate-100 rounded-[10px] flex items-center justify-center text-slate-500 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-[13px] sm:text-[14px] font-bold text-slate-800 mt-0.5 truncate leading-snug">
          {value ? value : <span className="text-slate-400 font-medium italic">{fallback}</span>}
        </p>
      </div>
    </div>
  );
}