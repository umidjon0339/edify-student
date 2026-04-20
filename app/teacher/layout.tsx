'use client';

import { useEffect, useState, useRef, createContext, useContext } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';

import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { getUserProfile } from '@/services/userService';
import { useMonthlyLimit } from '@/hooks/useMonthlyLimit'; 
import NotificationBell from '@/components/NotificationBell';

import { 
  LayoutDashboard, Users, FilePlus, FolderOpen, Library, 
  Sparkles, Settings, LogOut, Menu, X, 
  ChevronLeft, ChevronDown, Check, Zap, BookOpen, UserIcon, CreditCard
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
    menu: { overview: "Boshqaruv", library: "Mening kutubxonam", classes: "Sinflar", onlineLibrary: "Onlayn Kitoblar", analytics: "Tahlillar", subscription: "Obuna", profile: "Profil" },
    create: "Yangi Test", signOut: "Chiqish", settings: "Sozlamalar",
    aiLimit: { title: "Oylik AI Balans", remaining: "savol", upgrade: "Kredit Olish", used: "ishlatildi" },
    logoutConfirm: { title: "Tizimdan chiqish", desc: "Haqiqatan ham hisobingizdan chiqmoqchimisiz?", cancel: "Bekor qilish", confirm: "Chiqish" }
  },
  en: {
    brandSubtitle: "INSTRUCTOR PORTAL",
    menu: { overview: "Dashboard", library: "Library", classes: "Classes", onlineLibrary: "Online Books", analytics: "Analytics", subscription: "Subscription", profile: "Profile" },
    create: "New Test", signOut: "Sign Out", settings: "Settings",
    aiLimit: { title: "Monthly AI Balance", remaining: "questions", upgrade: "Buy Credits", used: "used" },
    logoutConfirm: { title: "Sign Out", desc: "Are you sure you want to sign out of your account?", cancel: "Cancel", confirm: "Sign Out" }
  },
  ru: {
    brandSubtitle: "ПОРТАЛ УЧИТЕЛЯ",
    menu: { overview: "Обзор", library: "Библиотека", classes: "Классы", onlineLibrary: "Онлайн Книги", analytics: "Аналитика", subscription: "Подписка", profile: "Профиль" },
    create: "Новый Тест", signOut: "Выйти", settings: "Настройки",
    aiLimit: { title: "Месячный баланс ИИ", remaining: "вопросов", upgrade: "Купить кредиты", used: "использовано" },
    logoutConfirm: { title: "Выход", desc: "Вы уверены, что хотите выйти из аккаунта?", cancel: "Отмена", confirm: "Выйти" }
  }
};

const LANGUAGE_OPTIONS = [
  { code: 'uz', label: "O'zbek", flag: '🇺🇿' }, 
  { code: 'en', label: "English", flag: '🇬🇧' }, 
  { code: 'ru', label: "Русский", flag: '🇷🇺' }
];

