'use client';

import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Firebase & Auth
import { useAuth } from '@/lib/AuthContext';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore'; 

// Icons
import { 
  LayoutDashboard, BookOpen, User as UserIcon, 
  LogOut, Sparkles, Flame, Trophy, ChevronDown, Check,
  Settings, Menu, BookMarked, Compass, X
} from 'lucide-react';

// Components
import NotificationBell from '@/components/NotificationBell';

// ============================================================================
// 1. CONTEXT & TYPES
// ============================================================================
export type LangType = 'uz' | 'en' | 'ru';

interface StudentLangContextType {
  lang: LangType;
  setLang: (lang: LangType) => void;
}

export const StudentLanguageContext = createContext<StudentLangContextType | undefined>(undefined);

export function useStudentLanguage() {
  const context = useContext(StudentLanguageContext);
  if (!context) throw new Error("useStudentLanguage must be used within StudentLayout");
  return context;
}

// ============================================================================
// 2. TRANSLATIONS & HELPERS
// ============================================================================
const LAYOUT_TRANSLATIONS: any = {
  uz: {
    menu: { dashboard: "Boshqaruv", classes: "Sinflarim", explore: "Kurslar", library: "Kutubxona", leaderboard: "Reyting", profile: "Profil" },
    topbar: { streak: "Seriya", profile: "Profil", settings: "Sozlamalar", logout: "Chiqish", language: "Til" },
    loading: "Yuklanmoqda...",
    logoutConfirm: { title: "Tizimdan chiqish", desc: "Haqiqatan ham hisobingizdan chiqmoqchimisiz?", cancel: "Bekor qilish", confirm: "Ha, chiqish" }
  },
  en: {
    menu: { dashboard: "Dashboard", classes: "Classes", explore: "Courses", library: "Library", leaderboard: "Rank", profile: "Profile" },
    topbar: { streak: "Streak", profile: "Profile", settings: "Settings", logout: "Sign Out", language: "Language" },
    loading: "Loading...",
    logoutConfirm: { title: "Sign Out", desc: "Are you sure you want to sign out of your account?", cancel: "Cancel", confirm: "Yes, Sign Out" }
  },
  ru: {
    menu: { dashboard: "Главная", classes: "Классы", explore: "Курсы", library: "Библиотека", leaderboard: "Рейтинг", profile: "Профиль" },
    topbar: { streak: "Серия", profile: "Профиль", settings: "Настройки", logout: "Выйти", language: "Язык" },
    loading: "Загрузка...",
    logoutConfirm: { title: "Выход", desc: "Вы уверены, что хотите выйти из аккаунта?", cancel: "Отмена", confirm: "Да, выйти" }
  }
};

const LANGUAGE_OPTIONS = [
  { code: 'uz', label: "O'zbek", flag: "🇺🇿" }, 
  { code: 'en', label: "English", flag: "🇬🇧" }, 
  { code: 'ru', label: "Русский", flag: "🇷🇺" },
];

