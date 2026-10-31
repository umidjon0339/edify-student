'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import {
  ChevronLeft, Award, Star, Flame, School,
  MapPin, Phone, BadgeCheck, Mail,
  CalendarDays, Activity, UserCircle, BookOpen, ChevronRight
} from 'lucide-react';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { getContactOf } from '@/lib/directory';
import toast from 'react-hot-toast';
import { Button, Spinner } from '@/components/ui';
import { AreaChart, Area, XAxis, Tooltip, YAxis } from 'recharts';
import ChartFrame from '@/components/ChartFrame';
import { calculateStreak, xpDayKey } from '@/lib/xpDays';

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
    enrolledClasses: "Sinflari", noClasses: "Hech qanday sinfga a'zo emas.",
    loadError: "Profil ma'lumotlarini yuklab bo'lmadi"
  },
  en: {
    back: "Back", loading: "Loading data...", notFound: "Student not found",
    unknown: "Unknown Student", notProvided: "Not provided",
    level: "Level", totalXP: "Total XP", streak: "Streak",
    academic: "Academic Details", contact: "Contact Details", activity: "Activity (14 Days)",
    institution: "Institution", grade: "Grade", location: "Location", 
    phone: "Phone", email: "Email", birthDate: "Birth Date", 
    joined: "Joined", lastActive: "Last Active",
    enrolledClasses: "Enrolled Classes", noClasses: "Not enrolled in any classes.",
    loadError: "Failed to load profile data"
  },
  ru: {
    back: "Назад", loading: "Загрузка...", notFound: "Ученик не найден",
    unknown: "Неизвестный ученик", notProvided: "Не указано",
    level: "Уровень", totalXP: "Всего XP", streak: "Серия дней",
    academic: "Академические данные", contact: "Контакты", activity: "Активность (14 дней)",
    institution: "Учреждение", grade: "Класс", location: "Локация", 
    phone: "Телефон", email: "Email", birthDate: "Дата Рождения", 
    joined: "Регистрация", lastActive: "Был(а) в сети",
    enrolledClasses: "Классы", noClasses: "Не состоит ни в одном классе.",
    loadError: "Не удалось загрузить данные профиля"
  }
};

