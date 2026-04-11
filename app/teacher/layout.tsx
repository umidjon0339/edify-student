'use client';

import { useEffect, useState, useRef, createContext, useContext } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { getUserProfile } from '@/services/userService';
import { useAiLimits } from '@/hooks/useAiLimits';
import NotificationBell from '@/components/NotificationBell';

import { 
  LayoutDashboard, Users, FilePlus, FolderOpen, Library, 
  Sparkles, User, Settings, LogOut, Menu, X, Plus, 
  ChevronLeft, ChevronDown, Check, Zap, BookOpen, Star,UserIcon
} from 'lucide-react';

// ============================================================================
// 1. CONTEXT & TYPES
// ============================================================================
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

// ============================================================================
// 2. TRANSLATION DICTIONARY
// ============================================================================
const LAYOUT_TRANSLATIONS = {
  uz: {
    brandSubtitle: "O'QITUVCHI PORTALI",
    menu: { overview: "Boshqaruv", library: "Kutubxona", classes: "Sinflar", onlineLibrary: "Onlayn Kitoblar", analytics: "Tahlillar", profile: "Profil" },
    create: "Yangi Test", signOut: "Chiqish", settings: "Sozlamalar", new: "YANGI",
    aiLimit: { title: "AI Assistent", remaining: "savol qoldi", reset: "00:00 da yangilanadi", upgrade: "Cheksiz qilish", used: "ishlatildi" },
    logoutConfirm: { title: "Tizimdan chiqish", desc: "Haqiqatan ham hisobingizdan chiqmoqchimisiz?", cancel: "Bekor qilish", confirm: "Ha, chiqish" }
  },
  en: {
    brandSubtitle: "INSTRUCTOR PORTAL",
    menu: { overview: "Dashboard", library: "Library", classes: "Classes", onlineLibrary: "Online Books", analytics: "Analytics", profile: "Profile" },
    create: "New Test", signOut: "Sign Out", settings: "Settings", new: "NEW",
    aiLimit: { title: "AI Assistant", remaining: "questions left", reset: "Resets at midnight", upgrade: "Go Unlimited", used: "used" },
    logoutConfirm: { title: "Sign Out", desc: "Are you sure you want to sign out of your account?", cancel: "Cancel", confirm: "Yes, Sign Out" }
  },
  ru: {
    brandSubtitle: "ПОРТАЛ УЧИТЕЛЯ",
    menu: { overview: "Обзор", library: "Библиотека", classes: "Классы", onlineLibrary: "Онлайн Книги", analytics: "Аналитика", profile: "Профиль" },
    create: "Новый Тест", signOut: "Выйти", settings: "Настройки", new: "НОВЫЙ",
    aiLimit: { title: "ИИ Ассистент", remaining: "вопросов", reset: "Сброс в 00:00", upgrade: "Безлимит", used: "использовано" },
    logoutConfirm: { title: "Выход", desc: "Вы уверены, что хотите выйти из аккаунта?", cancel: "Отмена", confirm: "Да, выйти" }
  }
};

const LANGUAGE_OPTIONS = [{ code: 'uz', label: "O'zbek", flag: '🇺🇿' }, { code: 'en', label: "English", flag: '🇬🇧' }, { code: 'ru', label: "Русский", flag: '🇷🇺' }];

