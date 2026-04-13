'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Menu, X, Globe, ChevronDown, Check, Instagram, Send } from 'lucide-react';
import { useState, createContext, useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 1. CONTEXT DEFINITIONS ---
type LangType = 'uz' | 'en' | 'ru';

interface LangContextType {
  lang: LangType;
  setLang: (lang: LangType) => void;
}

export const LanguageContext = createContext<LangContextType | undefined>(undefined);

// Helper Hook
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within Layout");
  return context;
}

// --- 2. TRANSLATIONS ---
const NAV_TRANSLATIONS = {
  uz: { login: "Kirish", start: "Ro'yxatdan o'tish", langName: "O'zbek", followUs: "Bizni kuzatib boring" },
  en: { login: "Log in", start: "Sign Up", langName: "English", followUs: "Follow Us" },
  ru: { login: "Войти", start: "Регистрация", langName: "Русский", followUs: "Следите за нами" }
};

// --- 3. LANGUAGE DROPDOWN COMPONENT (Desktop) ---
const LanguageDropdown = () => {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all border text-[13px] font-bold ${
          isOpen 
            ? 'bg-blue-50 border-blue-200 text-blue-700' 
            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        <Globe size={16} className={isOpen ? "text-blue-600" : "text-slate-400"} />
        <span className="uppercase w-5 text-center">{lang}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden p-1.5 z-50"
          >
            {languages.map((item) => (
              <button
                key={item.code}
                onClick={() => {
                  setLang(item.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-bold transition-colors ${
                  lang === item.code
                    ? 'bg-blue-50/80 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{item.label}</span>
                {lang === item.code && <Check size={14} className="text-blue-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- 4. NAVBAR COMPONENT (Light Theme) ---
const Navbar = () => {
  const pathname = usePathname();
  const isAuthPage = pathname.includes('/auth/');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { lang, setLang } = useLanguage();
  
  const t = NAV_TRANSLATIONS[lang];

  // Your Social Links
  const SOCIAL_LINKS = {
    telegram: "https://t.me/testedify", // Replace with actual link
    instagram: "https://instagram.com/testedify.uz" // Replace with actual link
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 h-[72px] transition-all">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-full flex items-center justify-between">
        
        {/* Logo Area */}
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-blue-600/20 group-hover:-translate-y-0.5 transition-transform duration-300">
            <BookOpen size={20} />
          </div>
          <span className="font-black text-[22px] tracking-tight text-slate-900">
            Edify<span className="text-blue-600">.</span>
          </span>
        </Link>

        {/* Desktop Actions */}
        {!isAuthPage && (
          <div className="hidden md:flex items-center gap-6">
            
            {/* 🟢 NEW: Desktop Social Icons */}
            <div className="flex items-center gap-3">
              <a href={SOCIAL_LINKS.telegram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#229ED9] transition-colors p-1">
                <Send size={18} className="-ml-0.5 mt-0.5" /> 
              </a>
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#E1306C] transition-colors p-1">
                <Instagram size={18} />
              </a>
            </div>

            <div className="h-5 w-px bg-slate-200 mx-1"></div>

            <LanguageDropdown />

            <div className="h-6 w-px bg-slate-200"></div>

            <Link 
              href="/auth/login" 
              className="text-[15px] font-bold text-slate-600 hover:text-blue-600 transition-colors"
            >
              {t.login}
            </Link>
            
            <Link 
              href="/auth/signup" 
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[14px] font-bold shadow-sm hover:shadow-md hover:bg-black hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              {t.start}
            </Link>
          </div>
        )}

        {/* Mobile Menu Toggle */}
        {!isAuthPage && (
          <div className="flex items-center gap-3 md:hidden">
            {/* Mobile Lang Indicator */}
            <div className="text-[11px] font-bold uppercase text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                {lang}
            </div>

            <button 
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && !isAuthPage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[72px] inset-x-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 p-5 flex flex-col gap-4 shadow-2xl md:hidden z-40"
          >
            {/* Language Switcher */}
            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/60 mb-2">
              {(['uz', 'en', 'ru'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`flex-1 py-3 text-[13px] font-bold uppercase rounded-lg transition-all ${
                    lang === l 
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <Link 
              href="/auth/login" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full text-center py-3.5 font-bold text-slate-700 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
            >
              {t.login}
            </Link>
            <Link 
              href="/auth/signup" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full text-center py-3.5 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all"
            >
              {t.start}
            </Link>

            {/* 🟢 NEW: Mobile Social Links */}
            <div className="mt-4 pt-4 border-t border-slate-200/80">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center mb-3">
                {t.followUs}
              </p>
              <div className="flex items-center justify-center gap-3">
                <a 
                  href={SOCIAL_LINKS.telegram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#229ED9]/10 text-[#229ED9] rounded-xl font-bold text-sm hover:bg-[#229ED9]/20 transition-colors"
                >
                  <Send size={16} className="-ml-0.5 mt-0.5" /> Telegram
                </a>
                <a 
                  href={SOCIAL_LINKS.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#E1306C]/10 text-[#E1306C] rounded-xl font-bold text-sm hover:bg-[#E1306C]/20 transition-colors"
                >
                  <Instagram size={16} /> Instagram
                </a>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- 5. MAIN LAYOUT (Light Theme Wrapper) ---
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LangType>('uz');

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </LanguageContext.Provider>
  );
}