'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import { 
  ChevronLeft, Award, Star, Flame, School, 
  MapPin, Phone, Loader2, BadgeCheck, Mail, 
  CalendarDays, Clock, Activity, UserCircle, BookOpen, ChevronRight 
} from 'lucide-react';
import { useTeacherLanguage } from '@/app/teacher/layout';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts';

// --- TRANSLATION DICTIONARY ---
const PROFILE_TRANSLATIONS: any = {
  uz: {
    back: "Ortga", loading: "O'quvchi ma'lumotlari yuklanmoqda...", notFound: "O'quvchi topilmadi",
    unknown: "Noma'lum O'quvchi", notProvided: "Kiritilmagan",
    level: "Daraja", totalXP: "Umumiy XP", streak: "Kunlik Davomiylik",
    academic: "Akademik Ma'lumotlar", contact: "Aloqa va Hisob", activity: "Faollik Tarixi (Oxirgi 14 kun)",
    institution: "Muassasa", grade: "Sinf / Kurs", location: "Joylashuv", 
    phone: "Telefon", email: "Email", birthDate: "Tug'ilgan Sana", 
    joined: "Qo'shilgan vaqti", lastActive: "Oxirgi faollik",
    enrolledClasses: "A'zo bo'lgan sinflari", noClasses: "Hech qanday sinfga a'zo emas."
  },
  en: {
    back: "Back", loading: "Loading student data...", notFound: "Student not found",
    unknown: "Unknown Student", notProvided: "Not provided",
    level: "Level", totalXP: "Total XP", streak: "Day Streak",
    academic: "Academic Details", contact: "Contact Details", activity: "Activity History (Last 14 Days)",
    institution: "Institution", grade: "Grade", location: "Location", 
    phone: "Phone", email: "Email", birthDate: "Birth Date", 
    joined: "Joined", lastActive: "Last Active",
    enrolledClasses: "Enrolled Classes", noClasses: "Not enrolled in any classes."
  },
  ru: {
    back: "Назад", loading: "Загрузка данных...", notFound: "Ученик не найден",
    unknown: "Неизвестный ученик", notProvided: "Не указано",
    level: "Уровень", totalXP: "Всего XP", streak: "Дней подряд",
    academic: "Академические данные", contact: "Контакты", activity: "Активность (Последние 14 дней)",
    institution: "Учреждение", grade: "Класс", location: "Локация", 
    phone: "Телефон", email: "Email", birthDate: "Дата Рождения", 
    joined: "Регистрация", lastActive: "Был(а) в сети",
    enrolledClasses: "Мои классы", noClasses: "Не состоит ни в одном классе."
  }
};

// 🟢 SMART STREAK CALCULATOR (Fixes the Ghost Streak Bug)
const calculateTrueStreak = (dailyHistory: Record<string, number> | undefined) => {
  if (!dailyHistory) return 0;
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (d: Date) => {
    // Correctly formats to local YYYY-MM-DD
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(yesterday);

  // If they earned no XP today AND no XP yesterday, their streak is completely broken (0).
  if (!dailyHistory[todayStr] && !dailyHistory[yesterdayStr]) {
    return 0;
  }

  // If the streak is alive, trace backwards day by day to count it
  let streakCount = 0;
  let checkDate = new Date(dailyHistory[todayStr] ? today : yesterday);

  while (true) {
    const checkStr = formatDate(checkDate);
    if (dailyHistory[checkStr] && dailyHistory[checkStr] > 0) {
      streakCount++;
      checkDate.setDate(checkDate.getDate() - 1); // Move back one day
    } else {
      break; // Streak broken
    }
  }

  return streakCount;
};

// 🟢 CHART DATA GENERATOR (Fills in missing days with 0)
const generateChartData = (dailyHistory: Record<string, number> | undefined, lang: string) => {
  const data = [];
  const today = new Date();
  
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    
    const offset = d.getTimezoneOffset() * 60000;
    const dateStr = new Date(d.getTime() - offset).toISOString().split('T')[0];
    
    const displayDate = d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-US', { month: 'short', day: 'numeric' });
    
    data.push({
      name: displayDate,
      XP: dailyHistory?.[dateStr] || 0
    });
  }
  return data;
};

const safeFormatDate = (dateVal: any, includeTime: boolean = false) => {
  if (!dateVal) return null;
  try {
    const d = dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', ...(includeTime && { hour: '2-digit', minute: '2-digit' }) });
  } catch (e) { return null; }
};

