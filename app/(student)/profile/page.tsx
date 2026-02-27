"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import {
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  User,
  Mail,
  LogOut,
  Award,
  Flame,  Trophy,  Calendar,  Edit2,  X,  RefreshCw,
  MapPin,  School,  Quote,  Briefcase,  Menu,  Info,  Phone,  Send,  Github,Linkedin
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import EditProfileModal from "./_components/EditProfileModal";
import { useStudentLanguage } from "@/app/(student)/layout"; // 🟢 Import Hook

// --- 1. TRANSLATION DICTIONARY ---
const PROFILE_TRANSLATIONS = {
  uz: {
    loading: "Profil yuklanmoqda...",
    role: { student: "O'quvchi", teacher: "O'qituvchi" },
    buttons: {
      edit: "Profilni Tahrirlash",
      support: "Yordam",
      logout: "Chiqish",
      dashboard: "Boshqaruv",
      classes: "Sinflarim",
      leaderboard: "Reyting",
      history: "Tarix",
      profile: "Profil"
    },
    info: {
      title: "Shaxsiy Ma'lumotlar",
      email: "Email Manzili",
      birth: "Tug'ilgan Sana",
      location: "Joylashuv",
      education: "Ta'lim",
      notProvided: "Kiritilmagan",
      gradePrefix: "Sinf",
      yearPrefix: "Kurs"
    },
    stats: {
      xp: "Jami XP",
      streak: "Kunlik Seriya",
      level: "Joriy Daraja"
    },
    activity: {
      title: "Faollik Tarixi",
      daysActive: "Kun Faol",
      less: "Kamroq",
      more: "Ko'proq",
      mon: "Dush",
      wed: "Chor",
      fri: "Juma"
    },
    about: {
      title: "EdifyPlatform",
      subtitle: "AI yordamida ta'limni kuchaytirish",
      supportHeader: "Yordam va Aloqa",
      telegram: "Telegram Yordam",
      callCenter: "Aloqa Markazi",
      email: "Email Manzili",
      devHeader: "Dasturchi",
      innovating: "Ta'lim texnologiyalarini rivojlantirish",
      rights: "Barcha huquqlar himoyalangan.",
      system: "Tizim Ishlamoqda"
    },
    toasts: {
      updateSuccess: "Profil muvaffaqiyatli yangilandi!",
      updateFail: "Profilni yangilashda xatolik",
      passSuccess: "Parol yangilandi!",
      passFail: "Xatolik. Joriy parolni tekshiring."
    }
  },
  en: {
    loading: "Loading Profile...",
    role: { student: "Student", teacher: "Instructor" },
    buttons: {
      edit: "Edit Profile",
      support: "Support",
      logout: "Sign Out",
      dashboard: "Dashboard",
      classes: "My Classes",
      leaderboard: "Leaderboard",
      history: "History",
      profile: "Profile"
    },
    info: {
      title: "Personal Info",
      email: "Email Address",
      birth: "Birth Date",
      location: "Location",
      education: "Education",
      notProvided: "Not provided",
      gradePrefix: "Grade",
      yearPrefix: "Year"
    },
    stats: {
      xp: "Total XP",
      streak: "Day Streak",
      level: "Current Level"
    },
    activity: {
      title: "Activity Log",
      daysActive: "Days Active",
      less: "Less",
      more: "More",
      mon: "Mon",
      wed: "Wed",
      fri: "Fri"
    },
    about: {
      title: "EdifyPlatform",
      subtitle: "Empowering Education with AI",
      supportHeader: "Support & Contact",
      telegram: "Telegram Support",
      callCenter: "Call Center",
      email: "Email Address",
      devHeader: "Developed By",
      innovating: "Innovating Education Technology",
      rights: "All rights reserved.",
      system: "System Operational"
    },
    toasts: {
      updateSuccess: "Profile updated successfully!",
      updateFail: "Failed to update profile",
      passSuccess: "Password updated!",
      passFail: "Failed. Check current password."
    }
  },
  ru: {
    loading: "Загрузка профиля...",
    role: { student: "Ученик", teacher: "Преподаватель" },
    buttons: {
      edit: "Редактировать",
      support: "Поддержка",
      logout: "Выйти",
      dashboard: "Главная",
      classes: "Мои Классы",
      leaderboard: "Рейтинг",
      history: "История",
      profile: "Профиль"
    },
    info: {
      title: "Личная Информация",
      email: "Эл. почта",
      birth: "Дата Рождения",
      location: "Местоположение",
      education: "Образование",
      notProvided: "Не указано",
      gradePrefix: "Класс",
      yearPrefix: "Курс"
    },
    stats: {
      xp: "Всего XP",
      streak: "Серия Дней",
      level: "Текущий Уровень"
    },
    activity: {
      title: "История Активности",
      daysActive: "Дней Активности",
      less: "Меньше",
      more: "Больше",
      mon: "Пн",
      wed: "Ср",
      fri: "Пт"
    },
    about: {
      title: "EdifyPlatform",
      subtitle: "Улучшение образования с ИИ",
      supportHeader: "Поддержка и Контакты",
      telegram: "Telegram Поддержка",
      callCenter: "Колл-центр",
      email: "Эл. почта",
      devHeader: "Разработчик",
      innovating: "Инновации в образовании",
      rights: "Все права защищены.",
      system: "Система работает"
    },
    toasts: {
      updateSuccess: "Профиль успешно обновлен!",
      updateFail: "Ошибка обновления профиля",
      passSuccess: "Пароль обновлен!",
      passFail: "Ошибка. Проверьте текущий пароль."
    }
  }
};

