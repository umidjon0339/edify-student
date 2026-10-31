"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, X, CheckCircle2, Wand2, BookOpen, Trash2, Layers, EyeOff, Eye, Minus, Plus, ChevronRight, Bot, Zap, Target, Database, Lightbulb, Crown } from "lucide-react";
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

import { useTeacherLanguage } from "@/app/teacher/layout";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";
import TopicAssignModal from "@/app/teacher/create/_components/TopicAssignModal";
import { Button } from "@/components/ui";

// 🟢 NEW AI MONTHLY LIMIT BLOCK START
import { useMonthlyLimit } from "@/hooks/useMonthlyLimit";
import AiMonthlyLimitCard from "@/app/teacher/create/_components/AiMonthlyLimitCard"; 
import SolutionSteps from "@/components/SolutionSteps";
// 🔴 NEW AI MONTHLY LIMIT BLOCK END

// --- 1. TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    headerTitle: "AI Maxsus Prompt",
    publishBtn: "Nashr Qilish",
    saveToBankBtn: "Bazaga Saqlash", 
    savedToBankSuccess: "Savollar bazangizga muvaffaqiyatli saqlandi!",
    topicRequired: "Iltimos, savollar uchun mavzu tanlang.",
    modalTitle: "Test nomini kiriting",
    modalDesc: "Yangi yaratilgan testni saqlash va sozlashdan oldin unga nom bering.",
    modalCancel: "Bekor qilish",
    modalNext: "Keyingi qadam",
    inputTitle: "Vazifani tushuntiring",
    inputDesc: "Sun'iy intellekt siz yozgan matn asosida test tuzadi.",
    items: "Savol",
    easy: "Oson", medium: "O'rta", hard: "Qiyin",
    placeholder: "Masalan: Abituriyentlar uchun trigonometrik tengsizliklar va tenglamalar mavzusida test tayyorlab ber...",
    wordsMore: "Yana {n} ta so'z",
    ready: "Tayyor",
    generating: "Yaratilmoqda...",
    generateBtn: "Test Yaratish",
    tips: {
      t1: { title: "Auditoriyani bildiring", desc: "\"5-sinflar uchun\" deb yozsangiz, AI savollarni shunga moslaydi." },
      t2: { title: "Avtomatik formatlash", desc: "Barcha matematik formulalar AI tomonidan toza render qilinadi." },
      t3: { title: "Uzluksiz yaratish", desc: "Matnni o'zgartirib qayta bossangiz, yangi savollar pastga qo'shiladi." }
    },
    resultsTitle: "Tayyorlangan Savollar",
    addMore: "Yana savol qo'shish",
    addMoreInstructions: "Matnni o'zgartiring va 'Test Yaratish' tugmasini bosing.", 
    solutionLogic: "Yechim Mantiqi",
    hideExp: "Yashirish",
    showExp: "Yechim",
    promptTooShort: "Iltimos, batafsilroq ko'rsatma yozing (kamida 5 ta so'z).",
    limitRemaining: (n: number) => `Sizda ${n} ta savol yaratish uchun limit qoldi. Iltimos so'ralayotgan miqdorni kamaytiring yoki tarifni oshiring.`,
    featureLocked: "Bu xususiyat joriy tarifingizda mavjud emas. Funksiyani ochish uchun tarifingizni oshiring.",
    limitReached: "Oylik AI limitingiz yetarli emas. Tarifingizni oshiring yoki keyingi oyni kuting.",
    questionsGenerated: (n: number) => `${n} ta savol yaratildi!`,
    networkError: "Tarmoq xatosi. Internetni tekshiring.",
    genericError: "Xatolik yuz berdi.",
    createFirst: "Iltimos, oldin savol yarating.",
    saveBankError: "Bazaga saqlashda xatolik yuz berdi.",
    enterTitleErr: "Iltimos, test nomini kiriting.",
    publishSuccess: "Test muvaffaqiyatli chop qilindi!",
    publishError: "Testni chop qilishda xatolik.",
    premiumFeature: "Premium Xususiyat",
    viewPlans: "Tariflarni ko'rish",
    goBack: "Orqaga qaytish",
    titlePlaceholder: "Masalan: 1-chorak nazorati",
    thinkingTitle: "AI Studiya ishlamoqda",
    thinkingPhrases: ["Ma'lumotlar tahlil qilinmoqda...", "Qoidalar tekshirilmoqda...", "Qiyinlik darajasi moslashtirilmoqda...", "Savollar va javoblar yozilmoqda...", "Formula va chizmalar tekshirilmoqda..."]
  },
  en: {
    headerTitle: "AI Prompt Builder",
    publishBtn: "Publish Test",
    saveToBankBtn: "Save to Bank", 
    savedToBankSuccess: "Questions successfully saved to your bank!",
    topicRequired: "Please choose a topic for the questions.",
    modalTitle: "Name Your Test",
    modalDesc: "Give your newly generated test a clear title before configuring the settings.",
    modalCancel: "Cancel",
    modalNext: "Next Step",
    inputTitle: "Task Description",
    inputDesc: "Describe what kind of questions the AI should create.",
    items: "Items",
    easy: "Easy", medium: "Medium", hard: "Hard",
    placeholder: "E.g., Generate a test on trigonometric equations and inequalities for high school graduates...",
    wordsMore: "{n} more words",
    ready: "Ready",
    generating: "Generating...",
    generateBtn: "Generate Test",
    tips: {
      t1: { title: "Specify Audience", desc: "E.g. \"For 5th graders\", AI adjusts the difficulty accordingly." },
      t2: { title: "Auto-formatting", desc: "All mathematical formulas are cleanly rendered by AI." },
      t3: { title: "Continuous Creation", desc: "Modify the text and press again to append new questions below." }
    },
    resultsTitle: "Generated Questions",
    addMore: "Add More",
    addMoreInstructions: "Modify the text and click 'Generate Test' to append more.", 
    solutionLogic: "Solution Logic",
    hideExp: "Hide",
    showExp: "Explanation",
    promptTooShort: "Please provide a more detailed prompt (at least 5 words).",
    limitRemaining: (n: number) => `You have a limit of ${n} questions left. Please reduce the requested amount or upgrade your plan.`,
    featureLocked: "This feature is not available on your current plan. Upgrade your plan to unlock it.",
    limitReached: "Your monthly AI limit is not enough. Upgrade your plan or wait for next month.",
    questionsGenerated: (n: number) => `${n} questions generated!`,
    networkError: "Network error. Check your internet connection.",
    genericError: "An error occurred.",
    createFirst: "Please generate questions first.",
    saveBankError: "An error occurred while saving to the bank.",
    enterTitleErr: "Please enter a test title.",
    publishSuccess: "Test published successfully!",
    publishError: "Error publishing test.",
    premiumFeature: "Premium Feature",
    viewPlans: "View Plans",
    goBack: "Go Back",
    titlePlaceholder: "e.g., 1st Quarter Assessment",
    thinkingTitle: "AI Studio is working",
    thinkingPhrases: ["Analyzing the data...", "Checking the rules...", "Adjusting difficulty level...", "Writing questions and answers...", "Checking formulas and diagrams..."]
  },
  ru: {
    headerTitle: "AI Промпты",
    publishBtn: "Опубликовать",
    saveToBankBtn: "Сохранить в базу", 
    savedToBankSuccess: "Вопросы успешно сохранены в вашу базу!",
    topicRequired: "Пожалуйста, выберите тему для вопросов.",
    modalTitle: "Назовите свой тест",
    modalDesc: "Дайте вашему новому тесту понятное название перед настройкой.",
    modalCancel: "Отмена",
    modalNext: "Далее",
    inputTitle: "Описание задачи",
    inputDesc: "Опишите, какие вопросы должен создать ИИ.",
    items: "Вопр.",
    easy: "Легкий", medium: "Средний", hard: "Сложный",
    placeholder: "Например, Создай тест по тригонометрическим уравнениям для абитуриентов...",
    wordsMore: "Еще {n} слов",
    ready: "Готово",
    generating: "Создание...",
    generateBtn: "Создать Тест",
    tips: {
      t1: { title: "Укажите аудиторию", desc: "Например, \"Для 5 класса\", ИИ адаптирует вопросы." },
      t2: { title: "Авто-формат", desc: "Все математические формулы чисто рендерятся ИИ." },
      t3: { title: "Непрерывно", desc: "Измените текст и нажмите снова, чтобы добавить новые вопросы." }
    },
    resultsTitle: "Сгенерированные",
    addMore: "Добавить",
    addMoreInstructions: "Измените текст и нажмите 'Создать Тест', чтобы добавить еще.", 
    solutionLogic: "Логика решения",
    hideExp: "Скрыть",
    showExp: "Решение",
    promptTooShort: "Пожалуйста, напишите более подробный запрос (минимум 5 слов).",
    limitRemaining: (n: number) => `У вас остался лимит на ${n} вопросов. Пожалуйста, уменьшите запрашиваемое количество или повысьте тариф.`,
    featureLocked: "Эта функция недоступна на вашем текущем тарифе. Повысьте тариф, чтобы открыть её.",
    limitReached: "Вашего месячного лимита ИИ недостаточно. Повысьте тариф или дождитесь следующего месяца.",
    questionsGenerated: (n: number) => `Создано вопросов: ${n}!`,
    networkError: "Ошибка сети. Проверьте интернет-соединение.",
    genericError: "Произошла ошибка.",
    createFirst: "Пожалуйста, сначала создайте вопросы.",
    saveBankError: "Произошла ошибка при сохранении в базу.",
    enterTitleErr: "Пожалуйста, введите название теста.",
    publishSuccess: "Тест успешно опубликован!",
    publishError: "Ошибка при публикации теста.",
    premiumFeature: "Премиум функция",
    viewPlans: "Посмотреть тарифы",
    goBack: "Вернуться назад",
    titlePlaceholder: "Например: Контрольная за 1 четверть",
    thinkingTitle: "ИИ Студия работает",
    thinkingPhrases: ["Анализ данных...", "Проверка правил...", "Настройка уровня сложности...", "Составление вопросов и ответов...", "Проверка формул и диаграмм..."]
  }
};

