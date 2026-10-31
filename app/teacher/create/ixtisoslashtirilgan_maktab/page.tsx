"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, CheckCircle2, BookOpen, Trash2, Layers, EyeOff, Eye, Menu, X, ChevronRight, BookMarked, Search, Bot, Zap, Plus, GraduationCap, Database, Crown } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp, Timestamp } from "firebase/firestore";
import { toQuestionV1, InvalidTopicError } from "@/lib/questionSchema";
import { aiModelFor } from "@/lib/ai/models";
import type { TopicPath } from "@/lib/questionTopics";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";
import TopicAssignModal from "@/app/teacher/create/_components/TopicAssignModal";

// 🟢 NEW MONTHLY LIMIT IMPORTS
import { useMonthlyLimit } from "@/hooks/useMonthlyLimit";
import AiMonthlyLimitCard from "@/app/teacher/create/_components/AiMonthlyLimitCard"; 

import IxtisosControlPanel from "./_components/IxtisosControlPanel";
import structureMap from "@/data/ixtisoslashtirilgan_maktab/structure.json";
import { useTeacherLanguage } from "@/app/teacher/layout";

// --- TRANSLATION DICTIONARY ---
const IXTISOS_TRANSLATIONS: Record<string, any> = {
  uz: {
    thinkingTitle: "AI Studiya ishlamoqda",
    thinkingPhrases: ["Mavzu tahlil qilinmoqda...", "Konteks o'qilmoqda...", "Ixtisoslashtirilgan mantiq tuzilmoqda...", "Qiyinlik darajasi moslashtirilmoqda...", "Savollar yozilmoqda..."],
    hideSolution: "Yechimni yashirish", showSolution: "AI Yechimni ko'rish", aiSolutionLogic: "AI Yechim Mantiqi",
    toasts: {
      syllabusNotFound: "Syllabus topilmadi!",
      selectAllFields: "Iltimos, barcha maydonlarni tanlang.",
      added: (n: number) => `${n} ta savol qo'shildi!`,
      errGeneric: "Xatolik yuz berdi.",
      errCreateFirst: "Oldin savol yarating.",
      errPickTopic: "Iltimos, savollar uchun mavzu tanlang.",
      savedToBank: "Savollar bazangizga muvaffaqiyatli saqlandi!",
      errSaveBank: "Bazaga saqlashda xatolik yuz berdi.",
      errEnterTitle: "Test nomini kiriting.",
      published: "Test muvaffaqiyatli nashr qilindi!",
      errPublish: "Nashr qilishda xatolik."
    },
    limitLeft: (n: number) => `Sizda oylik limitdan faqatgina ${n} ta savol qoldi. Iltimos so'ralayotgan miqdorni kamaytiring yoki tarifni oshiring.`,
    limitReached: "Oylik AI limitingiz yetarli emas. Tarifingizni oshiring yoki keyingi oyni kuting.",
    back: "Orqaga", close: "Yopish", openParams: "Parametrlarni ochish",
    topBarTitle: "Savol Yaratish", sidebarTitle: "Ixtisos. Dastur",
    draftTitle: "AI Qoralama", questionCountBadge: (n: number) => `${n} Savol`,
    saveToBank: "Bazaga Saqlash", publish: "Nashr qilish", mobilePublish: "Nashr Qilish",
    emptyTitle: "Hozircha bo'sh", emptyDesc: "Chap paneldan parametrlarni tanlang va AI savol yozib beradi.",
    selectParams: "Parametrlarni tanlash",
    mobileCount: (n: number) => `${n} ta savol`,
    morePrompt: "Yana savol qo'shmoqchimisiz?", morePromptDesc: 'Parametrlarni o\'zgartirib yana "Yaratish" tugmasini bosing.',
    mobileSave: "Saqlash",
    premiumFeature: "Premium Xususiyat", viewPlans: "Tariflarni ko'rish", goBack: "Orqaga qaytish",
    classModalTitle: "Sinfni tanlang", subjectModalTitle: "Fanni tanlang",
    syllabusModalTitle: "Mavzuni tanlang", searchPlaceholder: "Mavzu nomini qidiring...",
    topicIndex: (i: any) => `Mavzu ${i}`, notFound: (q: string) => `"${q}" topilmadi`,
    titleModal: { title: "Hujjat nomi", desc: "O'quvchilarga ko'rinadigan rasmiy nomni yozing.", placeholder: "Masalan: Olimpiada tayyorgarligi", cancel: "Bekor qilish", next: "Keyingi Qadam" }
  },
  en: {
    thinkingTitle: "AI Studio is working",
    thinkingPhrases: ["Analyzing the topic...", "Reading the context...", "Building specialized logic...", "Adjusting the difficulty level...", "Writing questions..."],
    hideSolution: "Hide solution", showSolution: "View AI Solution", aiSolutionLogic: "AI Solution Logic",
    toasts: {
      syllabusNotFound: "Syllabus not found!",
      selectAllFields: "Please select all fields.",
      added: (n: number) => `${n} questions added!`,
      errGeneric: "An error occurred.",
      errCreateFirst: "Generate questions first.",
      errPickTopic: "Please select a topic for the questions.",
      savedToBank: "Questions saved to your bank successfully!",
      errSaveBank: "Error saving to the bank.",
      errEnterTitle: "Enter a test title.",
      published: "Test published successfully!",
      errPublish: "Error publishing the test."
    },
    limitLeft: (n: number) => `You only have ${n} questions left in your monthly limit. Please reduce the requested amount or upgrade your plan.`,
    limitReached: "Your monthly AI limit is not enough. Upgrade your plan or wait for next month.",
    back: "Back", close: "Close", openParams: "Open parameters",
    topBarTitle: "Create Questions", sidebarTitle: "Specialized Curriculum",
    draftTitle: "AI Draft", questionCountBadge: (n: number) => `${n} Questions`,
    saveToBank: "Save to Bank", publish: "Publish", mobilePublish: "Publish",
    emptyTitle: "Empty for now", emptyDesc: "Select parameters in the left panel and the AI will write questions.",
    selectParams: "Select parameters",
    mobileCount: (n: number) => `${n} questions`,
    morePrompt: "Want to add more questions?", morePromptDesc: 'Change the parameters and press "Generate" again.',
    mobileSave: "Save",
    premiumFeature: "Premium Feature", viewPlans: "View plans", goBack: "Go back",
    classModalTitle: "Select a grade", subjectModalTitle: "Select a subject",
    syllabusModalTitle: "Select a topic", searchPlaceholder: "Search a topic name...",
    topicIndex: (i: any) => `Topic ${i}`, notFound: (q: string) => `"${q}" not found`,
    titleModal: { title: "Document title", desc: "Write the official name visible to students.", placeholder: "E.g.: Olympiad preparation", cancel: "Cancel", next: "Next Step" }
  },
  ru: {
    thinkingTitle: "AI Студия работает",
    thinkingPhrases: ["Анализ темы...", "Чтение контекста...", "Построение специализированной логики...", "Настройка уровня сложности...", "Составление вопросов..."],
    hideSolution: "Скрыть решение", showSolution: "Посмотреть AI Решение", aiSolutionLogic: "Логика AI Решения",
    toasts: {
      syllabusNotFound: "Учебная программа не найдена!",
      selectAllFields: "Пожалуйста, выберите все поля.",
      added: (n: number) => `Добавлено вопросов: ${n}!`,
      errGeneric: "Произошла ошибка.",
      errCreateFirst: "Сначала создайте вопросы.",
      errPickTopic: "Пожалуйста, выберите тему для вопросов.",
      savedToBank: "Вопросы успешно сохранены в вашу базу!",
      errSaveBank: "Ошибка при сохранении в базу.",
      errEnterTitle: "Введите название теста.",
      published: "Тест успешно опубликован!",
      errPublish: "Ошибка при публикации."
    },
    limitLeft: (n: number) => `В вашем месячном лимите осталось всего ${n} вопросов. Пожалуйста, уменьшите запрашиваемое количество или повысьте тариф.`,
    limitReached: "Вашего месячного AI-лимита недостаточно. Повысьте тариф или дождитесь следующего месяца.",
    back: "Назад", close: "Закрыть", openParams: "Открыть параметры",
    topBarTitle: "Создание вопросов", sidebarTitle: "Специализ. программа",
    draftTitle: "AI Черновик", questionCountBadge: (n: number) => `${n} Вопросов`,
    saveToBank: "Сохранить в базу", publish: "Опубликовать", mobilePublish: "Опубликовать",
    emptyTitle: "Пока пусто", emptyDesc: "Выберите параметры на левой панели, и AI составит вопросы.",
    selectParams: "Выбрать параметры",
    mobileCount: (n: number) => `Вопросов: ${n}`,
    morePrompt: "Хотите добавить ещё вопросы?", morePromptDesc: 'Измените параметры и нажмите «Создать» ещё раз.',
    mobileSave: "Сохранить",
    premiumFeature: "Премиум-функция", viewPlans: "Посмотреть тарифы", goBack: "Вернуться назад",
    classModalTitle: "Выберите класс", subjectModalTitle: "Выберите предмет",
    syllabusModalTitle: "Выберите тему", searchPlaceholder: "Поиск по названию темы...",
    topicIndex: (i: any) => `Тема ${i}`, notFound: (q: string) => `«${q}» не найдено`,
    titleModal: { title: "Название документа", desc: "Напишите официальное название, видимое ученикам.", placeholder: "Например: Подготовка к олимпиаде", cancel: "Отмена", next: "Следующий шаг" }
  }
};