// --- VISUAL COMPONENTS (Backgrounds & Nav) ---
const FloatingParticles = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.6 + 0.2,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.sin(particle.id) * 50, 0],
            opacity: [
              particle.opacity,
              particle.opacity * 0.1,
              particle.opacity,
            ],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const GlowingOrb = ({
  color,
  size,
  position,
}: {
  color: string;
  size: number;
  position: { x: string; y: string };
}) => (
  <motion.div
    className={`absolute rounded-full ${color} blur-3xl opacity-20 pointer-events-none`}
    style={{
      width: `${size}px`,
      height: `${size}px`,
      left: position.x,
      top: position.y,
    }}
    animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
  />
);

const MobileNavBar = ({ onMenuClick, title }: { onMenuClick: () => void, title: string }) => (
  <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 z-40 flex items-center justify-between px-4 border-b border-slate-800 md:hidden">
    <div className="flex items-center gap-3">
      <button
        onClick={onMenuClick}
        className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors hover:bg-slate-800"
      >
        <Menu size={24} />
      </button>
      <h1 className="text-lg font-black text-white tracking-tight">{title}</h1>
    </div>
  </div>
);

// --- ABOUT / SUPPORT MODAL COMPONENT ---
const AboutModal = ({
  isOpen,
  onClose,
  t
}: {
  isOpen: boolean;
  onClose: () => void;
  t: any;
}) => {
  if (!isOpen) return null;

  const ContactCard = ({
    icon,
    title,
    value,
    href,
    colorClass,
  }: {
    icon: React.ReactNode;
    title: string;
    value: string;
    href?: string;
    colorClass: string;
  }) => {
    const Wrapper = href ? "a" : "div";
    return (
      <Wrapper
        href={href}
        target={href ? "_blank" : undefined}
        rel={href ? "noopener noreferrer" : undefined}
        className={`group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 hover:border-${colorClass}-200 transition-all duration-300 cursor-pointer`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br ${colorClass} group-hover:scale-110 transition-transform duration-300`}
        >
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
            {value}
          </p>
        </div>
      </Wrapper>
    );
  };

  return (
    <motion.div
      className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* PREMIUM HEADER */}
        <div className="relative h-40 bg-slate-900 overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 animate-blob"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2 animate-blob animation-delay-2000"></div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all z-20"
          >
            <X size={20} />
          </button>

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-3">
              <span className="text-3xl font-black text-indigo-600">E</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Edify<span className="text-indigo-400">Platform</span>
            </h2>
            <p className="text-slate-400 text-xs font-medium mt-1">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>{" "}
                {t.supportHeader}
              </h3>

              <ContactCard
                href="https://t.me/Umidjon0339" // 🟢 Trigger Telegram
                colorClass="from-blue-400 to-blue-600"
                title={t.telegram}
                value="@Umidjon0339"
                icon={<Send size={20} />} 
              />

              {/* Phone Card */}
              <ContactCard
                href="tel:+998338602006" // 🟢 Trigger Phone Call
                colorClass="from-emerald-400 to-emerald-600"
                title={t.callCenter}
                value="+998 33 860 20 06"
                icon={<Phone size={24} />}
              />

              {/* Email Card */}
              <ContactCard
                href="mailto:u.jumaqulov@newuu.uz" // 🟢 Trigger Email App
                colorClass="from-orange-400 to-orange-600"
                title={t.email}
                value="u.jumaqulov@newuu.uz"
                icon={<Mail size={24} />}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <span className="w-1 h-4 bg-purple-500 rounded-full"></span>{" "}
                {t.devHeader}
              </h3>

              <div className="p-5 rounded-2xl bg-slate-900 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Briefcase size={100} />
                </div>
                <h4 className="text-lg font-bold mb-1">WASP-2 AI Solutions</h4>
                <p className="text-slate-400 text-xs mb-4">
                  {t.innovating}
                </p>

                <div className="space-y-3">
                  <a
                    href="https://github.com/Wasp-2-AI"
                    target="_blank"
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="bg-white text-slate-900 p-1.5 rounded-full">
                      <Github size={16} />
                    </div>
                    <span className="text-xs font-bold">
                      github.com/wasp-2-ai
                    </span>
                  </a>

                  <a
                    href="https://www.linkedin.com/company/wasp-2-ai"
                    target="_blank"
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="bg-[#0077b5] text-white p-1.5 rounded-full">
                      <Linkedin size={16} />
                    </div>
                    <span className="text-xs font-bold">
                      WASP-2 AI Solutions
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-2 text-center md:text-left">
            <p className="text-[10px] font-bold text-slate-400">
              © 2026 WASP-2 AI Solutions. {t.rights}
            </p>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200">
                v1.0.0
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-emerald-600">
                {t.system}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- HELPER FUNCTIONS ---
const calculateLevel = (xp: number) => {
  if (!xp || xp < 0) return 1;
  return Math.floor(xp / 100) + 1;
};

// --- HELPER: Process Last 30 Days ---
const getLast30DaysData = (history: Record<string, number> = {}) => {
  const days = [];
  const today = new Date();
  
  // Create last 30 days array (in reverse order for chart left-to-right)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i); // Go back i days
    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Get stats
    const xp = history[dateStr] || 0;
    
    // Format Display Date (e.g., "Feb 4")
    const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon"

    days.push({
      fullDate: dateStr,
      displayDate,
      dayName,
      xp
    });
  }
  return days;
};



const getCellColor = (xp: number) => {
  if (xp === 0) return "bg-slate-700/50 border-slate-600";
  if (xp < 50) return "bg-indigo-500/20 border-indigo-500/30";
  if (xp < 100) return "bg-indigo-500/40 border-indigo-500/50";
  if (xp < 200) return "bg-indigo-500/60 border-indigo-500/70";
  return "bg-indigo-500/80 border-indigo-500";
};

const generateHeatmapData = (history: Record<string, number> = {}) => {
  const days = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  while (startDate.getDay() !== 0) startDate.setDate(startDate.getDate() - 1);
  const currentDate = new Date(startDate);
  while (currentDate <= today || currentDate.getDay() !== 0) {
    const dateStr = currentDate.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      xp: history[dateStr] || 0,
      dayOfWeek: currentDate.getDay(),
      month: currentDate.toLocaleString("default", { month: "short" }),
      dayOfMonth: currentDate.getDate(),
      year: currentDate.getFullYear(),
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
};

interface UserData {
  username: string;
  displayName: string;
  email: string;
  phone?: string;
  bio?: string;
  role?: string;
  location?: { country: string; region: string; district: string };
  education?: { institution: string; grade: string };
  birthDate?: string; 
  totalXP: number;
  currentStreak: number;
  level: number;
  dailyHistory: Record<string, number>;
}

// --- MAIN PAGE ---
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const heatmapScrollRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});


  

  // 🟢 Use Language Hook
  const { lang } = useStudentLanguage();
  const t = PROFILE_TRANSLATIONS[lang];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) {
        router.push("/auth/login");
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "users", u.uid));
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUserData(data);
          setFormData({
            displayName: data.displayName || "",
            username: data.username || "",
            phone: data.phone || "+998 ",
            bio: data.bio || "",
            country: data.location?.country || "Uzbekistan",
            region: data.location?.region || "",
            district: data.location?.district || "",
            institution: data.education?.institution || "",
            grade: data.education?.grade || "",
            birthDate: data.birthDate || "",
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!loading && heatmapScrollRef.current) {
      heatmapScrollRef.current.scrollLeft =
        heatmapScrollRef.current.scrollWidth;
    }
  }, [loading, userData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/auth/login");
    } catch (e) {
      console.error("Logout Failed", e);
    }
  };

  const handleSaveProfile = async (updatedData: any) => {
    if (!user) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, "users", user.uid);
      const updates: any = {
        displayName: updatedData.displayName,
        phone: updatedData.phone,
        bio: updatedData.bio,
        location: {
          country: updatedData.country,
          region: updatedData.region,
          district: updatedData.district,
        },
        education: {
          institution: updatedData.institution,
          grade: updatedData.grade,
        },
        birthDate: updatedData.birthDate,
      };

      if (updatedData.username !== userData?.username) {
        const newNameRef = doc(
          db,
          "usernames",
          updatedData.username.toLowerCase()
        );
        batch.set(newNameRef, { uid: user.uid });
        if (userData?.username) {
          const oldNameRef = doc(
            db,
            "usernames",
            userData.username.toLowerCase()
          );
          batch.delete(oldNameRef);
        }
        updates.username = updatedData.username.toLowerCase();
      }

      batch.update(userRef, updates);
      await batch.commit();
      setUserData({ ...userData!, ...updates });
      setFormData(updatedData);
      toast.success(t.toasts.updateSuccess);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      toast.error(t.toasts.updateFail);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (current: string, newP: string) => {
    try {
      if (!user || !user.email) return;
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newP);
      toast.success(t.toasts.passSuccess);
    } catch (e) {
      toast.error(t.toasts.passFail);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-800 flex items-center justify-center relative overflow-hidden">
        <FloatingParticles />
        <div className="z-10 text-center">
          <RefreshCw
            className="animate-spin text-blue-400 mx-auto mb-4"
            size={32}
          />
          <p className="text-blue-400 font-bold">{t.loading}</p>
        </div>
      </div>
    );

  if (!userData) return null;

  const currentLevel = calculateLevel(userData.totalXP);
  const heatmapData = generateHeatmapData(userData.dailyHistory);
  const activeDaysCount = heatmapData.filter((day) => day.xp > 0).length;
  const weeks = [];
  for (let i = 0; i < heatmapData.length; i += 7)
    weeks.push(heatmapData.slice(i, i + 7));

  // Inside ProfilePage, before return:
  const last30Days = getLast30DaysData(userData.dailyHistory);
  const maxXP = Math.max(...last30Days.map(d => d.xp), 1); // Avoid div by zero
  const totalXP30d = last30Days.reduce((acc, curr) => acc + curr.xp, 0);
  const avgXP = Math.round(totalXP30d / 30);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-800 relative overflow-hidden">
      <FloatingParticles />
      <GlowingOrb
        color="bg-blue-500"
        size={300}
        position={{ x: "10%", y: "20%" }}
      />
      <GlowingOrb
        color="bg-purple-500"
        size={400}
        position={{ x: "85%", y: "15%" }}
      />
      <GlowingOrb
        color="bg-orange-500"
        size={250}
        position={{ x: "70%", y: "80%" }}
      />

      <MobileNavBar onMenuClick={() => setIsMobileMenuOpen(true)} title={t.buttons.profile} />

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/90 z-50 md:hidden pt-20 px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-white p-2 bg-slate-800 rounded-lg"
            >
              <X size={24} />
            </button>
            <div className="space-y-4">
              <Link
                href="/dashboard"
                className="block text-lg font-bold text-white py-3 px-4 bg-slate-800 rounded-xl"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.buttons.dashboard}
              </Link>
              <Link
                href="/classes"
                className="block text-lg font-bold text-white py-3 px-4 bg-slate-800 rounded-xl"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.buttons.classes}
              </Link>
              <Link
                href="/leaderboard"
                className="block text-lg font-bold text-white py-3 px-4 bg-slate-800 rounded-xl"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.buttons.leaderboard}
              </Link>
              <Link
                href="/history"
                className="block text-lg font-bold text-white py-3 px-4 bg-slate-800 rounded-xl"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.buttons.history}
              </Link>
              <Link
                href="/profile"
                className="block text-lg font-bold text-white py-3 px-4 bg-indigo-600 rounded-xl"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.buttons.profile}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto p-4 md:p-6 md:p-8 pb-20 pt-20 md:pt-8 relative z-10">
        <Toaster position="top-center" />

        <motion.div
          className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700 overflow-hidden shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-40 bg-gradient-to-r from-slate-800 to-slate-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800"></div>
          </div>

          <div className="px-4 md:px-6 pb-6 md:pb-8">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 relative">
              <div className="-mt-14 relative shrink-0">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-slate-900 bg-slate-800/50 text-slate-300 flex items-center justify-center text-3xl font-bold shadow-lg overflow-hidden">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      className="w-full h-full object-cover"
                      alt="Profile"
                    />
                  ) : (
                    <span>{userData.displayName?.[0]?.toUpperCase()}</span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex-1">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                      {userData.displayName}
                      {userData.role === "teacher" && (
                        <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-md uppercase tracking-wide">
                          {t.role.teacher}
                        </span>
                      )}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 text-sm font-medium text-slate-400">
                      {userData.username && <span>@{userData.username}</span>}
                      <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Briefcase size={14} className="text-indigo-400" />{" "}
                        {userData.role === "teacher" ? t.role.teacher : t.role.student}
                      </span>
                      <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <MapPin size={14} className="text-indigo-400" />{" "}
                        {userData.location?.region || "Uzbekistan"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                    {/* Edit Profile Button */}
                    <motion.button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 md:flex-none px-4 py-2 bg-slate-800 border border-slate-600 text-white font-bold rounded-xl text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Edit2 size={16} /> {t.buttons.edit}
                    </motion.button>

                    {/* Support Button */}
                    <motion.button
                      onClick={() => setIsAboutOpen(true)}
                      className="flex-1 md:flex-none px-4 py-2 bg-slate-800 border border-slate-600 text-white font-bold rounded-xl text-sm hover:bg-slate-700 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Info size={16} /> {t.buttons.support}
                    </motion.button>

                    {/* Logout Button */}
                    <motion.button
                      onClick={handleLogout}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl text-sm hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center justify-center"
                      title={t.buttons.logout}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <LogOut size={16} />
                    </motion.button>
                  </div>
                </div>

                {userData.bio && (
                  <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 relative">
                    <Quote
                      size={16}
                      className="text-indigo-200 absolute top-3 left-3 fill-current"
                    />
                    <p className="text-slate-300 text-sm leading-relaxed italic font-medium pl-6 relative z-10">
                      {userData.bio}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-6 rounded-2xl border border-slate-700 shadow-lg h-full">
              <h3 className="text-sm font-black text-white uppercase tracking-wide mb-6 flex items-center gap-2 pb-4 border-b border-slate-700">
                <User size={16} className="text-indigo-400" /> {t.info.title}
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600 flex items-center justify-center text-slate-400">
                    <Mail size={16} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {t.info.email}
                    </p>
                    <p
                      className="text-sm font-bold text-white truncate"
                      title={userData.email}
                    >
                      {userData.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600 flex items-center justify-center text-slate-400">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {t.info.birth}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {userData.birthDate || t.info.notProvided}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600 flex items-center justify-center text-slate-400">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {t.info.location}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {userData.location?.district
                        ? `${userData.location.district}, `
                        : ""}
                      {userData.location?.region || "Uzbekistan"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600 flex items-center justify-center text-slate-400">
                    <School size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {t.info.education}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {userData.education?.institution || t.info.notProvided}
                    </p>
                    {userData.education?.grade && (
                      <p className="text-xs font-semibold text-slate-400 mt-1 bg-slate-700/50 inline-block px-2 py-0.5 rounded">
                        {userData.education.grade
                          .replace("school_", `${t.info.gradePrefix} `)
                          .replace("uni_", `${t.info.yearPrefix} `)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {/* 1. STATS GRID (Unchanged) */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: <Trophy size={20} />,
                  value: userData.totalXP.toLocaleString(),
                  label: t.stats.xp,
                  color: "yellow",
                },
                {
                  icon: <Flame size={20} />,
                  value: userData.currentStreak,
                  label: t.stats.streak,
                  color: "orange",
                },
                {
                  icon: <Award size={20} />,
                  value: currentLevel,
                  label: t.stats.level,
                  color: "purple",
                },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  className={`bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-5 rounded-2xl border border-slate-700 shadow-lg flex flex-col items-center justify-center text-center group hover:border-${stat.color}-500/30 transition-colors`}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className={`w-10 h-10 bg-${stat.color}-500/20 rounded-full flex items-center justify-center text-${stat.color}-400 mb-3 group-hover:scale-110 transition-transform`}
                  >
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-black text-white">
                    {stat.value}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 2. MODERN ACTIVITY CHART (Replaces Heatmap) */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-6 rounded-2xl border border-slate-700 shadow-lg">
              
              {/* Header with Stats */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-400" /> {t.activity.title}
                </h3>
                
                <div className="flex gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600 flex flex-col items-end min-w-[80px]">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">30 Days</span>
                    <span className="text-sm font-black text-indigo-400">{totalXP30d.toLocaleString()} XP</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600 flex flex-col items-end min-w-[80px]">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Daily Avg</span>
                    <span className="text-sm font-black text-white">{avgXP} XP</span>
                  </div>
                </div>
              </div>

              {/* Chart Container */}
              <div className="relative w-full h-48 flex items-end gap-1 md:gap-2 pt-6">
                
                {/* Y-Axis Guidelines (Background) */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 pb-4">
                   <div className="border-t border-slate-400 w-full"></div>
                   <div className="border-t border-slate-400 w-full dashed"></div>
                   <div className="border-t border-slate-400 w-full"></div>
                </div>

                {/* Bars */}
                {last30Days.map((day, idx) => {
                  const heightPercent = (day.xp / maxXP) * 100;
                  const isToday = idx === 29; 

                  return (
                    <div 
                      key={day.fullDate} 
                      className="group relative flex-1 h-full flex flex-col justify-end items-center"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                        <div className="bg-slate-900 text-white text-xs rounded-lg py-1.5 px-3 shadow-xl border border-slate-700 whitespace-nowrap text-center">
                          <p className="font-black text-indigo-400">{day.xp} XP</p>
                          <p className="text-[10px] text-slate-400 font-medium">{day.displayDate}</p>
                        </div>
                        {/* Little triangle arrow */}
                        <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45 mx-auto -mt-1"></div>
                      </div>

                      {/* Bar */}
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(heightPercent, 2)}%` }} // Min height 2% so empty days show a line
                        transition={{ duration: 0.5, delay: idx * 0.02 }}
                        className={`w-full max-w-[12px] rounded-t-sm transition-all duration-200 
                          ${day.xp > 0 
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.4)]' 
                            : 'bg-slate-700/30'
                          }
                          ${isToday ? 'ring-1 ring-white/50 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : ''}
                        `}
                      />
                      
                      {/* X-Axis Label (Show every 5th day) */}
                      <div className="mt-2 h-4 w-full text-center">
                        {(idx % 5 === 0 || isToday) && (
                          <span className={`text-[9px] font-bold block whitespace-nowrap ${isToday ? 'text-white' : 'text-slate-500'}`}>
                            {day.displayDate.split(' ')[1]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* EDIT MODAL */}
        <AnimatePresence>
          {isEditing && (
            <EditProfileModal
              isOpen={isEditing}
              onClose={() => setIsEditing(false)}
              userData={userData}
              initialData={formData}
              onSave={handleSaveProfile}
              onPasswordUpdate={handlePasswordUpdate}
              saving={saving}
            />
          )}
        </AnimatePresence>

        {/* ABOUT MODAL */}
        <AnimatePresence>
          {isAboutOpen && (
            <AboutModal
              isOpen={isAboutOpen}
              onClose={() => setIsAboutOpen(false)}
              t={t.about} // 🟢 Pass translation
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}