interface AIQuestion {
  id: string;
  uiDifficulty: string;
  question: { uz: string; ru: string; en: string };
  options: { A: { uz: string; ru: string; en: string }; B: { uz: string; ru: string; en: string }; C: { uz: string; ru: string; en: string }; D: { uz: string; ru: string; en: string }; };
  answer: string;
  explanation: { uz: string; ru: string; en: string };
  difficultyId: number;
}

/* ─── topic taxonomy ────────────────────────────────────────────────────────
 * An LLM cannot pick a topic from data/question_topics.json, so the teacher does
 * it in TopicAssignModal before anything is written. `toQuestionV1()` throws
 * InvalidTopicError on any other path — the old `subject: "by_prompt"` placeholder
 * is gone for good. */

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

const AiThinkingModal = ({ isVisible, t }: { isVisible: boolean, t: any }) => {
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
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-[320px] md:max-w-md bg-surface-container-low rounded-m3-xl shadow-elev-3 p-6 md:p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-[color-mix(in_oklab,var(--m3-primary)_20%,transparent)] rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-[color-mix(in_oklab,var(--m3-tertiary)_20%,transparent)] rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-6 md:mb-8 mt-2 md:mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-primary to-tertiary rounded-full blur-xl opacity-40" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-surface-container-lowest rounded-m3-lg flex items-center justify-center shadow-elev-3">
                <Bot size={36} className="text-primary animate-bounce md:w-11 md:h-11" style={{ animationDuration: "2s" }} />
                <Sparkles size={16} className="absolute -top-2 -right-2 text-warning animate-pulse md:w-5 md:h-5 md:-top-3 md:-right-3" />
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-black text-on-surface mb-1 md:mb-2 relative z-10 tracking-tight text-center">{t.thinkingTitle}</h3>
            <div className="h-5 md:h-6 relative z-10 overflow-hidden flex items-center justify-center w-full">
              <motion.p key={phraseIndex} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className="text-[12px] md:text-[14px] font-medium text-on-surface-variant absolute text-center w-full">{phrases[phraseIndex]}</motion.p>
            </div>
            <div className="w-[80%] h-1 md:h-1.5 bg-surface-container-high rounded-full mt-6 md:mt-8 overflow-hidden relative z-10">
              <motion.div className="h-full bg-gradient-to-r from-primary via-tertiary to-primary rounded-full w-[200%]" animate={{ x: ["-50%", "0%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const FormattedText = ({ text }: { text: any }) => {
  if (!text) return null;
  let content = typeof text === 'string' ? text : JSON.stringify(text);
  const hasMathCommands = /\\frac|\\pi|\\sin|\\cos|\\tan|\\ge|\\le|\\cup|\\cap|\\in|\\begin|\\sqrt|\\empty/.test(content);
  if (!content.includes('$') && hasMathCommands) content = `$${content}$`;
  content = content.replace(/\\\((.*?)\\\)/g, '$$$1$$').replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$').replace(/&nbsp;/g, ' ').replace(/\\\\/g, '\\');                 
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="leading-relaxed break-words">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-2 md:my-3 text-center overflow-x-auto custom-scrollbar" />;
          } catch (e) { return <span key={index} className="text-error font-mono text-[11px] md:text-[13px] bg-error-container px-1 rounded-m3-xs">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) { return <span key={index} className="text-error font-mono text-[11px] md:text-[13px] bg-error-container px-1 rounded-m3-xs">{part}</span>; }
        }
        return <span key={index}>{part.split('\n').map((line, i, arr) => (<span key={i}>{line}{i < arr.length - 1 && <br />}</span>))}</span>;
      })}
    </span>
  );
};