import { Button, IconButton, Skeleton } from "@/components/ui";

import SolutionSteps from "@/components/SolutionSteps";
interface AIQuestion { 
  id: string; uiDifficulty: string; 
  question: { uz: string; ru: string; en: string }; 
  options: { A: { uz: string; ru: string; en: string }; B: { uz: string; ru: string; en: string }; C: { uz: string; ru: string; en: string }; D: { uz: string; ru: string; en: string }; }; 
  answer: string; explanation: { uz: string; ru: string; en: string }; 
  subject: string; topic: string; chapter: string; subtopic: string; difficultyId: number; 
}

/* ─── topic taxonomy ────────────────────────────────────────────────────────
 * The syllabus (data/syllabus.json, via /api/structure) that drives this generator
 * is a DIFFERENT taxonomy from the question bank's (data/question_topics.json) and
 * the two are not mappable. `toQuestionV1()` throws InvalidTopicError on a path it
 * does not know, so the teacher picks the bank topic in TopicAssignModal before any
 * doc is written. The syllabus chapter/subtopic survive as `tags`. */

/** Short plain-text label for one topic-picker row. */
const getPlainText = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 120);
  const v = value as Record<string, unknown>;
  const raw = v.uz ?? v.ru ?? v.en ?? "";
  return typeof raw === "string" ? raw.slice(0, 120) : getPlainText(raw);
};

/** ⚠️ objects, not bare strings — `normalizeQuestion` reads `.id`/`.name`. */
const topicFields = (p: TopicPath) => ({
  subject: { id: p.subjectId, name: p.subjectName },
  topic: { id: p.topicId, name: p.topicName },
  subtopic: { id: p.subtopicId, name: p.subtopicName },
  chapter: { id: "", name: "" },
});

/** custom_tests header name: the shared value, or "Aralash" when the batch spans several. */
const sharedName = (paths: TopicPath[], key: "subjectName" | "topicName" | "subtopicName") => {
  const uniq = [...new Set(paths.map((p) => p[key]))];
  return uniq.length === 1 ? uniq[0] : "Aralash";
};

const formatSubjectName = (rawSubject: string) => {
  if (!rawSubject) return "";
  const cleanedStr = rawSubject.replace(/-/g, " ");
  return cleanedStr.charAt(0).toUpperCase() + cleanedStr.slice(1).toLowerCase();
};

const FormattedText = ({ text }: { text: any }) => {
  if (!text) return null;
  let content = typeof text === 'string' ? text : JSON.stringify(text);
  const hasMathCommands = /\\frac|\\pi|\\sin|\\cos|\\tan|\\ge|\\le|\\cup|\\cap|\\in|\\begin|\\sqrt|\\empty/.test(content);
  if (!content.includes('$') && hasMathCommands) content = `$${content}$`;
  content = content.replace(/\\\((.*?)\\\)/g, '$$$1$$').replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$').replace(/&nbsp;/g, ' ').replace(/\\\\/g, '\\');
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="break-words leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try { return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false }) }} className="block my-2 md:my-3 text-center overflow-x-auto custom-scrollbar" />; } 
          catch (e) { return <span key={index} className="text-error font-mono text-[11px] md:text-[13px] bg-error-container px-1 rounded-m3-xs">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try { return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false }) }} className="px-0.5 inline-block" />; } 
          catch (e) { return <span key={index} className="text-error font-mono text-[11px] md:text-[13px] bg-error-container px-1 rounded-m3-xs">{part}</span>; }
        }
        return <span key={index}>{part.split('\n').map((line, i, arr) => (<span key={i}>{line}{i < arr.length - 1 && <br />}</span>))}</span>;
      })}
    </span>
  );
};