// ============================================================================
// 3. MAIN LAYOUT COMPONENT
// ============================================================================
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth() as any;
  const router = useRouter();
  const pathname = usePathname();
  const aiData = useMonthlyLimit();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  
  const [lang, setLang] = useState<LangType>('uz');
  const t = LAYOUT_TRANSLATIONS[lang as keyof typeof LAYOUT_TRANSLATIONS] || LAYOUT_TRANSLATIONS['uz'];
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

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]">
        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
          <BookOpen size={24} className="text-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  const navItems = [
    { name: t.menu.overview, href: '/teacher/dashboard', icon: LayoutDashboard },
    { name: t.create, href: '/teacher/create', icon: FilePlus, isAI: true },
    { name: t.menu.classes, href: '/teacher/classes', icon: Users }, 
    { name: t.menu.library, href: '/teacher/library', icon: FolderOpen },
    { name: t.menu.onlineLibrary, href: '/teacher/online-books', icon: Library },
    { name: t.menu.analytics, href: '/teacher/analytics', icon: Sparkles, isAI: true },
    { name: t.menu.subscription, href: '/teacher/subscription', icon: CreditCard },
  ];

  // --- 🖥️ DESKTOP SIDEBAR RENDERER ---
  const renderSidebarContent = (collapsed: boolean, isMobile: boolean = false) => (
    <div className="flex flex-col h-full bg-white relative transition-all duration-300 z-10 rounded-[20px]">
      
      {/* Brand Header */}
      <div className={`p-4 flex flex-col gap-5 border-b border-slate-100/60 shrink-0 ${collapsed ? 'items-center' : ''}`}>
        <div className={`flex items-center w-full ${collapsed ? 'justify-center' : 'justify-between'}`}>
           <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => router.push('/teacher/dashboard')}>
              <div className="w-10 h-10 bg-slate-900 rounded-[12px] flex items-center justify-center text-white shrink-0 shadow-sm"><BookOpen size={20} /></div>
              {!collapsed && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <h1 className="font-bold text-[16px] text-slate-900 leading-none tracking-tight">Edify<span className="text-indigo-600">Teacher</span></h1>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest mt-1">{t.brandSubtitle}</p>
                </div>
              )}
           </div>
           {isMobile && <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar mt-4 pb-4">
        {!collapsed && <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Menu</p>}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`group flex items-center px-3 py-2.5 rounded-[12px] text-[14px] font-medium transition-all relative ${isActive ? 'bg-slate-100/80 text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'} ${collapsed ? 'justify-center' : 'justify-between'}`} title={collapsed ? item.name : ''}>
              <div className="flex items-center gap-3">
                <item.icon size={18} className={`shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'}`} strokeWidth={isActive ? 2.5 : 2} /> 
                {!collapsed && (
                  <span className="whitespace-nowrap flex items-center gap-2">
                    {item.name}
                    {item.isAI && <span className="bg-indigo-50 border border-indigo-100/50 text-indigo-600 text-[9px] px-1.5 py-[2px] rounded uppercase font-bold tracking-wider">AI</span>}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 🟢 DESKTOP FOOTER CONTROLS */}
      {!isMobile && (
        <div className={`p-4 border-t border-slate-100/60 flex flex-col shrink-0 bg-white gap-2 relative`}>
          
          {/* AI LIMIT WIDGET */}
          <div className="relative w-full flex justify-center">
            <button 
              onClick={() => { setIsAiMenuOpen(!isAiMenuOpen); setIsProfileMenuOpen(false); setIsLangMenuOpen(false); }} 
              className={`w-full flex items-center justify-center h-11 rounded-[12px] border transition-all active:scale-95 group hover:shadow-sm ${aiData.isDanger ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-200/60 hover:border-slate-300'}`}
              title="AI Balance"
            >
              {collapsed ? (
                <div className={`flex flex-col items-center gap-0.5 ${aiData.isDanger ? 'text-rose-600' : 'text-slate-600 group-hover:text-indigo-600'}`}>
                  <Zap size={16} strokeWidth={2.5} className={aiData.isDanger ? 'fill-rose-500' : ''}/>
                </div>
              ) : (
                 <div className="flex items-center justify-between w-full px-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-md ${aiData.isDanger ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-indigo-500'}`}>
                         <Zap size={14} className={aiData.isDanger ? 'fill-rose-500' : ''} strokeWidth={2.5}/>
                      </div>
                      <div className="flex flex-col items-start leading-none">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t.aiLimit.title}</span>
                        <span className={`text-[12px] font-bold mt-1 ${aiData.isDanger ? 'text-rose-600' : 'text-slate-800'}`}>
                          {aiData.isUnlimited ? 'Cheksiz' : `${aiData.remaining} ta qoldi`}
                        </span>
                      </div>
                    </div>
                 </div>
              )}
            </button>

            {/* AI DROPDOWN */}
            <AnimatePresence>
              {isAiMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: collapsed ? 10 : 0, y: collapsed ? 0 : 10, scale: 0.95 }} 
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, x: collapsed ? 10 : 0, y: collapsed ? 0 : 10, scale: 0.95 }} 
                  className={`absolute w-64 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-4 z-[60] ${collapsed ? 'left-full ml-3 bottom-0' : 'bottom-full mb-2 left-0 origin-bottom-left'}`}
                >
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-[14px] flex items-center gap-1.5"><Zap size={14} className="text-amber-500 fill-amber-500"/> {t.aiLimit.title}</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Yangilanadi: {aiData.resetDate}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={`text-xl font-bold leading-none tracking-tight ${aiData.isDanger ? 'text-rose-600' : 'text-slate-800'}`}>
                          {aiData.isUnlimited ? '∞' : aiData.remaining}
                        </span>
                      </div>
                   </div>
                   
                   {!aiData.isUnlimited && (
                     <div className="space-y-1.5 mb-4">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-500"><span>{t.aiLimit.used}</span> <span className="text-slate-700">{aiData.used} / {aiData.limit}</span></div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${aiData.isDanger ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${aiData.usagePercentage}%` }}></div>
                        </div>
                     </div>
                   )}
                   
                   <button onClick={() => { setIsAiMenuOpen(false); router.push('/teacher/subscription'); }} className="w-full py-2.5 bg-slate-900 text-white text-[12px] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                     <CreditCard size={14} /> {t.aiLimit.upgrade}
                   </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DESKTOP LANG & NOTIFICATIONS */}
          <div className={`flex items-center gap-2 w-full justify-center ${collapsed ? 'flex-col' : ''}`}>
             <div className="relative flex-1 w-full flex justify-center">
                <button 
                  onClick={() => { setIsLangMenuOpen(!isLangMenuOpen); setIsAiMenuOpen(false); setIsProfileMenuOpen(false); }} 
                  className={`flex items-center justify-center h-11 rounded-[12px] border transition-all active:scale-95 bg-white hover:border-slate-300/80 w-full ${isLangMenuOpen ? 'border-slate-300 shadow-sm' : 'border-slate-200/60'}`}
                  title="Language"
                >
                  <span className="text-[18px] leading-none">{activeLanguage.flag}</span>
                  {!collapsed && (
                     <>
                      <span className="text-[12px] font-semibold text-slate-600 ml-2">{lang.toUpperCase()}</span>
                      <ChevronDown size={14} className={`text-slate-400 ml-auto mr-2 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                     </>
                  )}
                </button>
                <AnimatePresence>
                  {isLangMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, x: collapsed ? 10 : 0, y: collapsed ? 0 : 10, scale: 0.95 }} 
                      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, x: collapsed ? 10 : 0, y: collapsed ? 0 : 10, scale: 0.95 }} 
                      className={`absolute w-40 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-1.5 z-[60] ${collapsed ? 'left-full ml-3 bottom-0' : 'bottom-full mb-2 left-0 origin-bottom-left'}`}
                    >
                      {LANGUAGE_OPTIONS.map((l) => (
                        <button key={l.code} onClick={() => { setLang(l.code as LangType); setIsLangMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${lang === l.code ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>
                          <span className="text-lg">{l.flag}</span><span className="flex-1 text-left">{l.label}</span>
                          {lang === l.code && <Check size={14} className="text-slate-900" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
             <div className={`flex items-center justify-center h-11 w-11 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/60 hover:border-slate-300/80 rounded-[12px] cursor-pointer transition-all active:scale-95 shrink-0 ${collapsed ? 'w-full' : ''}`}>
               <NotificationBell />
             </div>
          </div>

          {/* DESKTOP PROFILE DROPDOWN */}
          <div className="relative w-full flex justify-center mt-0.5">
            <button 
              onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsAiMenuOpen(false); setIsLangMenuOpen(false); }} 
              className={`flex items-center justify-center h-12 w-full rounded-[14px] bg-white border border-slate-200/60 hover:border-slate-300/80 transition-all active:scale-95 group ${collapsed ? 'p-1' : 'p-1.5 gap-3'}`}
              title="Profile"
            >
               <div className="w-9 h-9 rounded-[10px] bg-slate-900 text-white flex items-center justify-center font-bold overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                 {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover"/> : user?.displayName?.[0]}
               </div>
               {!collapsed && (
                 <>
                   <div className="flex flex-col items-start flex-1 min-w-0 pr-1">
                     <span className="text-[13px] font-semibold text-slate-800 truncate w-full text-left">{user?.displayName?.split(' ')[0]}</span>
                     <span className="text-[10px] text-slate-500 truncate w-full text-left font-medium">{user?.email}</span>
                   </div>
                 </>
               )}
            </button>
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: collapsed ? 10 : 0, y: collapsed ? 0 : 10, scale: 0.95 }} 
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, x: collapsed ? 10 : 0, y: collapsed ? 0 : 10, scale: 0.95 }} 
                  className={`absolute w-56 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-1.5 z-[60] ${collapsed ? 'left-full ml-3 bottom-0' : 'bottom-full mb-2 left-0 origin-bottom-left'}`}
                >
                   <div className="px-3 py-3 bg-slate-50/50 rounded-xl mb-1.5 border border-slate-100/50">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{user?.displayName}</p>
                      <p className="text-[10px] font-medium text-slate-500 truncate">{user?.email}</p>
                   </div>
                   <Link href="/teacher/profile" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"><UserIcon size={16} /> {t.menu.profile}</Link>
                   <Link href="/teacher/settings" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"><Settings size={16} /> {t.settings}</Link>
                   <div className="h-px bg-slate-100 my-1.5 mx-2"></div>
                   <button onClick={() => { setIsProfileMenuOpen(false); setShowLogoutModal(true); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors"><LogOut size={16} /> {t.logoutConfirm.title}</button>
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
      <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 flex overflow-hidden relative">
        
        {/* --- LOGOUT MODAL --- */}
        <AnimatePresence>
          {showLogoutModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 z-10 text-center">
                <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><LogOut size={24} strokeWidth={2.5}/></div>
                <h3 className="text-lg font-bold text-slate-900 mb-1.5">{t.logoutConfirm.title}</h3>
                <p className="text-slate-500 text-[13px] mb-6 font-medium">{t.logoutConfirm.desc}</p>
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button onClick={() => setShowLogoutModal(false)} className="w-full px-5 py-3 rounded-xl text-slate-600 font-semibold bg-slate-50 border border-slate-200/60 hover:bg-slate-100 transition-colors">{t.logoutConfirm.cancel}</button>
                  <button onClick={() => { signOut(auth); setShowLogoutModal(false); }} className="w-full px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors">{t.logoutConfirm.confirm}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- MOBILE SLIDE-OUT MENU --- */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
              <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="relative w-[280px] bg-white h-full shadow-2xl border-r border-slate-200">
                {renderSidebarContent(false, true)}
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* --- DESKTOP FLOATING SIDEBAR --- */}
        <div className="hidden md:flex py-4 pl-4 h-[100dvh]">
          <aside ref={sidebarRef} className={`transition-all duration-300 ease-in-out shrink-0 relative z-[50] h-full ${isCollapsed ? 'w-[84px]' : 'w-[260px]'}`}>
            <div className="w-full h-full rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-200/60 bg-white relative overflow-visible">
              {renderSidebarContent(isCollapsed, false)}
            </div>
            
            {/* Collapse Toggle Button */}
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-10 bg-white border border-slate-200 text-slate-400 hover:text-slate-800 hover:shadow-md rounded-full p-1.5 shadow-sm transition-all z-[60] flex items-center justify-center">
              <ChevronLeft size={14} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </aside>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] relative z-10">
          
          {/* 🟢 MOBILE TOP BAR (With Visible Notification and Hidden Language) */}
          <header ref={headerRef} className="md:hidden bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 px-3 py-2.5 flex justify-between items-center shrink-0">
            
            <div className="flex items-center gap-2">
              <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><Menu size={20} /></button>
            </div>

            <div className="flex items-center gap-2">
              
              {/* MOBILE AI LIMIT */}
              <div className="relative">
                <button onClick={() => { setIsAiMenuOpen(!isAiMenuOpen); setIsProfileMenuOpen(false); }} className={`flex items-center gap-1.5 px-2.5 h-9 rounded-[10px] border transition-all active:scale-95 ${aiData.isDanger ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200/60 text-slate-700 shadow-sm'}`}>
                  <Zap size={14} className={aiData.isDanger ? 'fill-rose-500' : 'text-amber-500'} />
                  <span className="text-[12px] font-bold">{aiData.isUnlimited ? '∞' : aiData.remaining}</span>
                </button>
                <AnimatePresence>
                  {isAiMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-full right-0 mt-2 w-[260px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 p-4 z-[60] origin-top-right">
                       <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-slate-900 text-[13px] flex items-center gap-1.5"><Zap size={14} className="text-amber-500 fill-amber-500"/> Oylik Balans</h4>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Yangilanish: {aiData.resetDate}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xl font-bold ${aiData.isDanger ? 'text-rose-600' : 'text-slate-800'}`}>{aiData.isUnlimited ? '∞' : aiData.remaining}</span>
                          </div>
                       </div>
                       
                       {!aiData.isUnlimited && (
                         <div className="space-y-1.5 mb-4">
                            <div className="flex justify-between text-[10px] font-semibold text-slate-500"><span>{t.aiLimit.used}</span> <span className="text-slate-700">{aiData.used} / {aiData.limit}</span></div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-1000 ${aiData.isDanger ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${aiData.usagePercentage}%` }}></div>
                            </div>
                         </div>
                       )}

                       <button onClick={() => { setIsAiMenuOpen(false); router.push('/teacher/subscription'); }} className="w-full py-2.5 bg-slate-900 text-white text-[12px] font-semibold rounded-lg flex items-center justify-center gap-2">
                         <CreditCard size={14} /> {t.aiLimit.upgrade}
                       </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 🟢 MOBILE VISIBLE NOTIFICATION BELL */}
              <div className="flex items-center justify-center h-9 w-9 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/60 rounded-[10px] cursor-pointer transition-all active:scale-95 shrink-0 shadow-sm">
                <NotificationBell />
              </div>
              
              {/* 🟢 MOBILE PROFILE DROPDOWN (WITH LANGUAGE SWITCHER INSIDE) */}
              <div className="relative">
                <button onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsAiMenuOpen(false); }} className="w-9 h-9 rounded-[10px] bg-slate-900 flex items-center justify-center text-white font-bold border border-slate-200 transition-all active:scale-95 overflow-hidden text-[12px] shadow-sm">
                   {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover"/> : user?.displayName?.[0]}
                </button>
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 p-1.5 z-[60] origin-top-right">
                       
                       {/* User Info Block */}
                       <div className="px-3 py-3 bg-slate-50/50 rounded-xl mb-2 border border-slate-100/50">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">{user?.displayName}</p>
                          <p className="text-[10px] font-medium text-slate-500 truncate">{user?.email}</p>
                       </div>

                       {/* 🟢 SEGMENTED LANGUAGE SWITCHER (INSIDE PROFILE FOR MOBILE) */}
                       <div className="px-1 mb-2">
                         <div className="flex items-center justify-between bg-slate-50/50 p-1 rounded-lg border border-slate-100/50">
                           {LANGUAGE_OPTIONS.map((l) => (
                             <button
                               key={l.code}
                               onClick={() => { setLang(l.code as LangType); setIsProfileMenuOpen(false); }}
                               className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${lang === l.code ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                             >
                               <span>{l.flag}</span>
                               <span className="uppercase">{l.code}</span>
                             </button>
                           ))}
                         </div>
                       </div>

                       <Link href="/teacher/profile" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"><UserIcon size={16} /> {t.menu.profile}</Link>
                       <Link href="/teacher/settings" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"><Settings size={16} /> {t.settings}</Link>
                       <div className="h-px bg-slate-100 my-1.5 mx-2"></div>
                       <button onClick={() => { setIsProfileMenuOpen(false); setShowLogoutModal(true); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors"><LogOut size={16} /> {t.logoutConfirm.title}</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </header>

          {/* 📜 MAIN SCROLLABLE CONTENT */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
            <div className="w-full h-full relative z-10">{children}</div>
          </main>

        </div>
      </div>
    </TeacherLanguageContext.Provider>
  );
}