const calculateTrueStreak = (dailyHistory: Record<string, number> | undefined) => {
  if (!dailyHistory) return 0;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  if (!dailyHistory[formatDate(today)] && !dailyHistory[formatDate(yesterday)]) return 0;

  let streakCount = 0;
  let checkDate = new Date(dailyHistory[formatDate(today)] ? today : yesterday);

  while (dailyHistory[formatDate(checkDate)] && dailyHistory[formatDate(checkDate)] > 0) {
    streakCount++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streakCount;
};

// ============================================================================
// 3. MAIN LAYOUT COMPONENT
// ============================================================================
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [lang, setLang] = useState<LangType>('uz');
  const [stats, setStats] = useState({ xp: 0, streak: 0 });
  
  // Dropdown & Modal States
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const topbarRef = useRef<HTMLDivElement>(null);

  const t = LAYOUT_TRANSLATIONS[lang] || LAYOUT_TRANSLATIONS['en'];
  const activeLang = LANGUAGE_OPTIONS.find(l => l.code === lang) || LANGUAGE_OPTIONS[0];

  // Auth Protection
  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  // Live Stats Listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats({
          xp: data.totalXP ?? data.xp ?? 0,
          streak: calculateTrueStreak(data.dailyHistory)
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Global Click Listener to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Loading Screen
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-100 gap-4">
        <div className="w-16 h-16 bg-white border-4 border-zinc-200 border-b-8 rounded-[2rem] flex items-center justify-center">
          <BookOpen className="text-violet-500 animate-bounce" size={32} strokeWidth={3} />
        </div>
        <span className="font-black text-zinc-400 uppercase tracking-widest text-[14px]">{t.loading}</span>
      </div>
    );
  }
  if (!user) return null; 

  // MENU ITEMS
  const menuItems = [
    { name: t.menu.dashboard, href: '/dashboard', icon: LayoutDashboard },
    { name: t.menu.classes, href: '/classes', icon: BookOpen },
    { name: t.menu.explore, href: '/explore', icon: Compass }, 
    { name: t.menu.library, href: '/library', icon: BookMarked, hideOnMobile: true }, 
    { name: t.menu.leaderboard, href: '/leaderboard', icon: Trophy },
    { name: t.menu.profile, href: '/profile', icon: UserIcon },
  ];

  return (
    <StudentLanguageContext.Provider value={{ lang, setLang }}>
      <div className="flex min-h-[100dvh] bg-zinc-100 text-zinc-900 font-sans selection:bg-violet-100 selection:text-violet-900 relative">
        
        {/* ========================================================= */}
        {/* TACTILE LOGOUT CONFIRMATION MODAL */}
        {/* ========================================================= */}
        <AnimatePresence>
          {showLogoutModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} 
                className="relative bg-white rounded-[2rem] border-2 border-zinc-200 p-6 md:p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-center justify-center text-rose-500 mb-5">
                  <LogOut size={28} strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">{t.logoutConfirm.title}</h3>
                <p className="text-[15px] font-bold text-zinc-500 mb-8">{t.logoutConfirm.desc}</p>
                <div className="w-full flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3.5 bg-white text-zinc-600 font-black text-[15px] rounded-2xl border-2 border-zinc-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all">
                    {t.logoutConfirm.cancel}
                  </button>
                  <button onClick={() => { signOut(auth); setShowLogoutModal(false); }} className="flex-1 py-3.5 bg-rose-500 text-white font-black text-[15px] rounded-2xl border-2 border-rose-700 border-b-4 active:border-b-0 active:translate-y-[4px] transition-all">
                    {t.logoutConfirm.confirm}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* MOBILE DRAWER SIDEBAR */}
        {/* ========================================================= */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-zinc-900/60 z-[100] md:hidden backdrop-blur-sm"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              
              <motion.aside 
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 bottom-0 w-72 bg-white border-r-2 border-zinc-200 z-[101] flex flex-col md:hidden shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b-2 border-zinc-100 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center text-white border-b-4 border-violet-700 shrink-0">
                      <Sparkles size={20} strokeWidth={3} />
                    </div>
                    <h1 className="text-[18px] font-black text-zinc-900 tracking-tight leading-none">EdifyStudent</h1>
                  </div>
                  <button onClick={() => setIsMobileSidebarOpen(false)} className="w-10 h-10 flex items-center justify-center bg-zinc-100 text-zinc-500 rounded-xl active:scale-95 transition-all">
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>
                
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                  {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                      <Link 
                        key={item.href} 
                        href={item.href} 
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black transition-all duration-200 ${isActive ? 'bg-violet-100 text-violet-700 border-2 border-violet-200 border-b-4 translate-y-[-2px]' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 border-2 border-transparent'}`}
                      >
                        <item.icon size={22} strokeWidth={isActive ? 3 : 2.5} className={isActive ? 'text-violet-600' : 'text-zinc-400'} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* DESKTOP SIDEBAR */}
        {/* ========================================================= */}
        <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white border-r-2 border-zinc-200 z-40">
          <div className="flex items-center gap-3 p-6 border-b-2 border-zinc-100 shrink-0">
            <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center text-white border-b-4 border-violet-700 shrink-0">
              <Sparkles size={20} strokeWidth={3} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[18px] font-black text-zinc-900 tracking-tight leading-none">EdifyStudent</h1>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black transition-all duration-200 ${isActive ? 'bg-violet-100 text-violet-700 border-2 border-violet-200 border-b-4 translate-y-[-2px]' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 border-2 border-transparent'}`}>
                  <item.icon size={22} strokeWidth={isActive ? 3 : 2.5} className={isActive ? 'text-violet-600' : 'text-zinc-400'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ========================================================= */}
        {/* MAIN CONTENT WRAPPER */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col min-w-0 md:pl-64">
          
          {/* 🟢 RESPONSIVE GLOBAL TOP BAR */}
          <header className="bg-white border-b-2 border-zinc-200 sticky top-0 z-40 px-3 sm:px-4 md:px-6 py-2.5 md:py-3 flex justify-between items-center shrink-0 shadow-sm">
            
            {/* Left: Mobile Menu Trigger & Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white border-2 border-zinc-200 border-b-4 rounded-xl text-zinc-500 active:translate-y-[2px] active:border-b-2 transition-all"
              >
                <Menu size={18} strokeWidth={3} />
              </button>

              <div className="md:hidden w-8 h-8 sm:w-9 sm:h-9 bg-violet-500 rounded-xl flex items-center justify-center text-white border-b-2 border-violet-700 shrink-0">
                <Sparkles size={16} strokeWidth={3} />
              </div>
              <span className="font-black text-zinc-900 text-[18px] tracking-tight hidden md:block">
                Edify<span className="text-violet-600">Student</span>
              </span>
            </div>

            {/* Right: Actions */}
            <div ref={topbarRef} className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              
              {/* 1. STREAK WIDGET */}
              <div className="flex items-center gap-1 px-2 py-1.5 md:px-3 md:py-2 bg-orange-50 border-2 border-orange-200 border-b-4 rounded-xl shadow-sm text-orange-600">
                <Flame size={16} strokeWidth={3} className={stats.streak > 0 ? 'fill-orange-500' : 'text-orange-300'} />
                <span className="text-[13px] md:text-[15px] font-black">{stats.streak}</span>
              </div>

              {/* 2. LANGUAGE SELECTOR (Hidden on Mobile) */}
              <div className="relative hidden md:block">
                <button onClick={() => { setIsLangMenuOpen(!isLangMenuOpen); setIsProfileMenuOpen(false); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all active:translate-y-[2px] ${isLangMenuOpen ? 'bg-zinc-100 border-zinc-300' : 'border-zinc-200 border-b-4 bg-white hover:bg-zinc-50'}`}>
                  <span className="text-[16px] leading-none">{activeLang.flag}</span>
                  <span className="text-[12px] font-black uppercase text-zinc-700">{lang}</span>
                  <ChevronDown size={14} strokeWidth={3} className="text-zinc-400" />
                </button>
                <AnimatePresence>
                  {isLangMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full right-0 mt-2 w-36 bg-white rounded-2xl shadow-lg border-2 border-zinc-200 p-1.5 z-50">
                      {LANGUAGE_OPTIONS.map((l) => (
                        <button key={l.code} onClick={() => { setLang(l.code as LangType); setIsLangMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-black transition-colors ${lang === l.code ? 'bg-violet-100 text-violet-700' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                          <span>{l.flag}</span><span className="flex-1 text-left">{l.label}</span>{lang === l.code && <Check size={16} strokeWidth={3} className="text-violet-600" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. NOTIFICATIONS */}
              <div 
                onClick={() => { setIsLangMenuOpen(false); setIsProfileMenuOpen(false); }} 
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-zinc-500 bg-white border-2 border-zinc-200 border-b-4 active:border-b-2 active:translate-y-[2px] rounded-xl transition-all"
              >
                <NotificationBell />
              </div>

              <div className="w-0.5 h-6 bg-zinc-200 hidden md:block mx-1"></div>

              {/* 4. PROFILE MENU BUTTON */}
              <div className="relative">
                <button 
                  onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsLangMenuOpen(false); }} 
                  className={`flex items-center gap-2 bg-white border-2 transition-all active:translate-y-[2px] p-1 md:pr-3 rounded-[14px] ${isProfileMenuOpen ? 'bg-zinc-100 border-zinc-300 border-b-2 translate-y-[2px]' : 'border-zinc-200 border-b-4 hover:border-zinc-300 hover:bg-zinc-50'}`}
                >
                   <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[10px] bg-violet-500 flex items-center justify-center text-white font-black overflow-hidden shrink-0 border border-violet-600">
                     {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover"/> : user?.displayName?.[0]?.toUpperCase() || 'S'}
                   </div>
                   <span className="hidden md:block text-[13px] font-black text-zinc-700 truncate max-w-[80px]">
                     {user?.displayName?.split(' ')[0] || 'User'}
                   </span>
                   <ChevronDown size={16} strokeWidth={3} className={`hidden md:block text-zinc-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-full right-0 mt-3 w-64 bg-white rounded-[1.5rem] shadow-xl border-2 border-zinc-200 p-2 z-50">
                       <div className="px-4 py-3 bg-zinc-100 rounded-xl mb-2 border border-zinc-200">
                         <p className="text-[14px] font-black text-zinc-900 truncate">{user?.displayName}</p>
                         <p className="text-[11px] font-bold text-zinc-500 truncate">{user?.email}</p>
                       </div>

                       {/* 🟢 Mobile Language Selector inside Profile Menu */}
                       <div className="md:hidden flex items-center justify-between px-4 py-3 rounded-xl hover:bg-zinc-50 transition-colors">
                         <span className="text-[14px] font-black text-zinc-600">{t.topbar.language}</span>
                         <select 
                           value={lang} 
                           onChange={(e) => setLang(e.target.value as LangType)}
                           className="bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-[13px] rounded-lg px-2 py-1 outline-none focus:border-violet-400 transition-colors"
                         >
                           {LANGUAGE_OPTIONS.map(l => (
                             <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                           ))}
                         </select>
                       </div>
                       <div className="md:hidden h-0.5 bg-zinc-100 my-1 mx-2"></div>

                       <Link href="/profile" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black text-zinc-600 hover:text-violet-700 hover:bg-violet-50 transition-colors"><UserIcon size={18} strokeWidth={2.5} /> {t.topbar.profile}</Link>
                       <Link href="/settings" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black text-zinc-600 hover:text-violet-700 hover:bg-violet-50 transition-colors"><Settings size={18} strokeWidth={2.5} /> {t.topbar.settings}</Link>
                       <div className="h-0.5 bg-zinc-100 my-2 mx-2"></div>
                       <button onClick={() => { setIsProfileMenuOpen(false); setShowLogoutModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black text-rose-600 hover:bg-rose-50 transition-colors"><LogOut size={18} strokeWidth={2.5} /> {t.topbar.logout}</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* ========================================================= */}
          {/* INJECTED PAGE CONTENT */}
          {/* ========================================================= */}
          <main className="flex-1 pb-24 md:pb-8 relative">
            {children}
          </main>

        </div>

        {/* ========================================================= */}
        {/* APP-NATIVE BOTTOM NAVIGATION (Mobile Only) */}
        {/* ========================================================= */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-zinc-200 px-4 sm:px-6 py-2 flex justify-between items-center z-40 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          {menuItems.filter(item => !item.hideOnMobile).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center w-14 h-12 group">
                {isActive && (
                  <motion.div layoutId="bottomNavBlob" className="absolute inset-0 bg-violet-100 rounded-2xl border-2 border-violet-200 -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                )}
                <item.icon size={24} strokeWidth={isActive ? 3 : 2.5} className={`${isActive ? 'text-violet-600' : 'text-zinc-400 group-active:scale-90 transition-all'}`} />
              </Link>
            );
          })}
        </nav>

      </div>
    </StudentLanguageContext.Provider>
  );
}