const AiThinkingModal = ({ isVisible }: { isVisible: boolean }) => {
  const { lang } = useTeacherLanguage();
  const t = IXTISOS_TRANSLATIONS[lang] || IXTISOS_TRANSLATIONS['uz'];
  const phrases: string[] = t.thinkingPhrases;
  const [phraseIndex, setPhraseIndex] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => setPhraseIndex((prev) => (prev + 1) % phrases.length), 2500); 
    return () => clearInterval(interval);
  }, [isVisible, phrases.length]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-[320px] md:max-w-md bg-surface-container-low backdrop-blur-2xl rounded-m3-xl border border-outline-variant shadow-elev-3 p-6 md:p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-[color-mix(in_oklab,var(--m3-tertiary)_20%,transparent)] rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-[color-mix(in_oklab,var(--m3-primary)_20%,transparent)] rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-6 md:mb-8 mt-2 md:mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-tertiary to-primary rounded-full blur-xl opacity-40" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-surface-container-lowest backdrop-blur-md rounded-m3-lg md:rounded-m3-xl border border-outline-variant flex items-center justify-center shadow-elev-3">
                <Bot size={36} className="text-tertiary animate-bounce md:w-11 md:h-11" style={{ animationDuration: "2s" }} />
                <Sparkles size={16} className="absolute -top-2 -right-2 text-primary animate-pulse md:w-5 md:h-5 md:-top-3 md:-right-3" />
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-black text-on-surface mb-1 md:mb-2 relative z-10 tracking-tight text-center">{t.thinkingTitle}</h3>
            <div className="h-5 md:h-6 relative z-10 overflow-hidden flex items-center justify-center w-full">
              <motion.p key={phraseIndex} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className="text-[12px] md:text-[14px] font-medium text-on-surface-variant absolute text-center w-full">{phrases[phraseIndex]}</motion.p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const AIQuestionCard = ({ q, idx, onRemove }: { q: AIQuestion, idx: number, onRemove: (id: string) => void }) => {
  const { lang } = useTeacherLanguage();
  const t = IXTISOS_TRANSLATIONS[lang] || IXTISOS_TRANSLATIONS['uz'];
  const [showOptions, setShowOptions] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const getText = (field: any): string => {
    if (!field) return "";
    if (typeof field === "string") return field;
    if (field.uz && typeof field.uz === "string") return field.uz;
    if (field.uz && field.uz.uz) return field.uz.uz; 
    return JSON.stringify(field); 
  };

  return (
    <div className="bg-surface-container-low p-3.5 md:p-5 rounded-m3-lg md:rounded-m3-xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group">
      <div className="flex justify-between items-center gap-2 mb-3 md:mb-5 md:pb-4 md:border-b border-outline-variant">
        <div className="flex items-center flex-wrap gap-1.5 md:gap-2 flex-1 min-w-0">
          <span className="bg-tertiary-container text-on-tertiary-container text-[9px] md:text-[11px] font-black px-2 md:px-3 py-1 md:py-1.5 rounded-m3-xs md:rounded-m3-md uppercase tracking-widest flex items-center gap-1 md:gap-1.5 shrink-0">
            <Sparkles size={10} className="md:w-3 md:h-3" /> Q{idx + 1}
          </span>
          <span className="bg-surface-container-high text-on-surface-variant text-[9px] md:text-[11px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-m3-xs md:rounded-m3-md uppercase tracking-widest flex items-center max-w-full min-w-0">
             <Layers size={10} className="shrink-0 mr-1 md:mr-1.5 md:w-3 md:h-3" />
             <span className="truncate">{q.chapter}</span> <span className="text-outline-variant mx-1 md:mx-1.5 shrink-0">/</span> <span className="truncate">{q.subtopic}</span>
          </span>
          <span className="hidden sm:inline-flex bg-inverse-surface text-inverse-on-surface text-[10px] md:text-[11px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-m3-xs md:rounded-m3-md uppercase tracking-widest shadow-elev-1 shrink-0">{q.uiDifficulty}</span>
        </div>

        <div className="flex items-center bg-surface-container md:bg-transparent border border-outline-variant md:border-transparent rounded-m3-sm md:rounded-none p-0.5 md:p-0 shrink-0">
          <button onClick={() => setShowOptions(!showOptions)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest md:hover:bg-state-hover p-1 md:p-2 rounded-m3-xs md:rounded-m3-md transition-colors"><Eye size={14} className="md:w-[18px] md:h-[18px]" /></button>

          {getText(q.explanation).trim().length > 0 && (
            <>
              <div className="w-px h-3 md:h-5 bg-outline-variant mx-0.5 md:mx-1"></div>
              <button onClick={() => setShowExplanation(!showExplanation)} className={`p-1 md:p-2 rounded-m3-xs md:rounded-m3-md transition-colors ${showExplanation ? 'bg-tertiary-container text-on-tertiary-container' : 'text-on-surface-variant hover:text-tertiary hover:bg-surface-container-lowest md:hover:bg-tertiary-container'}`}><BookOpen size={14} className="md:w-[18px] md:h-[18px]" /></button>
            </>
          )}

          <div className="w-px h-3 md:h-5 bg-outline-variant mx-0.5 md:mx-1"></div>
          <button onClick={() => onRemove(q.id)} className="text-on-surface-variant hover:text-error hover:bg-surface-container-lowest md:hover:bg-error-container p-1 md:p-2 rounded-m3-xs md:rounded-m3-md transition-colors"><Trash2 size={14} className="md:w-[18px] md:h-[18px]" /></button>
        </div>
      </div>

      <div className="font-semibold text-[12px] md:text-[15.5px] text-on-surface mb-3 md:mb-6 leading-snug md:leading-relaxed"><FormattedText text={getText(q.question)} /></div>
      
      {showOptions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3 mb-1 md:mb-2">
          {Object.entries(q.options).map(([key, value]) => {
            const isCorrect = q.answer === key;
            return (
              <div key={key} className={`flex items-start p-2 md:p-3.5 rounded-m3-md md:rounded-m3-lg border-2 transition-all ${isCorrect ? 'bg-success-container border-success' : 'bg-surface-container md:bg-surface-container-lowest border-outline-variant hover:border-outline'}`}>
                <div className={`w-5 h-5 md:w-7 md:h-7 rounded-m3-xs md:rounded-m3-sm flex items-center justify-center text-[10px] md:text-[12px] font-black mr-2 md:mr-3 shrink-0 mt-0.5 transition-colors ${isCorrect ? 'bg-success text-surface-container-lowest shadow-elev-1' : 'bg-surface-container-lowest md:bg-surface-container-high text-on-surface-variant border border-outline-variant md:border-none'}`}>{key}</div>
                <div className={`text-[11px] md:text-[14.5px] font-medium pt-0.5 break-words overflow-hidden ${isCorrect ? 'text-on-success-container' : 'text-on-surface'}`}><FormattedText text={getText(value)} /></div>
              </div>
            );
          })}
        </div>
      )}
      
      {getText(q.explanation).trim().length > 0 && (
        <div className="mt-2.5 md:mt-4 pt-2.5 md:pt-4 border-t border-outline-variant flex justify-start">
          <button onClick={() => setShowExplanation(!showExplanation)} className={`m3-interactive flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-m3-sm md:rounded-m3-md text-[11px] md:text-[13px] font-bold transition-all duration-300 ${showExplanation ? 'bg-tertiary text-on-tertiary shadow-inner' : 'bg-tertiary-container text-on-tertiary-container hover:shadow-elev-1'}`}>
            <Sparkles size={12} className={`md:w-4 md:h-4 ${showExplanation ? "text-on-tertiary" : "text-on-tertiary-container"}`} />
            {showExplanation ? t.hideSolution : t.showSolution}
          </button>
        </div>
      )}

      {showExplanation && getText(q.explanation).trim().length > 0 && (
        <div className="bg-tertiary-container p-2.5 md:p-4.5 rounded-m3-md md:rounded-m3-lg mt-2.5 md:mt-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-[9px] md:text-[11px] font-black text-tertiary uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1 md:gap-1.5"><Sparkles size={10} className="md:w-[14px] md:h-[14px]" /> {t.aiSolutionLogic}</p>
          <div className="text-[11px] md:text-[14px] text-on-tertiary-container leading-relaxed font-medium"><SolutionSteps text={getText(q.explanation)} render={(part) => <FormattedText text={part} />} /></div>
        </div>
      )}
    </div>
  );
};

export default function IxtisoslashtirilganGeneratorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = IXTISOS_TRANSLATIONS[lang] || IXTISOS_TRANSLATIONS['uz'];
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 🟢 NEW: Monthly Limit Logic
  const aiData = useMonthlyLimit(); 

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  
  const availableClasses = Object.keys(structureMap).sort((a, b) => parseInt(a) - parseInt(b));
  // @ts-ignore
  const availableSubjects = selectedClass ? (structureMap[selectedClass] || []) : [];

  const [syllabusData, setSyllabusData] = useState<any>(null);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
  
  const [selectedChapterIndex, setSelectedChapterIndex] = useState("");
  const [selectedSubtopicIndex, setSelectedSubtopicIndex] = useState("");
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);

  const [difficulty, setDifficulty] = useState("hard");
  const [count, setCount] = useState(5);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([]);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicIntent, setTopicIntent] = useState<"bank" | "publish">("bank");
  const [topicPaths, setTopicPaths] = useState<TopicPath[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState(false); 
  const [testTitle, setTestTitle] = useState("");
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState(""); // 🟢 NEW STATE
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      setIsLoadingSyllabus(true);
      setSyllabusData(null);
      setSelectedChapterIndex("");
      setSelectedSubtopicIndex("");

      fetch(`/api/syllabus?track=ixtisoslashtirilgan_maktab&class=${selectedClass}&subject=${selectedSubject}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => { if (data && data[0]) setSyllabusData(data[0]); })
        .catch(() => toast.error(t.toasts.syllabusNotFound))
        .finally(() => setIsLoadingSyllabus(false));
    }
  }, [selectedClass, selectedSubject]);

  const activeChapter = syllabusData?.chapters?.find((c: any) => c.index.toString() === selectedChapterIndex);
  const activeSubtopic = activeChapter?.subtopics?.find((s: any) => s.index.toString() === selectedSubtopicIndex);
  const isReadyToGenerate = selectedClass && selectedSubject && activeChapter && activeSubtopic;

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedQuestions, isGenerating]);

  const handleClassSelect = (c: string) => {
    setSelectedClass(c);
    // @ts-ignore
    if (!structureMap[c]?.includes(selectedSubject)) {
      setSelectedSubject("");
      setSyllabusData(null);
      setSelectedChapterIndex("");
      setSelectedSubtopicIndex("");
    }
    setIsClassModalOpen(false);
    setTimeout(() => setIsSubjectModalOpen(true), 300);
  };

  const handleSubjectSelect = (s: string) => {
    setSelectedSubject(s);
    setIsSubjectModalOpen(false);
    setTimeout(() => setIsSyllabusModalOpen(true), 300);
  };

  const handleGenerate = async () => {
    if (!isReadyToGenerate) return toast.error(t.toasts.selectAllFields);

    // 🟢 NEW: Pre-check monthly limits
    if (!aiData.isUnlimited && aiData.remaining < count) {
      setLimitModalMessage(t.limitLeft(aiData.remaining));
      setIsLimitModalOpen(true);
      return; 
    }

    setIsGenerating(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);

    try {
      const response = await fetch("/teacher/create/ixtisoslashtirilgan_maktab/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid, 
          topic: selectedClass,       
          subject: selectedSubject,   
          chapter: activeChapter.chapter,
          subtopic: activeSubtopic.name, 
          context: activeSubtopic.context || "", 
          difficulty,
          count,
          language: "uz"
        }),
      });

      const data = await response.json();
      
      // 🟢 NEW: Gatekeeper Error Handling
      if (!response.ok) {
        if (data.code === 'LIMIT_REACHED') {
          setLimitModalMessage(t.limitReached);
          setIsLimitModalOpen(true);
          return;
        }
        throw new Error(data.error);
      }

      let diffVal = 1;
      if (difficulty === "easy") diffVal = 1;
      else if (difficulty === "medium") diffVal = 2;
      else if (difficulty === "hard") diffVal = 3;
      else if (difficulty === "olympiad") diffVal = 4;

      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        ...q,
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        subject: formatSubjectName(selectedSubject), 
        topic: syllabusData.category,                
        chapter: activeChapter.chapter,
        subtopic: activeSubtopic.name,
        difficultyId: diffVal,
        uiDifficulty: difficulty
      }));

      setGeneratedQuestions(prev => [...prev, ...enrichedQuestions]);
      toast.success(t.toasts.added(count));
    } catch (error: any) {
      toast.error(error.message || t.toasts.errGeneric);
    } finally {
      setIsGenerating(false);
    }
  };

  const removeQuestion = (idToDelete: string) => setGeneratedQuestions(prev => prev.filter(q => q.id !== idToDelete));
  
  // --- TOPIC GATE (runs before BOTH save paths) ---
  const openTopicModal = (intent: "bank" | "publish") => {
    if (generatedQuestions.length === 0) return toast.error(t.toasts.errCreateFirst);
    setIsSidebarOpen(false); // the mobile sidebar overlay would sit on top of the dialog
    setTopicIntent(intent);
    setIsTopicModalOpen(true);
  };

  const handleTopicConfirm = (paths: TopicPath[]) => {
    setTopicPaths(paths);
    if (topicIntent === "bank") {
      void handleSaveToBank(paths);
      return;
    }
    // publish: topic first, then title, then TestConfigurationModal.
    setIsTopicModalOpen(false);
    setIsTitleModalOpen(true);
  };

  /** Defensive: toQuestionV1 should never throw once the modal is wired. */
  const onInvalidTopic = (intent: "bank" | "publish") => {
    toast.error(t.toasts.errPickTopic);
    setTopicIntent(intent);
    setIsTopicModalOpen(true);
  };

  /** The syllabus provenance the bank taxonomy has no slot for — kept as tags. */
  const syllabusTags = (q: AIQuestion) => [
    "ixtisos_ai",
    (q.subtopic || "").toLowerCase(),
    (q.chapter || "").toLowerCase(),
  ];

  const handleSaveToBank = async (paths: TopicPath[]) => {
    if (generatedQuestions.length === 0) return toast.error(t.toasts.errCreateFirst);
    if (!user) return;

    setIsSavingToBank(true);
    const batch = writeBatch(db);

    try {
      generatedQuestions.forEach((q, i) => {
        const id = `tq_${doc(collection(db, "teacher_questions")).id}`;
        const v1 = toQuestionV1(
          {
            ...q,
            ...topicFields(paths[i]),
            difficulty: q.uiDifficulty?.toLowerCase() || "medium",
            difficultyId: q.difficultyId,
            tags: syllabusTags(q),
            language: ["uz"],
            solutions: [],
          },
          {
            id,
            creatorId: user.uid,
            creatorName: user.displayName || "Teacher",
            creationMethod: "ai_generated",
            status: "published",
            aiModel: aiModelFor('questions'),
            timestamp: serverTimestamp(),
          },
        );
        batch.set(doc(db, "teacher_questions", id), v1);
      });

      await batch.commit();
      setIsTopicModalOpen(false);
      toast.success(t.toasts.savedToBank);
      setGeneratedQuestions([]);
      router.push('/teacher/create/my_questions');
    } catch (error) {
      if (error instanceof InvalidTopicError) {
        onInvalidTopic("bank");
        return;
      }
      console.error("Save to bank error:", error);
      toast.error(t.toasts.errSaveBank);
    } finally {
      setIsSavingToBank(false);
    }
  };

  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error(t.toasts.errEnterTitle);
    setIsTitleModalOpen(false);
    setIsConfigModalOpen(true);
  };

  const handleFinalPublish = async (testSettings: any) => {
    if (!user) return;
    if (topicPaths.length !== generatedQuestions.length) {
      setIsConfigModalOpen(false);
      return onInvalidTopic("publish");
    }
    setIsPublishing(true);
    const batch = writeBatch(db);
    const finalQuestionsToSave: ReturnType<typeof toQuestionV1>[] = [];

    try {
      generatedQuestions.forEach((q, i) => {
        const id = `tq_${doc(collection(db, "teacher_questions")).id}`;
        const source = {
          ...q,
          ...topicFields(topicPaths[i]),
          difficulty: q.uiDifficulty?.toLowerCase() || "medium",
          difficultyId: q.difficultyId,
          tags: syllabusTags(q),
          language: ["uz"],
          solutions: [],
        };
        const meta = {
          id,
          creatorId: user.uid,
          creatorName: user.displayName || "Teacher",
          creationMethod: "ai_generated" as const,
          status: "published" as const,
          aiModel: aiModelFor('questions'),
        };

        batch.set(doc(db, "teacher_questions", id), toQuestionV1(source, { ...meta, timestamp: serverTimestamp() }));
        // The embedded snapshot needs a CONCRETE time: Firestore rejects serverTimestamp() sentinels inside arrays.
        finalQuestionsToSave.push(toQuestionV1(source, { ...meta, timestamp: Timestamp.now() }));
      });

      batch.set(doc(collection(db, "custom_tests")), {
        teacherId: user.uid,
        title: testTitle,
        track: "ixtisoslashtirilgan_maktab",
        subjectName: sharedName(topicPaths, "subjectName"),
        topicName: sharedName(topicPaths, "topicName"),
        chapterName: "",
        subtopicName: sharedName(topicPaths, "subtopicName"),
        questions: finalQuestionsToSave,
        duration: testSettings.duration,
        shuffle: testSettings.shuffleQuestions,
        resultsVisibility: testSettings.resultsVisibility,
        accessCode: testSettings.accessCode,
        status: "active",
        createdAt: serverTimestamp(),
        questionCount: finalQuestionsToSave.length,
      });

      await batch.commit();
      toast.success(t.toasts.published);
      router.push("/teacher/library/tests");
    } catch (error) {
      if (error instanceof InvalidTopicError) {
        setIsConfigModalOpen(false);
        onInvalidTopic("publish");
        return;
      }
      toast.error(t.toasts.errPublish);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="t-workspace flex h-[100dvh] bg-surface overflow-hidden font-t-body selection:bg-tertiary-container selection:text-on-tertiary-container">
      
      <AiThinkingModal isVisible={isGenerating} />

      <TopicAssignModal
        open={isTopicModalOpen}
        questions={generatedQuestions.map(q => getPlainText(q.question))}
        isSaving={isSavingToBank}
        onClose={() => setIsTopicModalOpen(false)}
        onConfirm={handleTopicConfirm}
      />

      <div className="lg:hidden fixed top-0 left-0 right-0 h-[60px] bg-[color-mix(in_oklab,var(--m3-surface)_90%,transparent)] backdrop-blur-xl border-b border-outline-variant z-[100000] flex items-center justify-between px-3 shadow-elev-1">
        <IconButton aria-label={t.back} size="sm" onClick={() => router.push('/teacher/create')} className="-ml-1"><ArrowLeft size={18} /></IconButton>
        <span className="font-black text-on-surface text-[14px]">{t.topBarTitle}</span>
        <IconButton aria-label={t.openParams} variant="tonal" size="sm" onClick={() => setIsSidebarOpen(true)} className="-mr-1"><Menu size={18} /></IconButton>
      </div>

      {mounted && (
        <>
          <AnimatePresence>
            {isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed top-[60px] left-0 right-0 bottom-0 bg-scrim backdrop-blur-sm z-[99998]" onClick={() => setIsSidebarOpen(false)} />}
          </AnimatePresence>

          <aside className={`fixed lg:relative top-[60px] lg:top-0 left-0 w-full sm:w-[400px] h-[calc(100dvh-60px)] lg:h-[100dvh] bg-surface-container-low border-r border-outline-variant shadow-elev-3 lg:shadow-none z-[99998] lg:z-10 t-float-panel transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
            <div className="flex justify-between items-center p-3 md:p-5 border-b border-outline-variant bg-surface-container-low shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2 md:gap-3">
                <button onClick={() => router.push('/teacher/create')} className="hidden lg:flex p-1.5 -ml-1.5 text-on-surface-variant hover:text-on-surface hover:bg-state-hover rounded-m3-sm transition-all"><ArrowLeft size={18} /></button>
                <h2 className="font-bold text-[14px] md:text-[16px] text-on-surface tracking-tight flex items-center gap-2"><Sparkles size={16} className="text-tertiary md:w-[18px] md:h-[18px]"/> {t.sidebarTitle}</h2>
              </div>
              <IconButton aria-label={t.close} size="sm" onClick={() => setIsSidebarOpen(false)} className="lg:hidden"><X size={16} strokeWidth={2.5}/></IconButton>
            </div>

            <div className="flex-1 overflow-hidden relative bg-surface-container-low">
               <IxtisosControlPanel 
                 selectedClass={selectedClass} onOpenClassModal={() => setIsClassModalOpen(true)}
                 selectedSubject={selectedSubject} onOpenSubjectModal={() => setIsSubjectModalOpen(true)}
                 activeChapter={activeChapter} activeSubtopic={activeSubtopic} onOpenSyllabus={() => setIsSyllabusModalOpen(true)}
                 difficulty={difficulty} setDifficulty={setDifficulty}
                 count={count} setCount={setCount}
                 isLoadingSyllabus={isLoadingSyllabus} 
                 isReadyToGenerate={isReadyToGenerate} isGenerating={isGenerating} handleGenerate={handleGenerate}
                 aiData={aiData} 
                 setIsLimitModalOpen={setIsLimitModalOpen}
                 setLimitModalMessage={setLimitModalMessage} // 🟢 PASSED HERE
               />
            </div>
          </aside>
        </>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full pt-[60px] lg:pt-0 pb-24 lg:pb-0">
        
        <div className="hidden lg:flex t-page-bar t-page-bar-flush sticky top-0 z-20 bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-md border-b border-outline-variant px-8 py-3 justify-between items-center shadow-elev-1">
          <div className="flex items-center gap-4">
            <h1 className="text-[16px] font-bold text-on-surface tracking-tight">{t.draftTitle}</h1>
            {generatedQuestions.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-tertiary-container rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></div>
                <span className="text-[11px] font-bold text-on-tertiary-container tracking-wide uppercase">{t.questionCountBadge(generatedQuestions.length)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* 🟢 NEW: Monthly Limit Card */}
            <AiMonthlyLimitCard aiData={aiData} />

            <Button
              variant="outlined"
              size="sm"
              icon={<Database />}
              loading={isSavingToBank}
              onClick={() => openTopicModal("bank")}
              disabled={isPublishing || isSavingToBank || isGenerating || generatedQuestions.length === 0}
            >
              {t.saveToBank}
            </Button>

            <Button
              variant="tonal"
              size="sm"
              icon={<CheckCircle2 />}
              onClick={() => openTopicModal("publish")}
              disabled={isPublishing || isSavingToBank || isGenerating || generatedQuestions.length === 0}
            >
              {t.publish}
            </Button>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto p-3 md:p-8 space-y-4 md:space-y-6">
          {generatedQuestions.length === 0 && !isGenerating ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-[60vh] flex flex-col items-center justify-center text-on-surface-variant border-2 border-dashed border-outline-variant rounded-m3-lg bg-surface-container-low lg:mt-6 p-4 md:p-6 text-center shadow-elev-1 mx-1 lg:mx-0">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-tertiary-container rounded-m3-md md:rounded-m3-lg flex items-center justify-center mb-4 md:mb-5"><Sparkles size={24} className="text-on-tertiary-container md:w-7 md:h-7" /></div>
              <p className="font-black text-on-surface text-[16px] md:text-[18px] mb-1.5 md:mb-2">{t.emptyTitle}</p>
              <p className="text-[12px] md:text-[14px] text-on-surface-variant max-w-[250px] font-medium leading-relaxed">{t.emptyDesc}</p>
              <Button variant="filled" onClick={() => setIsSidebarOpen(true)} className="lg:hidden mt-6">{t.selectParams}</Button>
            </motion.div>
          ) : (
            <div className="space-y-4 md:space-y-6 lg:pb-12">
              <div className="lg:hidden flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] md:text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">{t.mobileCount(generatedQuestions.length)}</span>
                {/* 🟢 NEW: Mobile Monthly Limit Card */}
                <AiMonthlyLimitCard aiData={aiData} />
              </div>

              {generatedQuestions.map((q, idx) => (
                <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} />
              ))}

              {isGenerating && (
                <div className="bg-surface-container-low p-4 md:p-6 rounded-m3-lg md:rounded-m3-xl shadow-elev-1 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--m3-tertiary)_10%,transparent)] to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
                  <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6"><Skeleton className="w-16 h-5 md:w-24 md:h-6 rounded-full" /><Skeleton className="w-24 h-5 md:w-32 md:h-6 rounded-full" /></div>
                  <Skeleton className="w-3/4 h-4 md:h-5 rounded-m3-sm mb-4 md:mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="w-full h-12 md:h-14 rounded-m3-md md:rounded-m3-lg" />)}</div>
                </div>
              )}

              {!isGenerating && generatedQuestions.length > 0 && (
                <div className="py-8 md:py-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-surface-container-high text-on-surface-variant rounded-full flex items-center justify-center mb-3 md:mb-4"><Layers size={18} className="md:w-5 md:h-5" /></div>
                  <p className="text-[13px] md:text-[15px] font-black text-on-surface">{t.morePrompt}</p>
                  <p className="text-[11px] md:text-[13.5px] text-on-surface-variant mt-1 max-w-[280px] font-medium leading-relaxed">{t.morePromptDesc}</p>
                </div>
              )}
              
              <div ref={bottomRef} className="h-10" />
            </div>
          )}
        </div>
      </main>

      {/* 🟢 MOBILE FLOATING ACTIONS */}
      {mounted && !isSidebarOpen && generatedQuestions.length > 0 && createPortal(
        <div className="lg:hidden fixed bottom-5 left-0 right-0 px-3 flex items-center gap-2 z-[100] animate-in slide-in-from-bottom-10">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="m3-interactive w-[46px] h-[46px] bg-tertiary text-on-tertiary rounded-full shadow-elev-2 flex items-center justify-center active:scale-95 transition-transform shrink-0"
          >
            <Plus size={20} strokeWidth={2.5}/>
          </button>

          <div className="flex-1 flex gap-2">
            <Button
              variant="tonal"
              icon={<Database />}
              loading={isSavingToBank}
              onClick={() => openTopicModal("bank")}
              disabled={isSavingToBank || isPublishing || isGenerating}
              className="flex-1 h-[46px]"
            >
              {t.mobileSave}
            </Button>
            <Button
              variant="filled"
              icon={<CheckCircle2 />}
              loading={isPublishing}
              onClick={() => openTopicModal("publish")}
              disabled={isPublishing || isSavingToBank || isGenerating}
              className="flex-1 h-[46px] shadow-elev-2"
            >
              {t.mobilePublish}
            </Button>
          </div>
        </div>,
        document.body
      )}

      {/* 🟢 NEW PREMIUM LIMIT MODAL */}
      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-surface-container-low rounded-m3-xl p-6 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-elev-3 z-10 flex flex-col items-center text-center">
              <IconButton aria-label="Yopish" size="sm" onClick={() => setIsLimitModalOpen(false)} className="absolute top-3 right-3 md:top-4 md:right-4"><X size={18} className="md:w-5 md:h-5" /></IconButton>

              <div className="w-14 h-14 md:w-16 md:h-16 bg-primary-container rounded-m3-md md:rounded-m3-lg flex items-center justify-center mb-4 shadow-inner">
                <Crown size={28} className="text-on-primary-container" />
              </div>

              <h3 className="text-lg md:text-xl font-black text-on-surface mb-2">Premium Xususiyat</h3>
              <p className="text-[13px] md:text-[14px] text-on-surface-variant mb-6 font-medium leading-relaxed">
                {limitModalMessage}
              </p>

              <div className="w-full flex flex-col gap-2">
                <Button variant="filled" className="w-full" onClick={() => router.push('/teacher/subscription')}>
                  Tariflarni ko'rish <ArrowLeft className="rotate-180" />
                </Button>
                <Button variant="outlined" className="w-full" onClick={() => setIsLimitModalOpen(false)}>
                  Orqaga qaytish
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* ALL OTHER MODALS (Class, Subject, Syllabus, Title)                    */}
      {/* ===================================================================== */}
      {mounted && createPortal(
        <>
          {/* CLASS SELECTION MODAL */}
          <AnimatePresence>
            {isClassModalOpen && (
              <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsClassModalOpen(false)} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-surface-container-low rounded-t-m3-xl sm:rounded-m3-xl w-full max-w-md h-auto max-h-[90dvh] flex flex-col shadow-elev-3 overflow-hidden z-10">
                  <div className="p-4 md:p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-low shrink-0">
                    <h3 className="text-[18px] md:text-xl font-black text-on-surface">Sinfni tanlang</h3>
                    <IconButton aria-label="Yopish" size="sm" onClick={() => setIsClassModalOpen(false)}><X size={18} className="md:w-5 md:h-5"/></IconButton>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar bg-surface">
                    <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                      {availableClasses.map(c => (
                        <button key={c} onClick={() => handleClassSelect(c)} className={`m3-interactive p-3 md:p-4 rounded-m3-lg border-2 transition-all flex flex-col items-center justify-center gap-2 md:gap-3 active:scale-[0.98] ${selectedClass === c ? 'bg-tertiary-container border-tertiary text-on-tertiary-container shadow-elev-2' : 'bg-surface-container-lowest border-outline-variant text-on-surface hover:border-tertiary hover:shadow-elev-1'}`}>
                          <GraduationCap size={24} className={`md:w-7 md:h-7 ${selectedClass === c ? "text-tertiary" : "text-on-surface-variant"}`}/>
                          <span className="text-[13px] md:text-[15px] font-bold">{c}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>




          {/* SUBJECT SELECTION MODAL */}
          <AnimatePresence>
            {isSubjectModalOpen && selectedClass && (
              <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsSubjectModalOpen(false)} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-surface-container-low rounded-t-m3-xl sm:rounded-m3-xl w-full max-w-lg h-auto max-h-[90dvh] flex flex-col shadow-elev-3 overflow-hidden z-10">
                  <div className="p-4 md:p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-low shrink-0">
                    <div>
                      <h3 className="text-[18px] md:text-xl font-black text-on-surface">Fanni tanlang</h3>
                      <p className="text-on-surface-variant text-[10px] md:text-[12px] font-bold mt-0.5 uppercase tracking-widest">{selectedClass}</p>
                    </div>
                    <IconButton aria-label="Yopish" size="sm" onClick={() => setIsSubjectModalOpen(false)}><X size={18} className="md:w-5 md:h-5"/></IconButton>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar bg-surface">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                      {availableSubjects.map((s: string) => (
                        <button key={s} onClick={() => handleSubjectSelect(s)} className={`m3-interactive p-3 md:p-4 rounded-m3-md md:rounded-m3-lg border-2 transition-all flex items-center gap-3 md:gap-4 active:scale-[0.98] ${selectedSubject === s ? 'bg-tertiary-container border-tertiary text-on-tertiary-container shadow-elev-2' : 'bg-surface-container-lowest border-outline-variant text-on-surface hover:border-tertiary hover:shadow-elev-1'}`}>
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-m3-sm md:rounded-m3-md flex items-center justify-center shrink-0 ${selectedSubject === s ? 'bg-tertiary text-on-tertiary' : 'bg-surface-container border border-outline-variant text-on-surface-variant'}`}>
                            <BookOpen size={18} className="md:w-5 md:h-5" />
                          </div>
                          <span className="text-[13px] md:text-[15px] font-bold text-left leading-snug">{formatSubjectName(s)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* SYLLABUS SELECTION MODAL */}
          <AnimatePresence>
            {isSyllabusModalOpen && syllabusData && (
              <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => { setIsSyllabusModalOpen(false); setSearchQuery(""); }} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-surface-container-low rounded-t-m3-xl sm:rounded-m3-xl w-full max-w-4xl h-[90dvh] sm:h-[85vh] flex flex-col shadow-elev-3 overflow-hidden z-10">
                  <div className="p-4 md:p-6 border-b border-outline-variant flex flex-col gap-3 md:gap-4 bg-surface-container-low shrink-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-[18px] md:text-2xl font-black text-on-surface">Mavzuni tanlang</h3>
                        <p className="text-on-surface-variant text-[11px] md:text-[13px] font-bold mt-0.5">{selectedClass} • {formatSubjectName(selectedSubject)}</p>
                      </div>
                      <IconButton aria-label="Yopish" size="sm" onClick={() => { setIsSyllabusModalOpen(false); setSearchQuery(""); }}><X size={18} className="md:w-5 md:h-5"/></IconButton>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                      <input
                        type="text" placeholder="Mavzu nomini qidiring..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 md:py-3.5 rounded-m3-md md:rounded-m3-lg border border-outline-variant bg-surface-container focus:bg-surface-container-lowest focus:outline-none focus:border-tertiary focus:ring-4 focus:ring-[color-mix(in_oklab,var(--m3-tertiary)_10%,transparent)] transition-all text-[13px] md:text-[14px] font-bold text-on-surface placeholder:text-on-surface-variant"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-surface">
                    {syllabusData.chapters.map((chapter: any) => {
                      const filteredSubtopics = chapter.subtopics.filter((sub: any) => sub.name.toLowerCase().includes(searchQuery.toLowerCase()));
                      if (filteredSubtopics.length === 0) return null;

                      return (
                        <div key={chapter.index} className="mb-6 md:mb-8 last:mb-0 animate-in fade-in">
                          <h4 className="text-[10px] md:text-[12px] font-black text-tertiary uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                            <BookMarked size={12} className="md:w-3.5 md:h-3.5" strokeWidth={3}/> {chapter.chapter}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
                            {filteredSubtopics.map((sub: any) => {
                              const isSelected = selectedChapterIndex === chapter.index.toString() && selectedSubtopicIndex === sub.index.toString();
                              return (
                                <button 
                                  key={sub.index}
                                  onClick={() => { setSelectedChapterIndex(chapter.index.toString()); setSelectedSubtopicIndex(sub.index.toString()); setIsSyllabusModalOpen(false); setSearchQuery(""); }}
                                  className={`m3-interactive text-left p-3.5 md:p-4 rounded-m3-md md:rounded-m3-lg border transition-all duration-200 flex flex-col justify-between h-full min-h-[80px] md:min-h-[90px] active:scale-[0.98] ${isSelected ? 'bg-tertiary border-tertiary text-on-tertiary shadow-elev-2' : 'bg-surface-container-lowest border-outline-variant hover:border-tertiary hover:shadow-elev-1'}`}
                                >
                                  <span className={`text-[12px] md:text-[13.5px] font-bold leading-snug ${isSelected ? 'text-on-tertiary' : 'text-on-surface'}`}>{sub.name}</span>
                                  <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-3 md:mt-4 ${isSelected ? 'text-on-tertiary opacity-80' : 'text-on-surface-variant'}`}>Mavzu {sub.index}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {syllabusData.chapters.every((c: any) => c.subtopics.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) && (
                      <div className="flex flex-col items-center justify-center py-12 md:py-16 text-on-surface-variant">
                        <Search size={32} className="mb-3 md:mb-4 opacity-30 text-tertiary md:w-10 md:h-10" />
                        <p className="font-bold text-[13px] md:text-[15px] text-on-surface-variant">"{searchQuery}" topilmadi</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* TITLE SAVE MODAL */}
          <AnimatePresence>
            {isTitleModalOpen && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-surface-container-low rounded-m3-xl p-5 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-elev-3 z-10">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-tertiary-container rounded-m3-md md:rounded-m3-lg flex items-center justify-center mb-4 md:mb-5"><BookOpen size={24} strokeWidth={2.5} className="text-on-tertiary-container md:w-7 md:h-7" /></div>
                  <h3 className="text-lg md:text-xl font-black text-on-surface mb-1 md:mb-1.5">Hujjat nomi</h3>
                  <p className="text-[11px] md:text-[13px] font-medium text-on-surface-variant mb-5 md:mb-6 leading-relaxed">O'quvchilarga ko'rinadigan rasmiy nomni yozing.</p>
                  <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} className="w-full px-3 py-2.5 md:px-4 md:py-3.5 bg-surface-container border border-outline-variant rounded-m3-md text-[13px] md:text-[14px] font-black text-on-surface outline-none focus:bg-surface-container-lowest focus:border-tertiary focus:ring-4 focus:ring-[color-mix(in_oklab,var(--m3-tertiary)_10%,transparent)] transition-all mb-6 md:mb-8 placeholder:font-medium placeholder:text-on-surface-variant" autoFocus placeholder="Masalan: Olimpiada tayyorgarligi"/>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3">
                    <Button variant="tonal" className="w-full" onClick={() => setIsTitleModalOpen(false)}>Bekor qilish</Button>
                    <Button variant="filled" className="w-full" onClick={handleTitleSubmit}>
                      Keyingi Qadam <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/>
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
          {isConfigModalOpen && (
            <TestConfigurationModal 
              isOpen={isConfigModalOpen}
              onClose={() => setIsConfigModalOpen(false)}
              onConfirm={handleFinalPublish}
              
              // 🟢 YOU MUST ADD THESE 3 LINES:
              isSaving={isPublishing} 
              testTitle={testTitle}
              questionCount={generatedQuestions.length}
            />
          )}
        </AnimatePresence>

          
        </>,
        document.body
      )}

    </div>
  );
}

