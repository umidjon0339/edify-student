'use client';

import NotificationBell from '@/components/NotificationBell';
import { useEffect, useState, useRef, createContext, useContext } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getUserProfile } from '@/services/userService';
import { 
  LogOut, LayoutDashboard, Users, GraduationCap, Menu, X, 
  FilePlus, FolderOpen, BookOpen, 
  User, ChevronDown, Check, Sparkles, ChevronLeft
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

// --- 1. LANGUAGE CONTEXT SETUP ---
export type LangType = 'uz' | 'en' | 'ru';

interface TeacherLangContextType {
  lang: LangType;
  setLang: (lang: LangType) => void;
}

export const TeacherLanguageContext = createContext<TeacherLangContextType | undefined>(undefined);

export function useTeacherLanguage() {
  const context = useContext(TeacherLanguageContext);
  if (!context) throw new Error("useTeacherLanguage must be used within TeacherLayout");
  return context;
}

// --- 2. TRANSLATION DICTIONARY ---
const SIDEBAR_TRANSLATIONS = {
  uz: {
    brandSubtitle: "O'QITUVCHI PORTALI",
    menu: {
      overview: "Umumiy",
      library: "Kutubxona",
      classes: "Sinflar",
      analytics: "AI Tahlilchi",
      profile: "Profil"
    },
    create: "Yangi Test",
    signOut: "Chiqish",
    settings: "Sozlamalar",
    logoutConfirm: {
      title: "Tizimdan chiqish",
      desc: "Haqiqatan ham hisobingizdan chiqmoqchimisiz?",
      cancel: "Bekor qilish",
      confirm: "Ha, chiqish"
    }
  },
  en: {
    brandSubtitle: "INSTRUCTOR PORTAL",
    menu: {
      overview: "Overview",
      library: "My Library",
      classes: "My Classes",
      analytics: "AI Analytics",
      profile: "Profile"
    },
    create: "New Test",
    signOut: "Sign Out",
    settings: "Settings",
    logoutConfirm: {
      title: "Sign Out",
      desc: "Are you sure you want to sign out of your account?",
      cancel: "Cancel",
      confirm: "Yes, Sign Out"
    }
  },
  ru: {
    brandSubtitle: "ПОРТАЛ УЧИТЕЛЯ",
    menu: {
      overview: "Обзор",
      library: "Библиотека",
      classes: "Классы",
      analytics: "ИИ Аналитика",
      profile: "Профиль"
    },
    create: "Новый Тест",
    signOut: "Выйти",
    settings: "Настройки",
    logoutConfirm: {
      title: "Выход",
      desc: "Вы уверены, что хотите выйти из аккаунта?",
      cancel: "Отмена",
      confirm: "Да, выйти"
    }
  }
};

// --- 3. LANGUAGE SELECTOR COMPONENT ---
const LanguageSelector = ({ lang, setLang, collapsed }: { lang: LangType, setLang: (l: LangType) => void, collapsed?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages: { code: LangType; label: string }[] = [
    { code: 'uz', label: "O'zbek" }, { code: 'en', label: "English" }, { code: 'ru', label: "Русский" },
  ];

  const currentLabel = languages.find(l => l.code === lang)?.label || lang.toUpperCase();

  return (
    <div className={`relative ${collapsed ? 'w-10' : 'w-full'}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center transition-all border text-xs font-bold uppercase tracking-wide
          ${collapsed ? 'w-10 h-10 rounded-xl' : 'w-full px-3 py-2.5 rounded-xl justify-between'}
          ${isOpen ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white border-slate-200/80 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50'}
        `}
      >
        {collapsed ? (
           <span className="text-[10px]">{lang}</span>
        ) : (
          <>
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[9px] border border-slate-200 text-slate-700">
                {lang}
              </span>
              <span className="truncate">{currentLabel}</span>
            </span>
            <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${isOpen ? 'rotate-180 text-slate-800' : ''}`} />
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }} transition={{ duration: 0.15 }}
            className={`absolute mt-2 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden p-1.5 z-50
              ${collapsed ? 'left-full ml-4 top-0 w-36' : 'top-full left-0 right-0'}
            `}
          >
            {languages.map((item) => (
              <button
                key={item.code} onClick={() => { setLang(item.code); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${lang === item.code ? 'bg-indigo-50/80 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <span>{item.label}</span>
                {lang === item.code && <Check size={14} className="text-indigo-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- 4. MAIN LAYOUT ---
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isFullScreenPage = pathname.includes('/teacher/create');
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false); // 🟢 LOGOUT MODAL STATE
  
  const [lang, setLang] = useState<LangType>('uz');
  const t = SIDEBAR_TRANSLATIONS[lang];

  useEffect(() => {
    async function checkRole() {
      if (!loading) {
        if (!user) router.push('/auth/login');
        else {
          const profile = await getUserProfile(user.uid);
          if (profile?.role !== 'teacher') router.push('/dashboard');
          else setIsAuthorized(true);
        }
      }
    }
    checkRole();
  }, [user, loading, router]);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // 🟢 FIXED: Create Test is now standard with AI badge
  const navItems = [
    { name: t.menu.overview, href: '/teacher/dashboard', icon: LayoutDashboard },
    { name: t.create, href: '/teacher/create', icon: FilePlus, isAI: true }, // Added isAI: true
    { name: t.menu.library, href: '/teacher/library', icon: FolderOpen },
    { name: t.menu.classes, href: '/teacher/classes', icon: Users }, 
    { name: t.menu.analytics, href: '/teacher/analytics', icon: Sparkles, isAI: true },
    { name: t.menu.profile, href: '/teacher/profile', icon: User },
  ];

  // --- SIDEBAR CONTENT ---
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const collapsed = mobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full relative transition-all duration-300 bg-white">
        
        {/* HEADER SECTION */}
        <div className={`p-5 flex flex-col gap-5 border-b border-slate-100 shrink-0 ${collapsed ? 'items-center' : ''}`}>
          <div className={`flex items-center w-full ${collapsed ? 'justify-center' : 'justify-between'}`}>
             {mobile && (
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg">
                  <X size={20} />
                </button>
             )}
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
                  <BookOpen size={18} />
                </div>
                {!collapsed && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <h1 className="font-black text-[17px] text-slate-900 leading-none">Edify<span className="text-indigo-600">Teacher</span></h1>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t.brandSubtitle}</p>
                  </div>
                )}
             </div>
          </div>

          {!collapsed && (
             <div className={`flex ${collapsed ? 'flex-col' : 'items-center'} gap-2 w-full`}>
                <LanguageSelector lang={lang} setLang={setLang} collapsed={collapsed} />
                <div className={`flex items-center justify-center rounded-xl bg-white border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer shadow-sm shrink-0 ${collapsed ? 'w-10 h-10' : 'w-[42px] h-[42px]'}`}>
                   <NotificationBell />
                </div>
             </div>
          )}
        </div>

        {/* NAV LINKS */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto custom-scrollbar mt-4 pb-4">
          {!collapsed && <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Menu</p>}
          
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
            
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`
                  group flex items-center px-3 py-2.5 rounded-xl font-bold text-[14px] transition-all relative
                  ${isActive ? 'bg-slate-50 text-indigo-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
                  ${collapsed ? 'justify-center' : 'justify-between'}
                `}
                title={collapsed ? item.name : ''}
              >
                {isActive && !collapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full" />}

                <div className="flex items-center gap-3">
                  <item.icon size={18} className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'}`} /> 
                  {!collapsed && (
                    <span className="whitespace-nowrap flex items-center gap-2">
                      {item.name}
                      {item.isAI && (
                        <span className="bg-indigo-100 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-tighter">AI</span>
                      )}
                    </span>
                  )}
                </div>
                {isActive && collapsed && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-600 ring-2 ring-white" />}
              </Link>
            );
          })}
        </nav>

        {/* 🟢 FIXED: BOTTOM USER FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center flex-col' : 'justify-between'}`}>
            
            <Link href="/teacher/settings" className={`flex items-center gap-3 flex-1 group rounded-xl p-2 transition-colors ${!collapsed && '-ml-2 hover:bg-slate-50'}`}>
              <div className="relative shrink-0">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200 group-hover:border-indigo-300 transition-colors shadow-sm">
                   {user?.photoURL ? (
                     <img src={user.photoURL} alt="Me" className="w-full h-full rounded-full object-cover" />
                   ) : (
                     <GraduationCap size={20} />
                   )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              
              {!collapsed && (
                <div className="overflow-hidden text-left">
                  <p className="text-[14px] font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {user?.displayName || 'Umidjon'}
                  </p>
                  <p className="text-[12px] font-medium text-slate-500 truncate">{t.settings}</p>
                </div>
              )}
            </Link>

            <button 
              onClick={() => setShowLogoutModal(true)}
              className={`text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ${collapsed ? 'p-2 mt-2 bg-slate-50 border border-slate-100' : 'p-2.5'}`}
              title={t.signOut}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <TeacherLanguageContext.Provider value={{ lang, setLang }}>
      {/* 🟢 1. O'ZGARISH: flex md:flex-row olib tashlandi. Bu fixed menyu bilan ziddiyat yarataoytgan edi. */}
      <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900">
        
        {/* 🟢 LOGOUT MODAL (O'zgarishsiz qoladi) */}
        <AnimatePresence>
          {showLogoutModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setShowLogoutModal(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl border border-slate-100 z-10 text-center"
              >
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <LogOut size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{t.logoutConfirm.title}</h3>
                <p className="text-slate-500 text-[15px] mb-8 font-medium">{t.logoutConfirm.desc}</p>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button onClick={() => setShowLogoutModal(false)} className="w-full px-5 py-3 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-colors">
                    {t.logoutConfirm.cancel}
                  </button>
                  <button onClick={() => { signOut(auth); setShowLogoutModal(false); }} className="w-full px-5 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm">
                    {t.logoutConfirm.confirm}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 📱 MOBILE HEADER */}
        <header className="md:hidden bg-white/80 backdrop-blur-md text-slate-900 p-3.5 flex items-center justify-between sticky top-0 z-30 border-b border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 font-black text-[16px]">
              <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center text-white"><BookOpen size={14} /></div>
              <span>Edify<span className="text-indigo-600">Teacher</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <div className="text-slate-500 flex items-center justify-center p-1"><NotificationBell /></div>
          </div>
        </header>

        {/* 📱 MOBILE SIDEBAR OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
            <aside className="relative w-[280px] bg-white h-full shadow-2xl animate-in slide-in-from-left duration-300 border-r border-slate-200">
              <SidebarContent mobile={true} />
            </aside>
          </div>
        )}

        {/* 🖥️ DESKTOP SIDEBAR */}
        <aside 
          className={`
            hidden md:block fixed top-0 left-0 h-full bg-white z-20 border-r border-slate-200 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out
            ${isCollapsed ? 'w-20' : 'w-[280px]'}
          `}
        >
          <SidebarContent />
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="absolute -right-3.5 top-8 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:shadow-md hover:scale-110 rounded-full p-1.5 shadow-sm transition-all z-50 flex items-center justify-center"
          >
            <ChevronLeft size={16} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </aside>

        {/* 🟢 2. O'ZGARISH: Margin-left (ml) o'rniga Padding-left (pl) ishlatildi. */}
        {/* Bu brauzerga sahifaning haqiqiy kengligini aniq hisoblash imkonini beradi. */}
        <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'md:pl-20' : 'md:pl-[280px]'}`}>
          
          {/* MAIN CONTENT AREA */}
          <main className={`min-h-screen w-full ${isFullScreenPage ? 'p-0' : 'p-6 md:p-10'}`}>
            
            {/* 🟢 3. O'ZGARISH: max-w-7xl ni max-w-6xl ga o'zgartirdik, noutbuklarda ham ikki yonda chiroyli bo'sh joy (gap) qolishi uchun. */}
            <div className={isFullScreenPage ? 'w-full h-full' : 'max-w-6xl mx-auto'}>
               {children}
            </div>

          </main>
        </div>

      </div>
    </TeacherLanguageContext.Provider>
  );

}