// ============================================================================
// 3. MAIN LAYOUT COMPONENT
// ============================================================================
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth() as any;
  const router = useRouter();
  const pathname = usePathname();
  const aiData = useAiLimits();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Dropdown States
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  
  const [lang, setLang] = useState<LangType>('uz');
  const t = LAYOUT_TRANSLATIONS[lang as keyof typeof LAYOUT_TRANSLATIONS];
  const activeLanguage = LANGUAGE_OPTIONS.find(l => l.code === lang) || LANGUAGE_OPTIONS[0];

  const headerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideHeader = headerRef.current && !headerRef.current.contains(event.target as Node);
      const isOutsideSidebar = sidebarRef.current && !sidebarRef.current.contains(event.target as Node);

      if (isOutsideHeader && isOutsideSidebar) {
        setIsProfileMenuOpen(false);
        setIsAiMenuOpen(false);
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth & Role Check
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

  // Close mobile sidebar on route change
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center"><BookOpen size={24} className="text-indigo-600 animate-pulse" /></div>
        <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "0ms" }} /><div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} /><div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} /></div>
      </div>
    );
  }

  const navItems = [
    { name: t.menu.overview, href: '/teacher/dashboard', icon: LayoutDashboard },
    { name: t.create, href: '/teacher/create', icon: FilePlus, isAI: true },
    { name: t.menu.classes, href: '/teacher/classes', icon: Users }, 
    { name: t.menu.library, href: '/teacher/library', icon: FolderOpen },
    { name: t.menu.onlineLibrary, href: '/teacher/online-books', icon: Library, isNew: true },
    { name: t.menu.analytics, href: '/teacher/analytics', icon: Sparkles, isAI: true },
  ];

  const bottomNavItems = [
    { name: t.menu.overview, href: '/teacher/dashboard', icon: LayoutDashboard },
    { name: t.menu.classes, href: '/teacher/classes', icon: Users },
    { name: t.create, href: '/teacher/create', icon: Plus, isCenter: true }, // CENTER FAB
    { name: t.menu.library, href: '/teacher/library', icon: FolderOpen },
    { name: t.menu.profile, href: '/teacher/profile', icon: User },
  ];

  // --- 🖥️ SIDEBAR RENDERER (Desktop & Mobile Slide-out) ---
  const renderSidebarContent = (collapsed: boolean, isMobile: boolean = false) => (
    <div className="flex flex-col h-full bg-white relative transition-all duration-300">
      <div className={`p-5 flex flex-col gap-5 border-b border-slate-100 shrink-0 ${collapsed ? 'items-center' : ''}`}>
        <div className={`flex items-center w-full ${collapsed ? 'justify-center' : 'justify-between'}`}>
           <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0"><BookOpen size={18} /></div>
              {!collapsed && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <h1 className="font-black text-[17px] text-slate-900 leading-none">Edify<span className="text-indigo-600">Teacher</span></h1>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t.brandSubtitle}</p>
                </div>
              )}
           </div>
           {isMobile && <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 bg-slate-50 rounded-lg"><X size={20} /></button>}
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto custom-scrollbar mt-4 pb-4">
        {!collapsed && <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Menu</p>}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`group flex items-center px-3 py-2.5 rounded-xl font-bold text-[14px] transition-all relative ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'} ${collapsed ? 'justify-center' : 'justify-between'}`} title={collapsed ? item.name : ''}>
              {isActive && !collapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full" />}
              <div className="flex items-center gap-3">
                <item.icon size={18} className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'}`} /> 
                {!collapsed && (
                  <span className="whitespace-nowrap flex items-center gap-2">
                    {item.name}
                    {item.isAI && <span className="bg-indigo-100 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-tighter">AI</span>}
                    {item.isNew && <span className="bg-emerald-100 text-emerald-600 text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-tighter font-black shadow-sm border border-emerald-200 animate-pulse">{t.new}</span>}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 🟢 NEW: DESKTOP SIDEBAR FOOTER (Settings, AI, Profile) */}
      {!isMobile && (
        <div className="p-3 border-t border-slate-100 flex flex-col gap-2 shrink-0 bg-slate-50/30">
          
          {/* AI LIMIT WIDGET */}
          <div className="relative">
            <button onClick={() => { setIsAiMenuOpen(!isAiMenuOpen); setIsProfileMenuOpen(false); setIsLangMenuOpen(false); }} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'} py-2 rounded-xl border transition-all active:scale-95 shadow-sm ${aiData?.isLimitReached ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 text-indigo-700'}`}>
              <div className="flex items-center gap-2">
                <Zap size={18} className={aiData?.isLimitReached ? '' : 'fill-indigo-500 text-indigo-500'} />
                {!collapsed && (
                  <div className="flex flex-col items-start text-left leading-none">
                    <span className="text-[13px] font-black">{aiData?.remaining} <span className="text-[11px] opacity-70 ml-0.5">{t.aiLimit.remaining.split(' ')[0]}</span></span>
                  </div>
                )}
              </div>
            </button>
            <AnimatePresence>
              {isAiMenuOpen && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-full left-0 mb-3 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 z-50 origin-bottom-left">
                   <div className="flex justify-between items-end mb-5">
                      <div><h4 className="font-black text-slate-900 text-[16px] flex items-center gap-2"><Sparkles size={16} className="text-indigo-500"/> {t.aiLimit.title}</h4><p className="text-[11px] text-slate-400 font-bold mt-1">{t.aiLimit.reset}</p></div>
                      <div className="text-right"><span className={`text-2xl font-black ${aiData?.isLimitReached ? 'text-red-500' : 'text-indigo-600'}`}>{aiData?.remaining}</span><span className="text-[12px] font-bold text-slate-300"> / {aiData?.limit}</span></div>
                   </div>
                   <div className="space-y-1.5 mb-5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>{t.aiLimit.used}: <span className="text-slate-700">{aiData?.used}</span></span></div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-1000 ${aiData?.isLimitReached ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} style={{ width: `${aiData?.usagePercentage || 0}%` }}></div>
                      </div>
                   </div>
                   <a href="https://t.me/Umidjon0339" target="_blank" className="w-full py-2.5 bg-slate-900 text-white text-[13px] font-black rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-slate-800 transition-colors"><Star size={14} className="text-amber-400 fill-amber-400"/> {t.aiLimit.upgrade}</a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* LANG & NOTIFICATIONS ROW */}
          <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : ''}`}>
            <div className="relative flex-1">
              <button 
                onClick={() => { setIsLangMenuOpen(!isLangMenuOpen); setIsAiMenuOpen(false); setIsProfileMenuOpen(false); }} 
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'} rounded-xl border transition-all duration-200 active:scale-95 ${isLangMenuOpen ? 'bg-slate-100 border-slate-300 shadow-inner' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[16px] leading-none">{activeLanguage.flag}</span>
                  {!collapsed && <span className="text-[12px] font-bold uppercase text-slate-700">{lang}</span>}
                </div>
                {!collapsed && <ChevronDown size={14} className={`text-slate-400 transition-transform ${isLangMenuOpen ? 'rotate-180 text-slate-600' : ''}`} />}
              </button>
              <AnimatePresence>
                {isLangMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 p-1.5 z-50 origin-bottom-left">
                    {LANGUAGE_OPTIONS.map((l) => (
                      <button key={l.code} onClick={() => { setLang(l.code as LangType); setIsLangMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${lang === l.code ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <span className="text-sm">{l.flag}</span>
                        <span className="flex-1 text-left">{l.label}</span>
                        {lang === l.code && <Check size={14} className="text-indigo-600" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className={`flex items-center justify-center p-2 bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl cursor-pointer transition-colors active:scale-95 ${collapsed ? 'w-full' : ''}`}>
              <NotificationBell />
            </div>
          </div>

          {/* PROFILE DROPDOWN */}
          <div className="relative mt-1">
            <button onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsAiMenuOpen(false); setIsLangMenuOpen(false); }} className={`w-full flex items-center gap-3 p-1.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95 ${collapsed ? 'justify-center' : ''}`}>
               <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black shadow-md border border-white overflow-hidden shrink-0 text-[15px]">
                 {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover"/> : user?.displayName?.[0]}
               </div>
               {!collapsed && (
                 <>
                   <div className="flex flex-col items-start flex-1 min-w-0 pr-2">
                     <span className="text-[13px] font-bold text-slate-900 truncate w-full text-left">{user?.displayName?.split(' ')[0]}</span>
                     <span className="text-[10px] font-medium text-slate-500 truncate w-full text-left">{user?.email}</span>
                   </div>
                   <ChevronDown size={14} className={`text-slate-400 mr-2 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                 </>
               )}
            </button>
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-50 origin-bottom-left">
                   <div className="px-4 py-4 bg-slate-50 rounded-2xl mb-2 border border-slate-100">
                      <p className="text-[14px] font-black text-slate-900 truncate">{user?.displayName}</p>
                      <p className="text-[12px] font-medium text-slate-500 truncate">{user?.email}</p>
                   </div>
                   <Link href="/teacher/profile" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"><UserIcon size={18} /> Profil</Link>
                   <Link href="/teacher/settings" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"><Settings size={18} /> {t.settings}</Link>
                   
                   <div className="h-px bg-slate-100 my-2 mx-2"></div>
                   <button onClick={() => { setIsProfileMenuOpen(false); setShowLogoutModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-red-600 hover:bg-red-50 transition-colors"><LogOut size={18} /> {t.logoutConfirm.title}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}
    </div>
  );

  return (
    <TeacherLanguageContext.Provider value={{ lang, setLang }}>
      <div className="min-h-[100dvh] bg-[#F8FAFC] font-sans selection:bg-indigo-100 selection:text-indigo-900 flex overflow-hidden">
        
        {/* --- LOGOUT MODAL --- */}
        <AnimatePresence>
          {showLogoutModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl border border-slate-100 z-10 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5"><LogOut size={28} /></div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{t.logoutConfirm.title}</h3>
                <p className="text-slate-500 text-[15px] mb-8 font-medium">{t.logoutConfirm.desc}</p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button onClick={() => setShowLogoutModal(false)} className="w-full px-5 py-3 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-colors">{t.logoutConfirm.cancel}</button>
                  <button onClick={() => { signOut(auth); setShowLogoutModal(false); }} className="w-full px-5 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm">{t.logoutConfirm.confirm}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- MOBILE SLIDE-OUT MENU (For extra links) --- */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
              <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="relative w-[280px] bg-white h-full shadow-2xl border-r border-slate-200">
                {renderSidebarContent(false, true)}
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* --- DESKTOP SIDEBAR --- */}
        <aside ref={sidebarRef} className={`hidden md:block bg-white border-r border-slate-200 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out shrink-0 relative z-20 ${isCollapsed ? 'w-20' : 'w-[260px]'}`}>
          {renderSidebarContent(isCollapsed, false)}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3.5 top-8 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:shadow-md hover:scale-110 rounded-full p-1.5 shadow-sm transition-all z-50 flex items-center justify-center">
            <ChevronLeft size={16} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </aside>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] relative">
          
          {/* 🟢 MINIMAL TOP BAR (ONLY VISIBLE ON MOBILE) */}
          <header ref={headerRef} className="md:hidden bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-30 px-3 py-2 flex justify-between items-center shadow-sm shrink-0">
            
            {/* Left: Mobile Menu & Logo */}
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-lg"><Menu size={22} /></button>
              <div className="flex items-center gap-2 font-black text-[16px]">
                <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center text-white"><BookOpen size={14} /></div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              
              {/* LANGUAGE SELECTOR */}
              <div className="relative">
                <button 
                  onClick={() => { setIsLangMenuOpen(!isLangMenuOpen); setIsAiMenuOpen(false); setIsProfileMenuOpen(false); }} 
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition-all duration-200 active:scale-95 ${isLangMenuOpen ? 'bg-slate-50 border-slate-300 shadow-inner' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                >
                  <span className="text-[15px] leading-none">{activeLanguage.flag}</span>
                </button>
                <AnimatePresence>
                  {isLangMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                      className="absolute top-full -right-12 mt-2 w-36 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 p-1.5 z-50"
                    >
                      {LANGUAGE_OPTIONS.map((l) => (
                        <button 
                          key={l.code} 
                          onClick={() => { setLang(l.code as LangType); setIsLangMenuOpen(false); }} 
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${lang === l.code ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                          <span className="text-sm">{l.flag}</span>
                          <span className="flex-1 text-left">{l.label}</span>
                          {lang === l.code && <Check size={14} className="text-indigo-600" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* AI LIMIT WIDGET */}
              <div className="relative">
                <button onClick={() => { setIsAiMenuOpen(!isAiMenuOpen); setIsProfileMenuOpen(false); setIsLangMenuOpen(false); }} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border-2 transition-all shadow-sm active:scale-95 ${aiData?.isLimitReached ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 text-indigo-700'}`}>
                  <Zap size={16} className={aiData?.isLimitReached ? '' : 'fill-indigo-500 text-indigo-500'} />
                  <div className="flex flex-col items-start text-left leading-none">
                    <span className="text-[13px] font-black">{aiData?.remaining}</span>
                  </div>
                </button>
                <AnimatePresence>
                  {isAiMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-full right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 z-50">
                       <div className="flex justify-between items-end mb-5">
                          <div><h4 className="font-black text-slate-900 text-[16px] flex items-center gap-2"><Sparkles size={16} className="text-indigo-500"/> {t.aiLimit.title}</h4><p className="text-[11px] text-slate-400 font-bold mt-1">{t.aiLimit.reset}</p></div>
                          <div className="text-right"><span className={`text-2xl font-black ${aiData?.isLimitReached ? 'text-red-500' : 'text-indigo-600'}`}>{aiData?.remaining}</span><span className="text-[12px] font-bold text-slate-300"> / {aiData?.limit}</span></div>
                       </div>
                       <div className="space-y-1.5 mb-5">
                          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>{t.aiLimit.used}: <span className="text-slate-700">{aiData?.used}</span></span></div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-1000 ${aiData?.isLimitReached ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} style={{ width: `${aiData?.usagePercentage || 0}%` }}></div>
                          </div>
                       </div>
                       <a href="https://t.me/Umidjon0339" target="_blank" className="w-full py-2.5 bg-slate-900 text-white text-[13px] font-black rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-slate-800 transition-colors"><Star size={14} className="text-amber-400 fill-amber-400"/> {t.aiLimit.upgrade}</a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* NOTIFICATIONS */}
              <div className="flex items-center justify-center p-1.5 text-slate-500 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors active:scale-95">
                <NotificationBell />
              </div>
              
              {/* PROFILE DROPDOWN */}
              <div className="relative">
                <button onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsAiMenuOpen(false); setIsLangMenuOpen(false); }} className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded-2xl border border-transparent hover:border-slate-200 transition-all active:scale-95">
                   <div className="w-8 h-8 rounded-[10px] bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black shadow-md border border-white overflow-hidden shrink-0 text-[14px]">
                     {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover"/> : user?.displayName?.[0]}
                   </div>
                </button>
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-full right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-50">
                       <div className="px-4 py-4 bg-slate-50 rounded-2xl mb-2 border border-slate-100">
                          <p className="text-[14px] font-black text-slate-900 truncate">{user?.displayName}</p>
                          <p className="text-[12px] font-medium text-slate-500 truncate">{user?.email}</p>
                       </div>
                       <Link href="/teacher/profile" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"><UserIcon size={18} /> Profil</Link>
                       <Link href="/teacher/settings" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"><Settings size={18} /> {t.settings}</Link>
                       
                       <div className="h-px bg-slate-100 my-2 mx-2"></div>
                       <button onClick={() => { setIsProfileMenuOpen(false); setShowLogoutModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-red-600 hover:bg-red-50 transition-colors"><LogOut size={18} /> {t.logoutConfirm.title}</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* 📜 MAIN SCROLLABLE CONTENT */}
          <main className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="w-full h-full relative z-10">{children}</div>
          </main>

        </div>

        

      </div>
    </TeacherLanguageContext.Provider>
  );
}