const AIQuestionCard = ({ q, idx, onRemove, t }: { q: any, idx: number, onRemove: (id: string) => void, t: any }) => {
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
    <div className="bg-surface-container-low p-3.5 md:p-5 rounded-m3-lg shadow-elev-1 hover:shadow-elev-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group">
      <div className="flex justify-between items-center gap-2 mb-3 md:mb-5 md:pb-4 md:border-b border-outline-variant">
        <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
          <span className="bg-primary-container text-on-primary-container text-[9px] md:text-[11px] font-black px-2 md:px-3 py-1 md:py-1.5 rounded-m3-xs md:rounded-m3-sm uppercase tracking-widest flex items-center gap-1 md:gap-1.5 shrink-0">
            Q{idx + 1}
          </span>
          <span className="bg-surface-container-high text-on-surface-variant text-[9px] md:text-[11px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-m3-xs md:rounded-m3-sm uppercase tracking-tight flex items-center max-w-full min-w-0">
             <span className="truncate">AI Prompt</span>
          </span>
          <span className="hidden sm:inline-flex bg-secondary text-on-secondary text-[10px] md:text-[11px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-m3-xs md:rounded-m3-sm uppercase tracking-widest shrink-0">
            {q.uiDifficulty}
          </span>
        </div>
        <div className="flex items-center bg-surface-container md:bg-transparent border border-outline-variant md:border-transparent rounded-m3-sm md:rounded-none p-0.5 md:p-0 shrink-0">
          <button onClick={() => setShowOptions(!showOptions)} className="m3-interactive text-on-surface-variant hover:text-on-surface hover:bg-state-hover p-1 md:p-2 rounded-m3-sm transition-colors"><Eye size={14} className="md:w-[18px] md:h-[18px]" /></button>
          {getText(q.explanation).trim().length > 0 && (
            <>
              <div className="w-px h-3 md:h-5 bg-outline-variant mx-0.5 md:mx-1"></div>
              <button onClick={() => setShowExplanation(!showExplanation)} className={`m3-interactive p-1 md:p-2 rounded-m3-sm transition-colors ${showExplanation ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-primary hover:bg-state-hover'}`}><BookOpen size={14} className="md:w-[18px] md:h-[18px]" /></button>
            </>
          )}
          <div className="w-px h-3 md:h-5 bg-outline-variant mx-0.5 md:mx-1"></div>
          <button onClick={() => onRemove(q.id)} className="m3-interactive text-on-surface-variant hover:text-error hover:bg-error-container p-1 md:p-2 rounded-m3-sm transition-colors"><Trash2 size={14} className="md:w-[18px] md:h-[18px]" /></button>
        </div>
      </div>
      <div className="font-semibold text-[12px] md:text-[15.5px] text-on-surface mb-3 md:mb-6 leading-snug md:leading-relaxed"><FormattedText text={getText(q.question)} /></div>
      {showOptions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3 mb-1">
          {Object.entries(q.options).map(([key, value]) => {
            const isCorrect = q.answer === key;
            return (
              <div key={key} className={`flex items-start p-2 md:p-3.5 rounded-m3-md border transition-all ${isCorrect ? 'bg-success-container border-transparent shadow-elev-1' : 'bg-surface-container-lowest border-outline-variant hover:border-outline'}`}>
                <div className={`w-5 h-5 md:w-7 md:h-7 rounded-m3-xs md:rounded-m3-sm flex items-center justify-center text-[10px] md:text-[12px] font-black mr-2 md:mr-3 shrink-0 transition-colors ${isCorrect ? 'bg-success text-surface-container-lowest' : 'bg-surface-container-high text-on-surface-variant'}`}>{key}</div>
                <div className={`text-[11px] md:text-[14.5px] font-medium pt-0.5 break-words overflow-hidden ${isCorrect ? 'text-on-success-container' : 'text-on-surface'}`}><FormattedText text={getText(value)} /></div>
              </div>
            );
          })}
        </div>
      )}
      {showExplanation && getText(q.explanation).trim().length > 0 && (
        <div className="bg-tertiary-container p-2.5 md:p-4.5 rounded-m3-md mt-2 md:mt-3 animate-in fade-in slide-in-from-top-2">
          <p className="text-[9px] md:text-[11px] font-black text-on-tertiary-container uppercase tracking-widest mb-1 md:mb-2 flex items-center gap-1 md:gap-1.5"><Sparkles size={10} className="md:w-[14px] md:h-[14px]" /> {t.solutionLogic}</p>
          <div className="text-[11px] md:text-[14px] text-on-tertiary-container leading-relaxed font-medium"><SolutionSteps text={getText(q.explanation)} render={(part) => <FormattedText text={part} />} /></div>
        </div>
      )}
    </div>
  );
};