// 🟢 CHART DATA GENERATOR — 14 days, keyed the way the XP writers key them (UTC).
// Reading a device-local key here showed the teacher a different streak and a
// different "today" than the student sees on their own dashboard.
const generateChartData = (dailyHistory: Record<string, number> | undefined, lang: string) => {
  const locale = lang === 'uz' ? 'uz-UZ' : 'en-US';
  const now = Date.now();

  return Array.from({ length: 14 }, (_, i) => {
    const day = new Date(now - (13 - i) * 86_400_000);
    return {
      name: day.toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      XP: dailyHistory?.[xpDayKey(day)] ?? 0,
    };
  });
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
        // Contact details are NOT on the users doc — they live in the owner-only
        // private subcollection, and a teacher reads them through the API route,
        // which proves this student is actually in one of their classes
        // (docs/AUTH.md). Resolves to blanks if the relationship doesn't hold.
        const [profileSnap, classesSnap, contact] = await Promise.all([
          getDoc(doc(db, 'users', studentId)),
          getDocs(query(collection(db, 'classes'), where('studentIds', 'array-contains', studentId))),
          getContactOf(studentId).catch(() => ({ email: '', phone: '' })),
        ]);

        if (profileSnap.exists()) {
          const profileData = { ...profileSnap.data(), ...contact };
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
        toast.error(t.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndClasses();
  }, [studentId]);

  // Derived Data
  const trueStreak = useMemo(() => calculateStreak(profile?.dailyHistory), [profile]);
  const chartData = useMemo(() => generateChartData(profile?.dailyHistory, lang), [profile, lang]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center gap-3">
        <Spinner size={28} />
        <span className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">{t.loading}</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center gap-4 p-4">
        <div className="w-16 h-16 bg-surface-container-highest text-on-surface-variant rounded-m3-lg flex items-center justify-center shadow-elev-1"><UserCircle size={32} /></div>
        <p className="font-black text-on-surface text-[16px] tracking-tight">{t.notFound}</p>
        <Button variant="filled" onClick={() => router.back()}>{t.back}</Button>
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
    <div className="min-h-[100dvh] bg-surface font-t-body selection:bg-primary-container selection:text-on-primary-container pb-[calc(2rem+env(safe-area-inset-bottom))]">

      {/* 🟢 ULTRA MINIMALISTIC HEADER */}
      <header className="t-page-bar sticky top-0 z-30 bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-xl border-b border-outline-variant px-4 py-3 flex items-center shadow-elev-1">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors font-bold text-[13px] active:scale-95">
          <ChevronLeft size={18} strokeWidth={2.5} /> {t.back}
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 font-black text-[15px] text-on-surface truncate max-w-[150px] md:max-w-xs opacity-0 md:opacity-100">
          {displayName}
        </h1>
      </header>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 md:py-8 space-y-4 md:space-y-6 animate-in fade-in duration-300">
        
        {/* --- 1. HERO SECTION (Native Mobile Profile Style) --- */}
        <div className="flex flex-col items-center md:flex-row md:items-start gap-4 md:gap-6 bg-transparent md:bg-surface-container-low md:p-6 rounded-m3-lg md:shadow-elev-1">
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-full bg-primary flex items-center justify-center font-black text-3xl md:text-4xl text-on-primary shadow-elev-1 overflow-hidden border-[3px] border-surface ring-1 ring-outline-variant">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : initial}
            </div>
            {/* Level Badge Overlay */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-surface shadow-elev-1">
              Lvl {profile.level || 1}
            </div>
          </div>

          <div className="text-center md:text-left flex-1 min-w-0 px-2">
            <h1 className="text-[18px] md:text-[22px] font-black text-on-surface tracking-tight leading-tight truncate">{displayName}</h1>
            <p className="text-[12px] md:text-[14px] font-bold text-on-surface-variant mt-0.5">@{username}</p>
            {bio && <p className="text-[13px] md:text-[14px] font-medium text-on-surface-variant leading-relaxed mt-3 bg-surface-container-low md:bg-surface-container p-3 rounded-m3-md border border-outline-variant text-left inline-block w-full shadow-elev-1 md:shadow-none">"{bio}"</p>}
          </div>
        </div>

        {/* --- 2. STATS ROW (Segmented Block) --- */}
        <div className="bg-surface-container-low rounded-m3-lg shadow-elev-1 flex divide-x divide-outline-variant overflow-hidden">
          <div className="flex-1 p-3 md:p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[16px] md:text-[20px] font-black text-on-surface">{profile.level || 1}</span>
            <span className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1 flex items-center gap-1"><Award size={12} className="text-primary"/> {t.level}</span>
          </div>
          <div className="flex-1 p-3 md:p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[16px] md:text-[20px] font-black text-on-surface">{(profile.totalXP || 0).toLocaleString()}</span>
            <span className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1 flex items-center gap-1"><Star size={12} className="text-tertiary"/> {t.totalXP}</span>
          </div>
          <div className="flex-1 p-3 md:p-4 flex flex-col items-center justify-center text-center bg-surface-container">
            <span className={`text-[16px] md:text-[20px] font-black ${trueStreak > 0 ? 'text-warning' : 'text-on-surface-variant'}`}>{trueStreak}</span>
            <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1 ${trueStreak > 0 ? 'text-warning' : 'text-on-surface-variant'}`}><Flame size={12} className={trueStreak > 0 ? 'text-warning' : 'text-outline'}/> {t.streak}</span>
          </div>
        </div>

        {/* --- 3. RECHARTS ACTIVITY GRAPH --- */}
        <div className="bg-surface-container-low rounded-m3-lg shadow-elev-1 p-4 md:p-6">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] md:text-[12px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
                <Activity size={14} className="text-success"/> {t.activity}
              </h3>
              {profile.totalXP > 0 && <span className="bg-success-container text-on-success-container text-[9px] font-black px-2 py-0.5 rounded-m3-xs uppercase tracking-widest">Live</span>}
           </div>
           
           {/* Recharts colors are SVG attributes (CSS vars don't resolve there) —
               hex values pinned to components/ui/theme.css: primary #1364b0,
               outline #747b83, outline-variant #bfc5cb, inverse-surface #36383a. */}
           <ChartFrame className="w-full h-[180px] md:h-[220px]">
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorXP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1364b0" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1364b0" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#747b83', fontWeight: 600 }} dy={10} minTickGap={20} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#747b83', fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#36383a', borderRadius: '10px', border: 'none', color: '#eeeeef', fontWeight: 'bold', fontSize: '12px', padding: '6px 10px' }}
                    itemStyle={{ color: '#99c8ff' }}
                    cursor={{ stroke: '#bfc5cb', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="XP" stroke="#1364b0" strokeWidth={2.5} fillOpacity={1} fill="url(#colorXP)" activeDot={{ r: 5, fill: '#1364b0', stroke: '#ffffff', strokeWidth: 2 }} />
                </AreaChart>
              )}
           </ChartFrame>
        </div>

        {/* --- 4. DETAILS LISTS (Apple Settings Style) --- */}
        <div className="space-y-4 md:space-y-6">
          
          {/* Academic Info */}
          <div className="bg-surface-container-low rounded-m3-lg shadow-elev-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant bg-surface-container">
              <h3 className="text-[10px] md:text-[11px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5"><School size={14} className="text-primary"/> {t.academic}</h3>
            </div>
            <div className="flex flex-col">
              <DetailRow icon={<School size={16}/>} label={t.institution} value={institution} fallback={t.notProvided} />
              <div className="h-px bg-outline-variant mx-4"></div>
              <DetailRow icon={<BadgeCheck size={16}/>} label={t.grade} value={grade} fallback={t.notProvided} />
              <div className="h-px bg-outline-variant mx-4"></div>
              <DetailRow icon={<MapPin size={16}/>} label={t.location} value={location} fallback={t.notProvided} />
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-surface-container-low rounded-m3-lg shadow-elev-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant bg-surface-container">
              <h3 className="text-[10px] md:text-[11px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5"><UserCircle size={14} className="text-secondary"/> {t.contact}</h3>
            </div>
            <div className="flex flex-col">
              <DetailRow icon={<Mail size={16}/>} label={t.email} value={email} fallback={t.notProvided} />
              <div className="h-px bg-outline-variant mx-4"></div>
              <DetailRow icon={<Phone size={16}/>} label={t.phone} value={phone} fallback={t.notProvided} />
              <div className="h-px bg-outline-variant mx-4"></div>
              <DetailRow icon={<CalendarDays size={16}/>} label={t.birthDate} value={birthDate} fallback={t.notProvided} />
            </div>
          </div>

          {/* Enrolled Classes */}
          <div className="bg-surface-container-low rounded-m3-lg shadow-elev-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant bg-surface-container flex justify-between items-center">
              <h3 className="text-[10px] md:text-[11px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen size={14} className="text-tertiary"/> {t.enrolledClasses}
              </h3>
              <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-black px-2 py-0.5 rounded-m3-xs">{enrolledClasses.length}</span>
            </div>
            <div className="p-2 sm:p-3">
              {enrolledClasses.length === 0 ? (
                 <div className="text-center py-6 text-on-surface-variant text-[12px] font-bold bg-surface-container rounded-m3-md">{t.noClasses}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {enrolledClasses.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-3 border border-outline-variant rounded-m3-md hover:bg-state-hover transition-colors group">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-9 h-9 bg-surface-container-high text-on-surface-variant rounded-m3-sm flex items-center justify-center shrink-0">
                          <School size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-on-surface truncate leading-snug">{cls.title}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest truncate mt-0.5">{cls.teacherName}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-outline shrink-0" />
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
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-state-hover transition-colors">
      <div className="w-8 h-8 bg-surface-container-high rounded-m3-sm flex items-center justify-center text-on-surface-variant shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <p className="text-[9px] sm:text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{label}</p>
        <p className="text-[13px] sm:text-[14px] font-bold text-on-surface mt-0.5 truncate leading-snug">
          {value ? value : <span className="text-on-surface-variant font-medium italic">{fallback}</span>}
        </p>
      </div>
    </div>
  );
}