export default function StudentProfilePage() {
  const router = useRouter();
  const { studentId } = useParams() as { studentId: string };
  const { lang } = useTeacherLanguage();
  const t = PROFILE_TRANSLATIONS[lang] || PROFILE_TRANSLATIONS['en'];

  const [profile, setProfile] = useState<any>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    const fetchProfileAndClasses = async () => {
      try {
        const [profileSnap, classesSnap] = await Promise.all([
          getDoc(doc(db, 'users', studentId)),
          getDocs(query(collection(db, 'classes'), where('studentIds', 'array-contains', studentId)))
        ]);

        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
          setEnrolledClasses(classesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">{t.loading}</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-[2rem] flex items-center justify-center shadow-sm border border-slate-200"><UserCircle size={40} /></div>
        <p className="font-black text-slate-800 text-xl tracking-tight">{t.notFound}</p>
        <button onClick={() => router.back()} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-md">{t.back}</button>
      </div>
    );
  }

  // --- SAFE DATA PARSING ---
  const displayName = profile.displayName || t.unknown;
  const username = profile.username || 'student';
  const bio = profile.bio;
  const initial = displayName.charAt(0).toUpperCase();

  const institution = profile.institution;
  const grade = profile.grade;
  const rawLocation = [profile.location?.district, profile.location?.region, profile.location?.country].filter(Boolean).join(', ');
  const location = rawLocation.length > 0 ? rawLocation : null;
  
  const email = profile.email;
  const phone = profile.phone;
  const birthDate = profile.birthDate; 
  const joinedDate = safeFormatDate(profile.createdAt);
  const lastActive = safeFormatDate(profile.lastActiveTimestamp || profile.lastActiveDate, true);

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      {/* 🟢 VERCEL STYLE HEADER */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-[14px]">
          <ChevronLeft size={20} strokeWidth={2.5} /> {t.back}
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* --- 1. HERO SECTION (Minimalist & Clean) --- */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50/50 to-transparent z-0 pointer-events-none"></div>
          
          <div className="w-28 h-28 shrink-0 rounded-[2rem] bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-5xl text-white shadow-lg shadow-indigo-500/20 relative z-10">
            {initial}
          </div>

          <div className="text-center md:text-left relative z-10 flex-1">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{displayName}</h1>
            <p className="text-[16px] font-bold text-slate-400 mt-1 mb-4">@{username}</p>
            {bio && <p className="text-[15px] font-medium text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block text-left w-full">"{bio}"</p>}
          </div>
        </div>

        {/* --- 2. VIBRANT GAMIFICATION CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <Award size={28} className="text-indigo-500 mb-3" />
            <span className="text-4xl font-black text-slate-900">{profile.level || 1}</span>
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mt-1.5">{t.level}</span>
          </div>
          
          <div className="bg-amber-50/50 border border-amber-100 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <Star size={28} className="text-amber-500 mb-3" />
            <span className="text-4xl font-black text-slate-900">{profile.totalXP || 0}</span>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mt-1.5">{t.totalXP}</span>
          </div>

          {/* Dynamic Streak Card (Red if 0, Orange/Fire if active) */}
          <div className={`border rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center shadow-sm ${trueStreak > 0 ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-50 border-slate-200'}`}>
            <Flame size={28} className={`mb-3 ${trueStreak > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
            <span className={`text-4xl font-black ${trueStreak > 0 ? 'text-slate-900' : 'text-slate-400'}`}>{trueStreak}</span>
            <span className={`text-[11px] font-bold uppercase tracking-widest mt-1.5 ${trueStreak > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{t.streak}</span>
          </div>
        </div>

        {/* --- 3. RECHARTS ACTIVITY GRAPH --- */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity size={18} className="text-emerald-500"/> {t.activity}
              </h3>
              {profile.totalXP > 0 && <span className="bg-emerald-50 text-emerald-600 text-[11px] font-black px-3 py-1 rounded-full border border-emerald-100">Live</span>}
           </div>
           
           <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorXP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '13px', padding: '8px 12px' }}
                    itemStyle={{ color: '#10B981' }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="XP" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorXP)" activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* --- 4. DETAILS BENTO GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><School size={16} className="text-indigo-400"/> {t.academic}</h3>
            </div>
            <div className="flex-1 p-2">
              <DetailRow icon={<School size={18}/>} label={t.institution} value={institution} fallback={t.notProvided} />
              <DetailRow icon={<BadgeCheck size={18}/>} label={t.grade} value={grade} fallback={t.notProvided} />
              <DetailRow icon={<MapPin size={18}/>} label={t.location} value={location} fallback={t.notProvided} />
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><UserCircle size={16} className="text-blue-400"/> {t.contact}</h3>
            </div>
            <div className="flex-1 p-2">
              <DetailRow icon={<Mail size={18}/>} label={t.email} value={email} fallback={t.notProvided} />
              <DetailRow icon={<Phone size={18}/>} label={t.phone} value={phone} fallback={t.notProvided} />
              <DetailRow icon={<CalendarDays size={18}/>} label={t.birthDate} value={birthDate} fallback={t.notProvided} />
            </div>
          </div>

          {/* CROSS-REFERENCE CLASSES */}
          <div className="md:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={16} className="text-purple-500"/> {t.enrolledClasses}
              </h3>
              <span className="bg-purple-100 text-purple-700 text-[11px] font-black px-2.5 py-0.5 rounded-md">{enrolledClasses.length}</span>
            </div>
            <div className="p-6">
              {enrolledClasses.length === 0 ? (
                 <div className="text-center py-8 text-slate-400 text-[13px] font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">{t.noClasses}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {enrolledClasses.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-sm transition-all group bg-white">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center font-bold border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                          <School size={20} />
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-slate-900 line-clamp-1">{cls.title}</p>
                          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">{cls.teacherName}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
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

// --- HELPER COMPONENT FOR ROWS ---
function DetailRow({ icon, label, value, fallback }: { icon: React.ReactNode, label: string, value: string | null | undefined, fallback: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0 border border-slate-200/60 shadow-sm group-hover:bg-white group-hover:shadow-md transition-all">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-[15px] font-bold text-slate-800 mt-0.5 truncate">
          {value ? value : <span className="text-slate-400 font-medium italic">{fallback}</span>}
        </p>
      </div>
    </div>
  );
}