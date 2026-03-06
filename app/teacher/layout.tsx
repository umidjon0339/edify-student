'use client';

import NotificationBell from '@/components/NotificationBell';
import { useEffect, useState, useRef, createContext, useContext } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getUserProfile } from '@/services/userService';
import { 
  LogOut, LayoutDashboard, Users, GraduationCap, Menu, X, 
  FilePlus, FolderOpen, BarChart3, BookOpen, 
  User, PanelLeftClose, ChevronDown, Check, Sparkles 
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
    create: "Yangi Test Yaratish",
    signOut: "Chiqish",
    settings: "Sozlamalar"
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
    create: "Create New Test",
    signOut: "Sign Out",
    settings: "Settings"
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
    create: "Создать Тест",
    signOut: "Выйти",
    settings: "Настройки"
  }
};

// --- 3. LANGUAGE SELECTOR COMPONENT ---
const LanguageSelector = ({ lang, setLang }: { lang: LangType, setLang: (l: LangType) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages: { code: LangType; label: string }[] = [
    { code: 'uz', label: "O'zbek" },
    { code: 'en', label: "English" },
    { code: 'ru', label: "Русский" },
  ];

  const currentLabel = languages.find(l => l.code === lang)?.label || lang.toUpperCase();

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all border text-xs font-bold uppercase tracking-wide ${
          isOpen 
            ? 'bg-slate-700 border-slate-600 text-white' 
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
        }`}
      >
        <span className="flex items-center gap-2">
           <span className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[9px] border border-slate-600">
             {lang.toUpperCase()}
           </span>
           <span className="truncate">{currentLabel}</span>
        </span>
        <ChevronDown size={14} className={`transition-transform duration-200 text-slate-500 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden p-1 z-50"
          >
            {languages.map((item) => (
              <button
                key={item.code}
                onClick={() => {
                  setLang(item.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  lang === item.code
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {lang === item.code && <Check size={12} />}
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
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // 🟢 Language State
  const [lang, setLang] = useState<LangType>('uz');
  const t = SIDEBAR_TRANSLATIONS[lang];

  // --- PROTECTION LOGIC ---
  useEffect(() => {
    async function checkRole() {
      if (!loading) {
        if (!user) {
          router.push('/auth/login');
        } else {
          const profile = await getUserProfile(user.uid);
          if (profile?.role !== 'teacher') {
            router.push('/dashboard');
          } else {
            setIsAuthorized(true);
          }
        }
      }
    }
    checkRole();
  }, [user, loading, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
          <p className="text-slate-400 text-sm font-bold animate-pulse">Loading EdifyTeacher...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: t.menu.overview, href: '/teacher/dashboard', icon: LayoutDashboard },
    { name: t.menu.library, href: '/teacher/library', icon: FolderOpen },
    { name: t.menu.classes, href: '/teacher/classes', icon: Users }, 
    { name: t.menu.analytics, href: '/teacher/analytics', icon: Sparkles },
    { name: t.menu.profile, href: '/teacher/profile', icon: User },
  ];

  // --- SIDEBAR CONTENT ---
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const collapsed = mobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full relative transition-all duration-300">
        
        {/* HEADER & CONTROLS SECTION */}
        <div className={`p-5 flex flex-col gap-5 border-b border-slate-800 bg-slate-900 shrink-0`}>
          
          {/* 1. LOGO ROW */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
             
             {/* Mobile Close */}
             {mobile && (
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg">
                  <X size={24} />
                </button>
             )}

             {/* Brand */}
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40 text-white shrink-0">
                  <BookOpen size={20} />
                </div>
                {!collapsed && (
                  <div>
                    <h1 className="font-black text-lg tracking-tight text-white leading-none whitespace-nowrap">
                      Edify<span className="text-indigo-400">Teacher</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 whitespace-nowrap">
                      {t.brandSubtitle}
                    </p>
                  </div>
                )}
             </div>

             {/* Collapse Toggle (Desktop Only) */}
             {!mobile && !collapsed && (
                <button onClick={() => setIsCollapsed(true)} className="p-2 text-slate-500 hover:text-white transition-colors">
                   <PanelLeftClose size={20} />
                </button>
             )}
          </div>

          {/* 2. CONTROLS ROW (Lang + Bell) */}
          {!collapsed && (
             <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                   <LanguageSelector lang={lang} setLang={setLang} />
                </div>
                <div className="w-[42px] h-[42px] flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all cursor-pointer shadow-sm shrink-0">
                   <NotificationBell />
                </div>
             </div>
          )}

          {/* Collapsed Mode Button */}
          {collapsed && !mobile && (
             <button onClick={() => setIsCollapsed(false)} className="w-10 h-10 mx-auto bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <Menu size={20} />
             </button>
          )}
        </div>

        {/* CREATE BUTTON */}
        <div className="px-4 mt-6 mb-2">
          <Link 
            href="/teacher/create" 
            className={`
              flex items-center gap-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-500 active:scale-95 group overflow-hidden border border-indigo-500/50
              ${collapsed ? 'justify-center py-3 w-10 mx-auto' : 'justify-center py-3.5 w-full'}
            `}
            title={t.create}
          >
            <FilePlus size={18} className="group-hover:scale-110 transition-transform shrink-0" /> 
            {!collapsed && (
              <span className="whitespace-nowrap animate-in fade-in duration-200">
                {t.create}
              </span>
            )}
          </Link>
        </div>

        {/* NAV LINKS */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!collapsed && (
             <p className="px-3 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 mt-4 animate-in fade-in duration-300">Menu</p>
          )}
          
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
            
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`
                  group flex items-center px-3 py-3 rounded-xl font-bold text-sm transition-all relative
                  ${isActive 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
                  ${collapsed ? 'justify-center' : 'justify-between'}
                `}
                title={collapsed ? item.name : ''}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className={`shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-white'}`} /> 
                  {!collapsed && (
                    <span className="whitespace-nowrap animate-in fade-in duration-200 flex items-center gap-2">
                      {item.name}
                      
                      {/* 🟢 ADD THIS: Small AI Badge for the Analytics item */}
                      {item.href === '/teacher/analytics' && (
                        <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded-md border border-indigo-500/30 uppercase tracking-tighter">
                          AI
                        </span>
                      )}
                    </span>
                  )}
                </div>
            
                {/* 🟢 UPDATE THIS: Show the AI Sparkle dot instead of a plain dot for Analytics */}
                {isActive && !collapsed && (
                  item.href === '/teacher/analytics' ? (
                    <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                  )
                )}
                
                {/* Active Dot for Collapsed Mode */}
                {isActive && collapsed && (
                   <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-slate-900"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* USER FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className={`flex items-center gap-2 ${collapsed ? 'justify-center flex-col' : 'justify-between'}`}>
            
            <Link href="/teacher/settings" className={`flex items-center gap-3 flex-1 group rounded-lg p-2 transition-colors ${!collapsed && '-ml-2 hover:bg-slate-800'}`}>
              <div className="relative">
                <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 shrink-0 border border-slate-600 group-hover:border-indigo-500 transition-colors">
                   {user?.photoURL ? (
                     <img src={user.photoURL} alt="Me" className="w-full h-full rounded-full object-cover" />
                   ) : (
                     <GraduationCap size={18} />
                   )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
              </div>
              
              {!collapsed && (
                <div className="overflow-hidden text-left animate-in fade-in duration-200">
                  <p className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                    {user?.displayName || 'Professor'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{t.settings}</p>
                </div>
              )}
            </Link>

            <button 
              onClick={() => signOut(auth)}
              className={`text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors ${collapsed ? 'p-2 mt-2 bg-slate-800' : 'p-2'}`}
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
    // 🟢 Wrap in Language Provider
    <TeacherLanguageContext.Provider value={{ lang, setLang }}>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        
        {/* 📱 MOBILE HEADER */}
        <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-30 border-b border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 hover:bg-slate-800 rounded-lg transition"
            >
              <Menu size={24} />
            </button>
            
            <div className="flex items-center gap-2 font-black text-lg">
              <BookOpen size={20} className="text-indigo-500"/>
              Edify<span className="text-indigo-400">Teacher</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="w-[70px]">
                <LanguageSelector lang={lang} setLang={setLang} />
             </div>
             <div className="text-slate-300">
                <NotificationBell />
             </div>
          </div>
        </header>

        {/* 📱 MOBILE SIDEBAR OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div 
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setMobileMenuOpen(false)}
            ></div>
            <aside className="relative w-72 bg-slate-900 text-white h-full shadow-2xl animate-in slide-in-from-left duration-300 border-r border-slate-800">
              <SidebarContent mobile={true} />
            </aside>
          </div>
        )}

        {/* 🖥️ DESKTOP SIDEBAR */}
        <aside 
          className={`
            hidden md:block fixed h-full bg-slate-900 text-white z-20 border-r border-slate-800 shadow-2xl transition-all duration-300 ease-in-out
            ${isCollapsed ? 'w-20' : 'w-72'}
          `}
        >
          <SidebarContent />
        </aside>

        {/* MAIN CONTENT AREA */}
        <main 
          className={`
            flex-1 p-4 md:p-8 overflow-y-auto h-screen bg-slate-50 transition-all duration-300 ease-in-out
            ${isCollapsed ? 'md:ml-20' : 'md:ml-72'}
          `}
        >
          <div className="max-w-7xl mx-auto">
             {children}
          </div>
        </main>
      </div>
    </TeacherLanguageContext.Provider>
  );
}