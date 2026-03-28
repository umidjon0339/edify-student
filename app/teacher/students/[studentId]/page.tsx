'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  ChevronLeft, Award, Star, Flame, School, 
  MapPin, Phone, Loader2, BadgeCheck, Mail, 
  CalendarDays, Clock, Activity, UserCircle
} from 'lucide-react';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATION DICTIONARY ---
const PROFILE_TRANSLATIONS = {
  uz: {
    back: "Ortga qaytish", loading: "Profil yuklanmoqda...", notFound: "O'quvchi topilmadi",
    unknown: "Noma'lum O'quvchi", notProvided: "Kiritilmagan",
    level: "Daraja", totalXP: "Umumiy XP", streak: "Davomiylik",
    academic: "Akademik Ma'lumotlar", contact: "Aloqa va Hisob", activity: "Faollik",
    institution: "Muassasa", grade: "Sinf / Kurs", location: "Joylashuv", 
    phone: "Telefon", email: "Email", birthDate: "Tug'ilgan Sana", 
    joined: "Qo'shilgan vaqti", lastActive: "Oxirgi faollik"
  },
  en: {
    back: "Go Back", loading: "Loading profile...", notFound: "Student not found",
    unknown: "Unknown Student", notProvided: "Not provided",
    level: "Level", totalXP: "Total XP", streak: "Streak",
    academic: "Academic Details", contact: "Contact & Account", activity: "Activity",
    institution: "Institution", grade: "Grade", location: "Location", 
    phone: "Phone", email: "Email", birthDate: "Birth Date", 
    joined: "Joined", lastActive: "Last Active"
  },
  ru: {
    back: "Назад", loading: "Загрузка профиля...", notFound: "Ученик не найден",
    unknown: "Неизвестный ученик", notProvided: "Не указано",
    level: "Уровень", totalXP: "Всего XP", streak: "Серия",
    academic: "Академические данные", contact: "Контакты и Аккаунт", activity: "Активность",
    institution: "Учреждение", grade: "Класс", location: "Локация", 
    phone: "Телефон", email: "Email", birthDate: "Дата Рождения", 
    joined: "Регистрация", lastActive: "Был(а) в сети"
  }
};