export default function AIUserInputPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const { lang } = useTeacherLanguage();
  const t = PAGE_TRANSLATIONS[lang] || PAGE_TRANSLATIONS['en'];

  const bottomRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // 🟢 NEW: Fetching the monthly limits instead of daily
  const aiData = useMonthlyLimit(); 

  const [testTitle, setTestTitle] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([]);
  
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicIntent, setTopicIntent] = useState<"bank" | "publish">("bank");
  const [topicPaths, setTopicPaths] = useState<TopicPath[]>([]);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState(""); // 🟢 NEW STATE

  const wordCount = userPrompt.trim() ? userPrompt.trim().split(/\s+/).length : 0;
  const wordsNeeded = Math.max(0, 5 - wordCount);

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedQuestions, isGenerating]);

  const removeQuestion = (idToDelete: string) => setGeneratedQuestions(prev => prev.filter(q => q.id !== idToDelete));

  const handleScrollToPrompt = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(t.addMoreInstructions, { icon: "💡", duration: 4000 }); 
    setTimeout(() => { promptInputRef.current?.focus(); }, 500);
  };

  // --- GENERATE API CALL ---
  const handleGenerate = async () => {
    if (wordCount < 5) return toast.error(t.promptTooShort);

    // 🟢 NEW: Pre-check monthly limits
    if (!aiData.isUnlimited && aiData.remaining < count) {
      setLimitModalMessage(t.limitRemaining(aiData.remaining));
      setIsLimitModalOpen(true);
      return; 
    }
    
    setIsGenerating(true);

    try {
      const response = await fetch("/teacher/create/by_user_input/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid, 
          promptText: userPrompt,
          difficulty: difficulty,
          count: count,
          language: "uz"
        }),
      });

      const data = await response.json();
      
      // 🟢 NEW: Gatekeeper error handling
      if (!response.ok) {
        if (data.code === 'FEATURE_LOCKED') {
          setLimitModalMessage(t.featureLocked);
          setIsLimitModalOpen(true);
          return;
        }
        if (data.code === 'LIMIT_REACHED') {
          setLimitModalMessage(t.limitReached);
          setIsLimitModalOpen(true);
          return;
        }
        throw new Error(data.error);
      }

      const diffLower = difficulty.toLowerCase();
      const diffVal = diffLower === "easy" ? 1 : diffLower === "medium" ? 2 : 3;

      // No taxonomy here on purpose: the teacher assigns it in TopicAssignModal at save time.
      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        ...q,
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        difficultyId: diffVal, uiDifficulty: difficulty,
        explanation: typeof q.explanation === 'string' ? { uz: q.explanation } : (q.explanation || { uz: "" }),
      }));

      setGeneratedQuestions(prev => [...prev, ...enrichedQuestions]);
      toast.success(t.questionsGenerated(count));

    } catch (error: any) {
      if (error.message.includes("fetch failed") || error.message.includes("ENOTFOUND")) {
        toast.error(t.networkError);
      } else {
        toast.error(error.message || t.genericError);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // --- TOPIC GATE (runs before BOTH save paths) ---
  const openTopicModal = (intent: "bank" | "publish") => {
    if (generatedQuestions.length === 0) return toast.error(t.createFirst);
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
    toast.error(t.topicRequired);
    setTopicIntent(intent);
    setIsTopicModalOpen(true);
  };

  // --- SAVE TO BANK LOGIC ---
  const handleSaveToBank = async (paths: TopicPath[]) => {
    if (generatedQuestions.length === 0) return toast.error(t.createFirst);
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
            tags: ["ai_generated", "custom_prompt"], language: ["uz", "ru", "en"], solutions: [],
          },
          {
            id,
            creatorId: user.uid,
            creatorName: user.displayName || "Teacher",
            creationMethod: "ai_prompt",
            status: "published",
            aiModel: aiModelFor('questions'),
            timestamp: serverTimestamp(),
          },
        );
        batch.set(doc(db, "teacher_questions", id), v1);
      });

      await batch.commit();
      setIsTopicModalOpen(false);
      toast.success(t.savedToBankSuccess);
      router.push('/teacher/create/my_questions');
    } catch (error) {
      if (error instanceof InvalidTopicError) {
        onInvalidTopic("bank");
        return;
      }
      console.error("Save to bank error:", error);
      toast.error(t.saveBankError);
    } finally {
      setIsSavingToBank(false);
    }
  };

  // --- PUBLISH LOGIC ---
  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error(t.enterTitleErr);
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
          tags: ["ai_generated", "custom_prompt"], language: ["uz", "ru", "en"], solutions: [],
        };
        const meta = {
          id,
          creatorId: user.uid,
          creatorName: user.displayName || "Teacher",
          creationMethod: "ai_prompt" as const,
          status: "published" as const,
          aiModel: aiModelFor('questions'),
        };

        batch.set(doc(db, "teacher_questions", id), toQuestionV1(source, { ...meta, timestamp: serverTimestamp() }));
        // The embedded snapshot needs a CONCRETE time: Firestore rejects serverTimestamp() sentinels inside arrays.
        finalQuestionsToSave.push(toQuestionV1(source, { ...meta, timestamp: Timestamp.now() }));
      });

      batch.set(doc(collection(db, "custom_tests")), {
        teacherId: user.uid, teacherName: user.displayName || "Teacher", title: testTitle, track: "by_prompt",
        subjectName: sharedName(topicPaths, "subjectName"), topicName: sharedName(topicPaths, "topicName"),
        chapterName: "", subtopicName: sharedName(topicPaths, "subtopicName"),
        questions: finalQuestionsToSave, duration: testSettings.duration, shuffle: testSettings.shuffleQuestions, resultsVisibility: testSettings.resultsVisibility, accessCode: testSettings.accessCode, status: "active", createdAt: serverTimestamp(), questionCount: finalQuestionsToSave.length,
      });

      await batch.commit();
      toast.success(t.publishSuccess);
      setIsConfigModalOpen(false);
      router.push("/teacher/library/tests");
    } catch (error) {
      if (error instanceof InvalidTopicError) {
        setIsConfigModalOpen(false);
        onInvalidTopic("publish");
        return;
      }
      toast.error(t.publishError);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface font-t-body pt-[60px] lg:pt-0">

      <AiThinkingModal isVisible={isGenerating} t={t} />

      {/* 🟢 TOP BAR (Mobile Offset) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-[60px] bg-[color-mix(in_oklab,var(--m3-surface)_90%,transparent)] backdrop-blur-xl border-b border-outline-variant z-[10000] flex items-center justify-between px-3 shadow-elev-1">
        <button onClick={() => router.push('/teacher/create')} className="m3-interactive p-2 -ml-1 text-on-surface-variant rounded-m3-sm"><ArrowLeft size={18} /></button>
        <span className="font-black text-on-surface text-[14px]">{t.headerTitle}</span>
        <div className="w-8"></div>
      </div>

      {/* 🟢 NEW: Premium Limitation Warning Modal */}
      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-surface-container-low rounded-m3-xl p-6 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-elev-3 z-10 flex flex-col items-center text-center">
              <button onClick={() => setIsLimitModalOpen(false)} className="m3-interactive absolute top-3 right-3 md:top-4 md:right-4 p-2 text-on-surface-variant hover:text-on-surface hover:bg-state-hover rounded-full transition-colors"><X size={18} className="md:w-5 md:h-5" /></button>

              <div className="w-14 h-14 md:w-16 md:h-16 bg-primary-container rounded-m3-md flex items-center justify-center mb-4">
                <Crown size={28} className="text-warning" />
              </div>

              <h3 className="text-lg md:text-xl font-black text-on-surface mb-2">{t.premiumFeature}</h3>
              <p className="text-[13px] md:text-[14px] text-on-surface-variant mb-6 font-medium leading-relaxed">
                {limitModalMessage}
              </p>

              <div className="w-full flex flex-col gap-2">
                <Button variant="filled" size="lg" className="w-full" onClick={() => router.push('/teacher/subscription')}>
                  {t.viewPlans} <ArrowLeft className="rotate-180" />
                </Button>
                <Button variant="outlined" size="lg" className="w-full" onClick={() => setIsLimitModalOpen(false)}>
                  {t.goBack}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-surface-container-low rounded-m3-xl p-5 md:p-8 w-full max-w-[320px] md:max-w-md shadow-elev-3 z-10">
              <h3 className="text-lg md:text-xl font-black text-on-surface mb-1.5 md:mb-2">{t.modalTitle}</h3>
              <p className="text-[12px] md:text-[14px] text-on-surface-variant mb-5 md:mb-6 font-medium">{t.modalDesc}</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder={t.titlePlaceholder} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-surface-container border border-outline-variant rounded-m3-md text-[13px] md:text-[14px] font-bold text-on-surface outline-none focus:bg-surface-container-lowest focus:border-primary transition-all mb-6 md:mb-8" autoFocus/>
              <div className="flex gap-2 md:gap-3 justify-end">
                <Button variant="outlined" onClick={() => setIsTitleModalOpen(false)}>{t.modalCancel}</Button>
                <Button variant="filled" onClick={handleTitleSubmit}>{t.modalNext} <ChevronRight size={16} strokeWidth={3}/></Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TopicAssignModal
        open={isTopicModalOpen}
        questions={generatedQuestions.map(q => getPlainText(q.question))}
        isSaving={isSavingToBank}
        onClose={() => setIsTopicModalOpen(false)}
        onConfirm={handleTopicConfirm}
      />

      {mounted && createPortal(
        <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={generatedQuestions.length} testTitle={testTitle} isSaving={isPublishing} />,
        document.body
      )}

      {/* 🟢 TOP BAR (Desktop) */}
      <div className="hidden lg:flex bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-md border-b border-outline-variant t-page-bar sticky top-0 z-30 shadow-elev-1">
        <div className="max-w-4xl w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/teacher/create')} className="m3-interactive p-2 -ml-2 text-on-surface-variant hover:text-on-surface bg-surface-container hover:bg-state-hover rounded-m3-sm transition-colors">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-[16px] font-bold text-on-surface tracking-tight flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> {t.headerTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* 🟢 NEW: Using Monthly Limit Card */}
            <AiMonthlyLimitCard aiData={aiData} />

            <Button
              variant="outlined"
              size="sm"
              icon={<Database size={16} />}
              loading={isSavingToBank}
              onClick={() => openTopicModal("bank")}
              disabled={isPublishing || isGenerating || generatedQuestions.length === 0}
            >
              {t.saveToBankBtn}
            </Button>

            <Button
              variant="tonal"
              size="sm"
              icon={<CheckCircle2 size={16} />}
              onClick={() => openTopicModal("publish")}
              disabled={isPublishing || isGenerating || generatedQuestions.length === 0}
            >
              {t.publishBtn}
            </Button>
          </div>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT */}
      <div className="max-w-4xl w-full mx-auto px-3 md:px-4 mt-4 md:mt-8 pb-32">
        
        {/* HERO PROMPT AREA */}
        <div className="bg-surface-container-low rounded-m3-lg shadow-elev-1 p-4 md:p-8 mb-5 md:mb-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-container rounded-full blur-3xl pointer-events-none"></div>

          <div className="mb-3 md:mb-4 relative z-10 px-1 md:px-0">
            <h2 className="text-[14px] md:text-[18px] font-black text-on-surface tracking-tight">{t.inputTitle}</h2>
            <p className="text-[10px] md:text-[13px] font-medium text-on-surface-variant mt-0.5 md:mt-1">{t.inputDesc}</p>
          </div>

          <div className="relative z-10 bg-surface-container border border-outline-variant rounded-m3-md p-1.5 md:p-2 mb-3 md:mb-4">
             <textarea 
               ref={promptInputRef}
               value={userPrompt}
               onChange={e => setUserPrompt(e.target.value)}
               placeholder={t.placeholder}
               maxLength={1500} 
               className="w-full min-h-[90px] md:min-h-[120px] p-2.5 md:p-3 bg-transparent text-[12px] md:text-[15px] font-medium text-on-surface outline-none resize-none placeholder:text-on-surface-variant custom-scrollbar"
             />
          </div>

          {/* CONTROLS (Compact Row on Mobile) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 md:gap-4 relative z-10 px-1 md:px-0">
            
            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
              <div className="flex items-center bg-surface-container-high p-1 rounded-m3-sm flex-1 sm:flex-none justify-between h-[36px] md:h-[42px]">
                <button onClick={() => setCount(prev => Math.max(1, prev - 1))} className="m3-interactive w-8 md:w-10 h-full flex items-center justify-center rounded-m3-xs text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface transition-all disabled:text-disabled-fg" disabled={count <= 1}>
                  <Minus size={14} className="md:w-4 md:h-4" strokeWidth={2.5} />
                </button>
                <div className="w-8 md:w-10 text-center flex flex-col justify-center">
                  <span className="text-[12px] md:text-[14px] font-black text-on-surface leading-none">{count}</span>
                </div>
                {/* 🟢 NEW: Disable Plus button if count exceeds monthly limit */}
                <button
                  onClick={() => setCount(prev => Math.min(15, aiData?.isUnlimited ? 15 : (aiData?.remaining ?? 15), prev + 1))}
                  className="m3-interactive w-8 md:w-10 h-full flex items-center justify-center rounded-m3-xs text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface transition-all disabled:text-disabled-fg"
                  disabled={count >= 15 || (!aiData?.isUnlimited && count >= (aiData?.remaining ?? 15))}
                >
                  <Plus size={14} className="md:w-4 md:h-4" strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex bg-surface-container-high p-1 rounded-m3-sm flex-1 sm:flex-none h-[36px] md:h-[42px]">
                <button onClick={() => setDifficulty('Easy')} className={`flex-1 sm:flex-none px-2 md:px-3 text-[10px] md:text-[12px] font-bold rounded-m3-xs transition-all ${difficulty === 'Easy' ? 'bg-surface-container-lowest text-success shadow-elev-1' : 'text-on-surface-variant hover:text-on-surface'}`}>{t.easy}</button>
                <button onClick={() => setDifficulty('Medium')} className={`flex-1 sm:flex-none px-2 md:px-3 text-[10px] md:text-[12px] font-bold rounded-m3-xs transition-all ${difficulty === 'Medium' ? 'bg-surface-container-lowest text-primary shadow-elev-1' : 'text-on-surface-variant hover:text-on-surface'}`}>{t.medium}</button>
                <button onClick={() => setDifficulty('Hard')} className={`flex-1 sm:flex-none px-2 md:px-3 text-[10px] md:text-[12px] font-bold rounded-m3-xs transition-all ${difficulty === 'Hard' ? 'bg-surface-container-lowest text-error shadow-elev-1' : 'text-on-surface-variant hover:text-on-surface'}`}>{t.hard}</button>
              </div>
            </div>

            <Button
              variant="filled"
              className="w-full sm:w-auto"
              onClick={handleGenerate}
              loading={isGenerating}
              disabled={wordsNeeded > 0}
              icon={<Wand2 />}
            >
              {wordsNeeded > 0 ? t.wordsMore.replace('{n}', wordsNeeded.toString()) : (isGenerating ? t.generating : t.generateBtn)}
            </Button>

          </div>
        </div>

        {/* 🟢 HORIZONTAL SCROLLING TIPS */}
        <div className="flex flex-nowrap md:grid md:grid-cols-3 gap-2.5 md:gap-4 mb-6 md:mb-8 overflow-x-auto snap-x snap-mandatory custom-scrollbar pb-3 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0">
          <div className="bg-surface-container-low p-3 md:p-5 rounded-m3-md md:rounded-m3-lg flex items-start gap-2 md:gap-3 shadow-elev-1 w-[75vw] md:w-auto shrink-0 snap-center">
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-m3-sm md:rounded-m3-md bg-primary-container text-on-primary-container flex items-center justify-center shrink-0"><Target size={16} className="md:w-5 md:h-5" /></div>
             <div>
               <h3 className="text-[11px] md:text-[14px] font-bold text-on-surface mb-0.5 md:mb-1">{t.tips.t1.title}</h3>
               <p className="text-[9px] md:text-[12px] text-on-surface-variant font-medium leading-relaxed">{t.tips.t1.desc}</p>
             </div>
          </div>
          <div className="bg-surface-container-low p-3 md:p-5 rounded-m3-md md:rounded-m3-lg flex items-start gap-2 md:gap-3 shadow-elev-1 w-[75vw] md:w-auto shrink-0 snap-center">
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-m3-sm md:rounded-m3-md bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"><Zap size={16} className="md:w-5 md:h-5" /></div>
             <div>
               <h3 className="text-[11px] md:text-[14px] font-bold text-on-surface mb-0.5 md:mb-1">{t.tips.t2.title}</h3>
               <p className="text-[9px] md:text-[12px] text-on-surface-variant font-medium leading-relaxed">{t.tips.t2.desc}</p>
             </div>
          </div>
          <div className="bg-surface-container-low p-3 md:p-5 rounded-m3-md md:rounded-m3-lg flex items-start gap-2 md:gap-3 shadow-elev-1 w-[75vw] md:w-auto shrink-0 snap-center">
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-m3-sm md:rounded-m3-md bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0"><Layers size={16} className="md:w-5 md:h-5" /></div>
             <div>
               <h3 className="text-[11px] md:text-[14px] font-bold text-on-surface mb-0.5 md:mb-1">{t.tips.t3.title}</h3>
               <p className="text-[9px] md:text-[12px] text-on-surface-variant font-medium leading-relaxed">{t.tips.t3.desc}</p>
             </div>
          </div>
        </div>

        {/* RESULTS */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-3.5 md:space-y-5">
            <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-1.5 md:gap-2">
                 <Layers size={14} className="text-on-surface-variant md:w-4 md:h-4" />
                 <h2 className="text-[10px] md:text-sm font-bold text-on-surface-variant uppercase tracking-widest">
                   {t.resultsTitle} ({generatedQuestions.length})
                 </h2>
               </div>
            </div>
            
            {generatedQuestions.map((q, idx) => (
              <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} t={t} />
            ))}

            {!isGenerating && (
              <div className="pt-4 md:pt-6 flex justify-center animate-in fade-in duration-500">
                <button onClick={handleScrollToPrompt} className="m3-interactive px-5 py-2.5 md:px-6 md:py-3.5 bg-transparent border-2 border-dashed border-outline text-[11px] md:text-[14px] text-on-surface-variant font-bold rounded-m3-md hover:border-primary hover:text-primary hover:bg-state-hover transition-all flex items-center gap-1.5 md:gap-2">
                  <Plus size={14} className="md:w-[18px] md:h-[18px]" /> {t.addMore}
                </button>
              </div>
            )}

            <div ref={bottomRef} className="h-8" />
          </div>
        )}

      </div>

      {/* 🟢 MOBILE FLOATING ACTIONS */}
      {mounted && generatedQuestions.length > 0 && createPortal(
        <div className="lg:hidden fixed bottom-5 left-0 right-0 px-3 flex justify-between gap-2 z-[100] animate-in slide-in-from-bottom-10">
          <Button
            variant="elevated"
            className="flex-1 shadow-elev-2"
            onClick={() => openTopicModal("bank")}
            loading={isSavingToBank}
            disabled={isPublishing || isGenerating}
            icon={<Database size={14} />}
          >
            {t.saveToBankBtn}
          </Button>

          <Button
            variant="tonal"
            className="flex-1 shadow-elev-2"
            onClick={() => openTopicModal("publish")}
            loading={isPublishing}
            disabled={isSavingToBank || isGenerating}
            icon={<CheckCircle2 size={14} />}
          >
            {t.publishBtn}
          </Button>
        </div>,
        document.body
      )}

    </div>
  );
}