'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, Check, Instagram, Send, ArrowUpRight } from 'lucide-react';
import { useState, createContext, useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './landing.css';

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
  uz: { login: "Kirish", start: "Ro'yxatdan o'tish", followUs: "Bizni kuzatib boring" },
  en: { login: "Log in", start: "Sign up", followUs: "Follow us" },
  ru: { login: "Войти", start: "Регистрация", followUs: "Следите за нами" },
};

const LANGUAGES: { code: LangType; label: string }[] = [
  { code: 'uz', label: "O'zbek" },
  { code: 'en', label: "English" },
  { code: 'ru', label: "Русский" },
];

const SOCIAL_LINKS = {
  telegram: "https://t.me/testedify",
  instagram: "https://instagram.com/testedify.uz",
};

// --- 3. LANGUAGE PILL (Desktop) ---
const LanguagePill = () => {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="relative" ref={ref} onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="ed-glass flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold uppercase ed-ink"
      >
        {lang}
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className="absolute right-0 top-full z-50 pt-2">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              className="ed-panel w-44 origin-top-right rounded-3xl p-1.5"
            >
              {LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => { setLang(item.code); setIsOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-[13px] font-bold transition-colors ${lang === item.code ? 'ed-soft' : 'ed-ink-2 hover:bg-black/5'}`}
                >
                  {item.label}
                  {lang === item.code && <Check size={14} />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- 4. NAVBAR — Edify system: floating glass pills (teacher top-bar look) ---
const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { lang, setLang } = useLanguage();
  const t = NAV_TRANSLATIONS[lang];

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6">
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between gap-3">
        {/* Logo pill */}
        <Link href="/" aria-label="Edify" onClick={() => setIsMobileMenuOpen(false)} className="ed-glass flex h-11 items-center rounded-full px-5">
          <Image src="/brand/edify-logo.webp" alt="Edify" width={307} height={120} priority unoptimized className="h-[28px] w-auto" />
        </Link>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <a href={SOCIAL_LINKS.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="ed-glass hidden h-11 w-11 place-items-center rounded-full ed-accent-text md:grid"><Send size={17} /></a>
          <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="ed-glass hidden h-11 w-11 place-items-center rounded-full ed-accent-text md:grid"><Instagram size={17} /></a>
          <div className="hidden md:block"><LanguagePill /></div>
          <Link href="/auth/login" className="ed-glass hidden h-11 items-center rounded-full px-5 text-[13.5px] font-bold ed-ink md:flex">
            {t.login}
          </Link>
          <Link href="/auth/signup" className="ed-glass group hidden h-11 items-center gap-2.5 rounded-full pl-5 pr-1.5 text-[13.5px] font-bold ed-ink md:flex">
            {t.start}
            <span className="ed-chip grid h-8 w-8 place-items-center rounded-full transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRight size={16} strokeWidth={2.6} />
            </span>
          </Link>
          <button
            type="button"
            aria-label="Menu"
            className="ed-glass grid h-11 w-11 place-items-center rounded-full ed-ink md:hidden"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="ed-panel mx-auto mt-2 flex max-w-7xl flex-col gap-2 rounded-[28px] p-3 md:hidden"
          >
            <div className="flex rounded-full p-1 ed-soft">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={`flex-1 rounded-full py-2.5 text-[13px] font-bold uppercase transition-all ${lang === l.code ? 'ed-chip' : ''}`}
                >
                  {l.code}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)} className="ed-glass rounded-full py-3 text-center text-[14px] font-bold ed-ink">{t.login}</Link>
              <Link href="/auth/signup" onClick={() => setIsMobileMenuOpen(false)} className="ed-chip rounded-full py-3 text-center text-[14px] font-bold">{t.start}</Link>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-widest ed-ink-3">{t.followUs}</span>
              <a href={SOCIAL_LINKS.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="ed-glass grid h-10 w-10 place-items-center rounded-full ed-accent-text"><Send size={16} /></a>
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="ed-glass grid h-10 w-10 place-items-center rounded-full ed-accent-text"><Instagram size={16} /></a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- 5. MAIN LAYOUT ---
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LangType>('uz');
  const pathname = usePathname();
  const isAuthPage = pathname.includes('/auth/');

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <div className="ed-pub min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        {!isAuthPage && <Navbar />}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </LanguageContext.Provider>
  );
}