// 🟢 PREMIUM VIBRANT PALETTE (Matches Android)
const STUDENT_COLORS = ['#3B82F6', '#A855F7', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4'];

const getStudentColor = (uid: string) => {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return STUDENT_COLORS[Math.abs(hash) % STUDENT_COLORS.length];
};

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper to safely format Firebase Timestamps OR ISO Strings
const safeFormatDate = (dateVal: any, includeTime: boolean = false) => {
  if (!dateVal) return null;
  try {
    const d = dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString([], { 
      year: 'numeric', month: 'short', day: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' }) 
    });
  } catch (e) {
    return null;
  }
};

export default function StudentProfilePage() {
  const router = useRouter();
  const { studentId } = useParams() as { studentId: string };
  const { lang } = useTeacherLanguage();
  const t = PROFILE_TRANSLATIONS[lang] || PROFILE_TRANSLATIONS['en'];

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', studentId));
        if (snap.exists()) setProfile(snap.data());
      } catch (e) {
        console.error("Error fetching profile", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [studentId]);

  const color = useMemo(() => getStudentColor(studentId), [studentId]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">{t.loading}</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-sm">
          <BadgeCheck size={32} />
        </div>
        <p className="font-black text-slate-800 text-lg">{t.notFound}</p>
        <button onClick={() => router.back()} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-sm">{t.back}</button>
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
  const location = [profile.location?.district, profile.location?.region, profile.location?.country].filter(Boolean).join(', ');
  
  const email = profile.email;
  const phone = profile.phone;
  const birthDate = profile.birthDate; // Usually YYYY-MM-DD
  const joinedDate = safeFormatDate(profile.createdAt);
  const lastActive = safeFormatDate(profile.lastActiveTimestamp || profile.lastActiveDate, true);

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      {/* 🟢 TOP NAV */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-4 flex items-center shadow-sm">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 w-10 h-10 justify-center bg-slate-50 border border-slate-200/80 rounded-[12px] text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all">
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* --- 1. HERO SECTION --- */}
        <div className="flex flex-col items-center text-center">
          <div 
            style={{ backgroundColor: hexToRgba(color, 0.15), borderColor: hexToRgba(color, 0.4), color: color }}
            className="w-28 h-28 md:w-32 md:h-32 rounded-[2rem] border-2 flex items-center justify-center font-black text-5xl shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300"
          >
            {initial}
          </div>

          <h1 className="text-3xl font-black text-slate-900 mt-5 tracking-tight">
            {displayName}
          </h1>
          <p style={{ color: color }} className="text-[15px] font-black uppercase tracking-widest mt-1 opacity-90">
            @{username}
          </p>

          {bio && (
            <div className="mt-5 max-w-lg bg-white border border-slate-200/80 p-5 rounded-[1.5rem] shadow-sm relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black text-slate-400 uppercase tracking-widest">Bio</div>
              <p className="text-[14px] font-medium text-slate-600 leading-relaxed">
                "{bio}"
              </p>
            </div>
          )}
        </div>

        {/* --- 2. TINTED GAMIFICATION ROW --- */}
        <div className="grid grid-cols-3 gap-3 md:gap-5">
          <div className="bg-blue-50 border border-blue-200/60 rounded-[1.5rem] p-4 md:p-6 flex flex-col items-center text-center shadow-sm">
            <Award size={28} className="text-blue-500 mb-2" />
            <span className="text-3xl md:text-4xl font-black text-slate-900">{profile.level || 1}</span>
            <span className="text-[10px] font-black text-blue-600/80 uppercase tracking-widest mt-1">{t.level}</span>
          </div>
          
          <div className="bg-amber-50 border border-amber-200/60 rounded-[1.5rem] p-4 md:p-6 flex flex-col items-center text-center shadow-sm">
            <Star size={28} className="text-amber-500 mb-2" />
            <span className="text-3xl md:text-4xl font-black text-slate-900">{profile.totalXP || 0}</span>
            <span className="text-[10px] font-black text-amber-600/80 uppercase tracking-widest mt-1">{t.totalXP}</span>
          </div>

          <div className="bg-rose-50 border border-rose-200/60 rounded-[1.5rem] p-4 md:p-6 flex flex-col items-center text-center shadow-sm">
            <Flame size={28} className="text-rose-500 mb-2" />
            <span className="text-3xl md:text-4xl font-black text-slate-900">{profile.currentStreak || 0}</span>
            <span className="text-[10px] font-black text-rose-600/80 uppercase tracking-widest mt-1">{t.streak}</span>
          </div>
        </div>

        {/* --- 3. BENTO BOX DETAILS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* BOX A: Academic Details */}
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><School size={16} className="text-indigo-400"/> {t.academic}</h3>
            </div>
            <div className="flex-1">
              <DetailRow icon={<School size={18}/>} label={t.institution} value={institution} fallback={t.notProvided} />
              <div className="h-px bg-slate-100 ml-16"></div>
              <DetailRow icon={<BadgeCheck size={18}/>} label={t.grade} value={grade} fallback={t.notProvided} />
              <div className="h-px bg-slate-100 ml-16"></div>
              <DetailRow icon={<MapPin size={18}/>} label={t.location} value={location} fallback={t.notProvided} />
            </div>
          </div>

          {/* BOX B: Contact & Account */}
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><UserCircle size={16} className="text-blue-400"/> {t.contact}</h3>
            </div>
            <div className="flex-1">
              <DetailRow icon={<Mail size={18}/>} label={t.email} value={email} fallback={t.notProvided} />
              <div className="h-px bg-slate-100 ml-16"></div>
              <DetailRow icon={<Phone size={18}/>} label={t.phone} value={phone} fallback={t.notProvided} />
              <div className="h-px bg-slate-100 ml-16"></div>
              <DetailRow icon={<CalendarDays size={18}/>} label={t.birthDate} value={birthDate} fallback={t.notProvided} />
            </div>
          </div>

          {/* BOX C: Activity (Spans full width if needed) */}
          <div className="md:col-span-2 bg-white rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col sm:flex-row">
            <div className="flex-1">
              <DetailRow icon={<Clock size={18}/>} label={t.joined} value={joinedDate} fallback={t.notProvided} />
            </div>
            <div className="hidden sm:block w-px bg-slate-100"></div>
            <div className="sm:hidden h-px bg-slate-100 ml-16"></div>
            <div className="flex-1">
              <DetailRow icon={<Activity size={18}/>} label={t.lastActive} value={lastActive} fallback={t.notProvided} />
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
    <div className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors">
      <div className="w-10 h-10 bg-slate-100/80 rounded-xl flex items-center justify-center text-slate-500 shrink-0 border border-slate-200/50 shadow-inner">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-[14px] font-bold text-slate-800 mt-0.5 truncate">
          {value ? value : <span className="text-slate-400 font-medium italic">{fallback}</span>}
        </p>
      </div>
    </div>
  );
}