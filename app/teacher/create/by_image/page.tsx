"use client";

import { useState, useRef, useEffect, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Wand2, CheckCircle2, Trash2, EyeOff, Eye, BookOpen, Layers, Minus, Plus, UploadCloud, Image as ImageIcon, X, Bot, Zap, Lightbulb, Database, Crown } from "lucide-react";
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

import { useTeacherLanguage } from "@/app/teacher/layout"; 
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";
import TopicAssignModal from "@/app/teacher/create/_components/TopicAssignModal";

// 🟢 NEW AI MONTHLY LIMIT BLOCK START
import { useMonthlyLimit } from "@/hooks/useMonthlyLimit";
import AiMonthlyLimitCard from "@/app/teacher/create/_components/AiMonthlyLimitCard"; 
// 🔴 NEW AI MONTHLY LIMIT BLOCK END

import imageCompression from 'browser-image-compression';

import { Button, IconButton, Spinner } from "@/components/ui";

import SolutionSteps from "@/components/SolutionSteps";
// --- TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    headerTitle: "Rasm orqali yaratish",
    publishBtn: "Chop Qilish",
    saveToBankBtn: "Bazaga Saqlash",
    savedToBankSuccess: "Savollar bazangizga muvaffaqiyatli saqlandi!",
    topicRequired: "Iltimos, savollar uchun mavzu tanlang.",
    modalTitle: "Test nomini kiriting",
    modalDesc: "Yangi yaratilgan testni saqlash va sozlashdan oldin unga nom bering.",
    modalCancel: "Bekor qilish",
    modalNext: "Keyingi qadam",
    uploadTitle: "Rasmni yuklang",
    uploadDesc: "Darslik yoki test qog'ozining rasmini yuklang (Maksimal 2 ta).",
    howItWorksTitle: "Qanday ishlaydi?",
    howItWorksDesc: "Darslikdagi biror mavzu yoki savolni rasmga oling. AI xuddi shunga o'xshash yangi testlar yaratib beradi.",
    dragDrop: "Rasmni shu yerga tashlang yoki bosing",
    optionalPrompt: "Qo'shimcha ko'rsatma (Ixtiyoriy)",
    placeholder: "Masalan: Shu rasmning mavzusi bo'yicha sal qiyinroq savollar tuzing...",
    items: "Savol",
    easy: "Oson", medium: "O'rta", hard: "Qiyin",
    generating: "Yaratilmoqda...",
    generateBtn: "Test Yaratish",
    resultsTitle: "Tayyorlangan Savollar",
    addMore: "Yana savol qo'shish",
    addMoreInstructions: "Yangi rasm yuklang yoki joriysidan foydalanib 'Test Yaratish' tugmasini bosing.",
    solutionLogic: "Yechim Mantiqi",
    hideExp: "Yechimni yashirish",
    showExp: "Yechimni ko'rish",
    invalidImageError: "Iltimos, faqat ta'limga oid rasmlarni yuklang.",
    maxImagesError: "Maksimal 2 ta rasm yuklash mumkin.",
    invalidImageFiles: "Iltimos, faqat rasm fayllarini yuklang.",
    imageCompressError: "Rasmni yuklashda xatolik yuz berdi.",
    uploadAtLeastOne: "Iltimos, kamida 1 ta rasm yuklang.",
    limitRemaining: (n: number) => `Sizda ${n} ta savol yaratish uchun limit qoldi. Iltimos so'ralayotgan miqdorni kamaytiring yoki tarifni oshiring.`,
    featureLockedImage: "Rasm orqali test yaratish faqat Pro va VIP tariflarida mavjud. Funksiyani ochish uchun tarifingizni oshiring.",
    limitReached: "Oylik AI limitingiz yetarli emas. Tarifingizni oshiring yoki keyingi oyni kuting.",
    questionsGenerated: (n: number) => `${n} ta savol yaratildi!`,
    networkError: "Tarmoq xatosi. Internetni tekshiring.",
    genericError: "Xatolik yuz berdi.",
    createFirst: "Iltimos, oldin savol yarating.",
    saveBankError: "Bazaga saqlashda xatolik yuz berdi.",
    publishSuccess: "Test muvaffaqiyatli chop qilindi!",
    publishError: "Testni chop qilishda xatolik.",
    enterTitle: "Nom kiriting",
    premiumFeature: "Premium Xususiyat",
    viewPlans: "Tariflarni ko'rish",
    goBack: "Orqaga qaytish",
    titlePlaceholder: "Masalan: Algebra imtihoni",
    countLabel: "Savollar",
    difficultyLabel: "Qiyinligi",
    optimizingImage: "Rasm optimallashtirilmoqda...",
    monthlyLeft: (n: number) => ({ prefix: "Sizda oylik limitdan", bold: `${n} ta`, suffix: "savol qoldi." }),
    thinkingTitle: "AI Studiya ishlamoqda",
    thinkingPhrases: ["Rasmlar o'qilmoqda...", "Konteks tahlil qilinmoqda...", "Formula va chizmalar aniqlanmoqda...", "Savollar va javoblar tuzilmoqda...", "Qiyinlik darajasi moslashtirilmoqda..."]
  },
  en: {
    headerTitle: "Create via Image",
    publishBtn: "Publish Test",
    saveToBankBtn: "Save to Bank",
    savedToBankSuccess: "Questions successfully saved to your bank!",
    topicRequired: "Please choose a topic for the questions.",
    modalTitle: "Name Your Test",
    modalDesc: "Give your newly generated test a clear title before configuring the settings.",
    modalCancel: "Cancel",
    modalNext: "Next Step",
    uploadTitle: "Upload Material",
    uploadDesc: "Upload a photo of a textbook, worksheet, or exam paper (Max 2).",
    howItWorksTitle: "How it works:",
    howItWorksDesc: "Take a photo of a topic or a specific question. The AI will generate new, similar questions.",
    dragDrop: "Drag and drop images here or click",
    optionalPrompt: "Additional Instructions (Optional)",
    placeholder: "E.g., Generate slightly harder questions based on this image's topic...",
    items: "Items",
    easy: "Easy", medium: "Medium", hard: "Hard",
    generating: "Generating...",
    generateBtn: "Generate Test",
    resultsTitle: "Generated Questions",
    addMore: "Add More Questions",
    addMoreInstructions: "Upload a new photo or use the current one, then click 'Generate Test'.",
    solutionLogic: "Solution Logic",
    hideExp: "Hide Explanation",
    showExp: "Show Explanation",
    invalidImageError: "Please upload an image related to education.",
    maxImagesError: "You can upload a maximum of 2 images.",
    invalidImageFiles: "Please upload valid image files.",
    imageCompressError: "Failed to process the image.",
    uploadAtLeastOne: "Please upload at least 1 image.",
    limitRemaining: (n: number) => `You have a limit of ${n} questions left. Please reduce the requested amount or upgrade your plan.`,
    featureLockedImage: "Creating tests via image is only available on Pro and VIP plans. Upgrade your plan to unlock this feature.",
    limitReached: "Your monthly AI limit is not enough. Upgrade your plan or wait for next month.",
    questionsGenerated: (n: number) => `${n} questions generated!`,
    networkError: "Network error. Check your internet connection.",
    genericError: "An error occurred.",
    createFirst: "Please generate questions first.",
    saveBankError: "An error occurred while saving to the bank.",
    publishSuccess: "Test published successfully!",
    publishError: "Error publishing test.",
    enterTitle: "Enter a title",
    premiumFeature: "Premium Feature",
    viewPlans: "View Plans",
    goBack: "Go Back",
    titlePlaceholder: "e.g., Algebra Exam",
    countLabel: "Questions",
    difficultyLabel: "Difficulty",
    optimizingImage: "Optimizing image...",
    monthlyLeft: (n: number) => ({ prefix: "You have", bold: `${n}`, suffix: "questions left from your monthly limit." }),
    thinkingTitle: "AI Studio is working",
    thinkingPhrases: ["Reading images...", "Analyzing context...", "Detecting formulas and diagrams...", "Writing questions and answers...", "Adjusting difficulty level..."]
  },
  ru: {
    headerTitle: "Создать по фото",
    publishBtn: "Опубликовать",
    saveToBankBtn: "Сохранить в базу",
    savedToBankSuccess: "Вопросы успешно сохранены в вашу базу!",
    topicRequired: "Пожалуйста, выберите тему для вопросов.",
    modalTitle: "Назовите свой тест",
    modalDesc: "Дайте вашему новому тесту понятное название перед настройкой.",
    modalCancel: "Отмена",
    modalNext: "Следующий Шаг",
    uploadTitle: "Загрузите материал",
    uploadDesc: "Загрузите фото учебника, рабочего листа или экзамена (Макс. 2).",
    howItWorksTitle: "Как это работает:",
    howItWorksDesc: "Сфотографируйте тему или вопрос. ИИ создаст новые похожие вопросы по этой теме.",
    dragDrop: "Перетащите изображения сюда или нажмите",
    optionalPrompt: "Дополнительные инструкции (необязательно)",
    placeholder: "Например, Создай вопросы немного сложнее...",
    items: "Вопр.",
    easy: "Легкий", medium: "Средний", hard: "Сложный",
    generating: "Создание...",
    generateBtn: "Создать Тест",
    resultsTitle: "Сгенерированные Вопросы",
    addMore: "Добавить вопросы",
    addMoreInstructions: "Загрузите новое фото или используйте текущее, затем нажмите 'Создать Тест'.",
    solutionLogic: "Логика решения",
    hideExp: "Скрыть объяснение",
    showExp: "Показать объяснение",
    invalidImageError: "Пожалуйста, загрузите образовательное изображение.",
    maxImagesError: "Максимум 2 изображения.",
    invalidImageFiles: "Пожалуйста, загружайте только изображения.",
    imageCompressError: "Не удалось обработать изображение.",
    uploadAtLeastOne: "Пожалуйста, загрузите хотя бы 1 изображение.",
    limitRemaining: (n: number) => `У вас остался лимит на ${n} вопросов. Пожалуйста, уменьшите запрашиваемое количество или повысьте тариф.`,
    featureLockedImage: "Создание тестов по фото доступно только на тарифах Pro и VIP. Повысьте тариф, чтобы открыть эту функцию.",
    limitReached: "Вашего месячного лимита ИИ недостаточно. Повысьте тариф или дождитесь следующего месяца.",
    questionsGenerated: (n: number) => `Создано вопросов: ${n}!`,
    networkError: "Ошибка сети. Проверьте интернет-соединение.",
    genericError: "Произошла ошибка.",
    createFirst: "Пожалуйста, сначала создайте вопросы.",
    saveBankError: "Произошла ошибка при сохранении в базу.",
    publishSuccess: "Тест успешно опубликован!",
    publishError: "Ошибка при публикации теста.",
    enterTitle: "Введите название",
    premiumFeature: "Премиум функция",
    viewPlans: "Посмотреть тарифы",
    goBack: "Вернуться назад",
    titlePlaceholder: "Например: Экзамен по алгебре",
    countLabel: "Вопросы",
    difficultyLabel: "Сложность",
    optimizingImage: "Оптимизация изображения...",
    monthlyLeft: (n: number) => ({ prefix: "У вас осталось", bold: `${n}`, suffix: "вопросов из месячного лимита." }),
    thinkingTitle: "ИИ Студия работает",
    thinkingPhrases: ["Чтение изображений...", "Анализ контекста...", "Определение формул и диаграмм...", "Составление вопросов и ответов...", "Настройка уровня сложности..."]
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
 * InvalidTopicError on any other path — the old `subject: "by_image"` placeholder
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
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 2500); 
    return () => clearInterval(interval);
  }, [isVisible, phrases.length]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-[320px] md:max-w-md bg-surface-container-low backdrop-blur-2xl rounded-m3-xl border border-outline-variant shadow-elev-3 p-6 md:p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-[color-mix(in_oklab,var(--m3-primary)_20%,transparent)] rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-[color-mix(in_oklab,var(--m3-tertiary)_20%,transparent)] rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-6 md:mb-8 mt-2 md:mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-primary to-tertiary rounded-full blur-xl opacity-40" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-surface-container-lowest backdrop-blur-md rounded-m3-xl border border-outline-variant flex items-center justify-center shadow-elev-3">
                <Bot size={36} className="text-primary animate-bounce md:w-11 md:h-11" style={{ animationDuration: "2s" }} />
                <Sparkles size={16} className="absolute -top-2 -right-2 text-tertiary animate-pulse md:w-5 md:h-5 md:-top-3 md:-right-3" />
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
  content = content.replace(/\\\((.*?)\\\)/g, '$$$1$$').replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$').replace(/&nbsp;/g, ' ').replace(/\\\\/g, '\\');                 
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="break-words">
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
  const [showExplanation, setShowExplanation] = useState(false);

  const getText = (field: any): string => {
    if (!field) return "";
    if (typeof field === "string") return field;
    if (field.uz) return field.uz;
    return JSON.stringify(field); 
  };

  return (
    <div className="bg-surface-container-low p-3.5 md:p-6 rounded-m3-lg shadow-elev-1 hover:shadow-elev-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 group relative">
      <div className="flex justify-between items-start mb-3 md:mb-5 pb-2.5 md:pb-4 border-b border-outline-variant">
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          <span className="bg-primary-container text-on-primary-container text-[9px] md:text-[11px] font-black px-2 md:px-3 py-1 rounded-full uppercase flex items-center gap-1 md:gap-1.5">
            <Sparkles size={10} className="text-primary md:w-3 md:h-3" /> Q{idx + 1}
          </span>
          <span className="bg-inverse-surface text-inverse-on-surface text-[9px] md:text-[10px] font-bold px-2 md:px-3 py-1 rounded-full uppercase shadow-elev-1">{q.uiDifficulty}</span>
        </div>
        <button onClick={() => onRemove(q.id)} className="text-on-surface-variant hover:text-error hover:bg-error-container p-1.5 rounded-m3-sm transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"><Trash2 size={14} className="md:w-4 md:h-4" /></button>
      </div>

      <div className="font-semibold text-[12px] md:text-[15px] text-on-surface mb-3 md:mb-6 leading-relaxed">
        <FormattedText text={getText(q.question)} />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-2 md:mb-4">
        {Object.entries(q.options).map(([key, value]: any) => {
          const isCorrect = q.answer === key;
          return (
            <div key={key} className={`flex items-start p-2 md:p-3 rounded-m3-md border-2 transition-all ${isCorrect ? 'bg-success-container border-success' : 'bg-surface-container-lowest border-outline-variant'}`}>
              <div className={`w-5 h-5 md:w-6 md:h-6 rounded-m3-xs flex items-center justify-center text-[10px] md:text-[11px] font-black mr-2 md:mr-3 mt-0.5 ${isCorrect ? 'bg-success text-surface-container-lowest' : 'bg-surface-container-high text-on-surface-variant'}`}>{key}</div>
              <div className={`text-[11px] md:text-sm font-medium pt-0.5 ${isCorrect ? 'text-on-success-container' : 'text-on-surface'}`}>
                <FormattedText text={getText(value)} />
              </div>
            </div>
          );
        })}
      </div>
      
      {getText(q.explanation).trim() && (
        <div className="mt-2 pt-2.5 md:pt-4 border-t border-outline-variant">
          <button onClick={() => setShowExplanation(!showExplanation)} className="text-[11px] md:text-[13px] font-bold text-primary flex items-center gap-1.5 transition-colors">
            {showExplanation ? <EyeOff size={12} className="md:w-3.5 md:h-3.5" /> : <Eye size={12} className="md:w-3.5 md:h-3.5" />} {showExplanation ? t.hideExp : t.showExp}
          </button>
        </div>
      )}
      
      {showExplanation && getText(q.explanation).trim() && (
        <div className="bg-surface-container border border-outline-variant p-2.5 md:p-4 rounded-m3-md mt-2.5 md:mt-4">
          <p className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 md:mb-2 flex items-center gap-1 md:gap-1.5"><BookOpen size={12} className="text-primary md:w-3.5 md:h-3.5" /> {t.solutionLogic}</p>
          <div className="text-[11px] md:text-[13.5px] text-on-surface font-medium leading-relaxed">
            <SolutionSteps text={getText(q.explanation)} render={(part) => <FormattedText text={part} />} />
          </div>
        </div>
      )}
    </div>
  );
};

export default function AIImageInputPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = PAGE_TRANSLATIONS[lang] || PAGE_TRANSLATIONS['en'];

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🟢 NEW: Fetching the monthly limits instead of daily
  const aiData = useMonthlyLimit(); 

  const [testTitle, setTestTitle] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  
  const [images, setImages] = useState<{ id: string, base64: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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
  const [limitModalMessage, setLimitModalMessage] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedQuestions, isGenerating]);

  const processFile = async (file: File) => {
  if (images.length >= 2) return toast.error(t.maxImagesError);
  if (!file.type.startsWith("image/")) return toast.error(t.invalidImageFiles);

  setIsCompressing(true); // Start loading spinner

  try {
    // --- THE ACCURACY vs ECONOMY SETTINGS ---
    const options = {
      maxSizeMB: 0.5,             // ECONOMY: Strictly compress down to max 500 KB
      maxWidthOrHeight: 1920,     // ACCURACY: Keep resolution high (1080p/1920p) so AI can read tiny math text!
      useWebWorker: true,         // ECONOMY: Uses a separate CPU thread so the browser UI doesn't freeze
      initialQuality: 0.85        // ACCURACY: Start with 85% quality before dialing down to hit 500KB
    };

    // Wait for the library to compress the file
    const compressedFile = await imageCompression(file, options);

    // Logging for your debugging (you can remove this later)
    console.log(`Original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

    // Convert the compressed file to Base64 to send to your API
    const reader = new FileReader();
    reader.onloadend = () => {
      setImages(prev => [
        ...prev, 
        { id: Math.random().toString(36).substr(2, 9), base64: reader.result as string }
      ]);
      setIsCompressing(false); // Stop loading spinner
    };
    reader.readAsDataURL(compressedFile);

  } catch (error) {
    console.error("Compression error:", error);
    toast.error(t.imageCompressError);
    setIsCompressing(false);
  }
};

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(processFile);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) Array.from(e.dataTransfer.files).forEach(processFile);
  };

  const removeImage = (id: string) => setImages(prev => prev.filter(img => img.id !== id));
  const removeQuestion = (id: string) => setGeneratedQuestions(prev => prev.filter(q => q.id !== id));
  const handleScrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleAddMoreClick = () => {
    handleScrollTop();
    toast(t.addMoreInstructions, { icon: "💡", duration: 4000 });
  };

  // --- GENERATE API CALL ---
  const handleGenerate = async () => {
    if (images.length === 0) return toast.error(t.uploadAtLeastOne);

    // 🟢 NEW: Check against Monthly Limits before calling the API to save time
    if (!aiData.isUnlimited && aiData.remaining < count) {
      setLimitModalMessage(t.limitRemaining(aiData.remaining));
      setIsLimitModalOpen(true);
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/teacher/create/by_image/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid, 
          images: images.map(img => img.base64),
          promptText: userPrompt,
          difficulty: difficulty,
          count: count,
          language: "uz"
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // 🟢 NEW: Handle specific Gatekeeper errors gracefully
        if (data.code === 'FEATURE_LOCKED') {
          setLimitModalMessage(t.featureLockedImage);
          setIsLimitModalOpen(true);
          return;
        }
        if (data.code === 'LIMIT_REACHED') {
          setLimitModalMessage(t.limitReached);
          setIsLimitModalOpen(true);
          return;
        }
        if (response.status === 400 && data.error === "invalid_image") {
          return toast.error(t.invalidImageError, { duration: 4000, style: { fontWeight: 'bold' } });
        }
        throw new Error(data.error);
      }

      const diffVal = difficulty === "Easy" ? 1 : difficulty === "Medium" ? 2 : 3;

      // No taxonomy here on purpose: the teacher assigns it in TopicAssignModal at save time.
      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        ...q,
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        difficultyId: diffVal,
        uiDifficulty: difficulty
      }));

      setGeneratedQuestions(prev => [...prev, ...enrichedQuestions]);
      toast.success(t.questionsGenerated(count));
      setUserPrompt("");
      
    } catch (error: any) {
      console.error(error);
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
            tags: ["ai_generated", "by_image"],
            language: ["uz", "ru", "en"],
            solutions: [],
          },
          {
            id,
            creatorId: user.uid,
            creatorName: user.displayName || "Teacher",
            creationMethod: "ai_generated",
            status: "published",
            aiModel: aiModelFor('images'),
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
          tags: ["ai_generated", "by_image"],
          language: ["uz", "ru", "en"],
          solutions: [],
        };
        const meta = {
          id,
          creatorId: user.uid,
          creatorName: user.displayName || "Teacher",
          creationMethod: "ai_generated" as const,
          status: "published" as const,
          aiModel: aiModelFor('images'),
        };

        batch.set(doc(db, "teacher_questions", id), toQuestionV1(source, { ...meta, timestamp: serverTimestamp() }));
        // The embedded snapshot needs a CONCRETE time: Firestore rejects serverTimestamp() sentinels inside arrays.
        finalQuestionsToSave.push(toQuestionV1(source, { ...meta, timestamp: Timestamp.now() }));
      });

      batch.set(doc(collection(db, "custom_tests")), {
        teacherId: user.uid,
        teacherName: user.displayName || "Teacher",
        title: testTitle,
        track: "by_image",
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
    <div className="min-h-screen bg-surface font-t-body pb-24">
      
      <AiThinkingModal isVisible={isGenerating} t={t} />

      {/* 🟢 NEW: Enhanced Premium Warning Modal for Limitations */}
      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-surface-container-low rounded-m3-xl p-6 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-elev-3 z-10 flex flex-col items-center text-center">
              <IconButton aria-label="Yopish" size="sm" onClick={() => setIsLimitModalOpen(false)} className="absolute top-3 right-3 md:top-4 md:right-4"><X size={18} className="md:w-5 md:h-5" /></IconButton>

              <div className="w-14 h-14 md:w-16 md:h-16 bg-primary-container rounded-m3-md md:rounded-m3-lg flex items-center justify-center mb-4 shadow-inner">
                <Crown size={28} className="text-on-primary-container" />
              </div>

              <h3 className="text-lg md:text-xl font-black text-on-surface mb-2">{t.premiumFeature}</h3>
              <p className="text-[13px] md:text-[14px] text-on-surface-variant mb-6 font-medium leading-relaxed">
                {limitModalMessage}
              </p>

              <div className="w-full flex flex-col gap-2">
                <Button variant="filled" className="w-full" onClick={() => router.push('/teacher/subscription')}>
                  {t.viewPlans} <ArrowLeft className="rotate-180" />
                </Button>
                <Button variant="outlined" className="w-full" onClick={() => setIsLimitModalOpen(false)}>
                  {t.goBack}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-surface-container-low rounded-m3-xl p-5 md:p-8 w-full max-w-[320px] md:max-w-md shadow-elev-3 z-10">
              <h3 className="text-lg md:text-xl font-black text-on-surface mb-1.5 md:mb-2">{t.modalTitle}</h3>
              <p className="text-[12px] md:text-[14px] text-on-surface-variant mb-5 md:mb-6 font-medium">{t.modalDesc}</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder={t.titlePlaceholder} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-surface-container border border-outline-variant rounded-m3-md text-[13px] md:text-[14px] font-bold text-on-surface outline-none focus:bg-surface-container-lowest focus:border-primary transition-all mb-6 md:mb-8" autoFocus/>
              <div className="flex gap-2 md:gap-3 justify-end">
                <Button variant="outlined" onClick={() => setIsTitleModalOpen(false)}>{t.modalCancel}</Button>
                <Button variant="filled" onClick={() => { if (!testTitle.trim()) return toast.error(t.enterTitle); setIsTitleModalOpen(false); setIsConfigModalOpen(true); }}>{t.modalNext} <ArrowLeft className="rotate-180"/></Button>
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

      <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={generatedQuestions.length} testTitle={testTitle} isSaving={isPublishing} />

      {/* TOP STICKY BAR */}
      <div className="bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-md border-b border-outline-variant t-page-bar sticky top-0 z-30 shadow-elev-1">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 md:gap-3">
            <IconButton aria-label="Orqaga" size="sm" onClick={() => router.push('/teacher/create')} className="-ml-1 md:-ml-2"><ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" /></IconButton>
            <h1 className="text-[13px] md:text-[16px] font-bold text-on-surface tracking-tight flex items-center gap-1.5 md:gap-2"><ImageIcon size={14} className="text-primary md:w-4 md:h-4" /> <span className="hidden xs:inline">{t.headerTitle}</span></h1>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            {/* 🟢 NEW: AiMonthlyLimitCard Replaces the old card */}
            <div className="hidden sm:block"><AiMonthlyLimitCard aiData={aiData} /></div>

            <Button
              variant="outlined"
              size="sm"
              icon={<Database />}
              loading={isSavingToBank}
              onClick={() => openTopicModal("bank")}
              disabled={isPublishing || isSavingToBank || isGenerating || generatedQuestions.length === 0}
            >
              {t.saveToBankBtn}
            </Button>

            <Button
              variant="tonal"
              size="sm"
              icon={<CheckCircle2 />}
              loading={isPublishing}
              onClick={() => openTopicModal("publish")}
              disabled={isPublishing || isSavingToBank || isGenerating || generatedQuestions.length === 0}
            >
              {t.publishBtn}
            </Button>
          </div>
        </div>
      </div>

<div className="max-w-5xl mx-auto px-3 md:px-4 mt-3 md:mt-4">
  <div className="bg-surface-container-low rounded-m3-lg md:rounded-m3-xl shadow-elev-1 p-3.5 md:p-8 mb-5 md:mb-8 relative">

    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 md:gap-6 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-outline-variant">
      <div className="max-w-md px-1 md:px-0">
        <h2 className="text-[15px] md:text-[18px] font-black text-on-surface tracking-tight">{t.uploadTitle}</h2>
        <p className="text-[11px] md:text-[13px] font-medium text-on-surface-variant mt-0.5 md:mt-1">{t.uploadDesc}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 sm:gap-6 px-1 md:px-0">

        <div className="flex flex-col gap-1.5 md:gap-2">
          <label className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase tracking-widest pl-1">
            {t.countLabel}
          </label>
          <div className="flex items-center bg-surface-container-high p-1 rounded-m3-sm md:rounded-m3-md shadow-inner h-[36px] md:h-[46px]">
            <button
              onClick={() => setCount(prev => Math.max(1, prev - 1))}
              className="w-7 md:w-9 h-full flex items-center justify-center rounded-m3-sm text-on-surface-variant hover:bg-surface-container-lowest hover:shadow-elev-1 transition-all disabled:text-disabled-fg"
              disabled={count <= 1}
            >
              <Minus size={12} className="md:w-4 md:h-4" strokeWidth={2.5} />
            </button>
            <div className="w-8 md:w-12 text-center flex items-center justify-center">
              <span className="text-[12px] md:text-[15px] font-black text-on-surface leading-none">{count}</span>
            </div>
            {/* 🟢 NEW: Ensure the plus button disables if requested count > remaining limits */}
            <button
              onClick={() => setCount(prev => Math.min(15, aiData?.isUnlimited ? 15 : (aiData?.remaining ?? 15), prev + 1))}
              className="w-7 md:w-9 h-full flex items-center justify-center rounded-m3-sm text-on-surface-variant hover:bg-surface-container-lowest hover:shadow-elev-1 transition-all disabled:text-disabled-fg"
              disabled={count >= 15 || (!aiData?.isUnlimited && count >= (aiData?.remaining ?? 15))}
            >
              <Plus size={12} className="md:w-4 md:h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 md:h-10 bg-outline-variant mb-1"></div>

        <div className="flex flex-col gap-1.5 md:gap-2">
          <label className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase tracking-widest pl-1">
            {t.difficultyLabel}
          </label>
          <div className="flex bg-surface-container-high p-1 rounded-m3-sm md:rounded-m3-md shadow-inner h-[36px] md:h-[46px]">
            <button
              onClick={() => setDifficulty('Easy')}
              className={`px-3 md:px-4 py-1 text-[10px] md:text-[13px] font-bold rounded-m3-sm transition-all ${difficulty === 'Easy' ? 'bg-surface-container-lowest text-success shadow-elev-1 ring-1 ring-outline-variant' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              {t.easy}
            </button>
            <button
              onClick={() => setDifficulty('Medium')}
              className={`px-3 md:px-4 py-1 text-[10px] md:text-[13px] font-bold rounded-m3-sm transition-all ${difficulty === 'Medium' ? 'bg-surface-container-lowest text-primary shadow-elev-1 ring-1 ring-outline-variant' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              {t.medium}
            </button>
            <button
              onClick={() => setDifficulty('Hard')}
              className={`px-3 md:px-4 py-1 text-[10px] md:text-[13px] font-bold rounded-m3-sm transition-all ${difficulty === 'Hard' ? 'bg-surface-container-lowest text-error shadow-elev-1 ring-1 ring-outline-variant' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              {t.hard}
            </button>
          </div>
        </div>

      </div>
    </div>

          <div className="mb-4 md:mb-6 bg-primary-container rounded-m3-md p-2.5 md:p-4 flex items-start gap-2.5 md:gap-3 mx-1 md:mx-0">
            <div className="bg-surface-container-lowest text-primary p-1.5 md:p-2 rounded-m3-sm shrink-0 mt-0.5">
              <Lightbulb size={16} className="md:w-[18px] md:h-[18px]" />
            </div>
            <p className="text-[10px] md:text-[13px] text-on-primary-container font-medium leading-relaxed">
              <span className="font-bold text-on-primary-container mr-1 block sm:inline">{t.howItWorksTitle}</span>
              {t.howItWorksDesc}
            </p>
          </div>

         <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`w-full min-h-[120px] md:min-h-[160px] border-2 border-dashed rounded-m3-md md:rounded-m3-lg flex flex-col items-center justify-center p-3 md:p-6 transition-all mb-4 md:mb-6 relative overflow-hidden ${isDragging ? 'border-primary bg-primary-container' : 'border-outline bg-surface-container hover:bg-state-hover'}`}
        >
          {/* Add the compressing spinner state here */}
          {isCompressing ? (

            <div className="text-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 z-20 bg-[color-mix(in_oklab,var(--m3-surface)_50%,transparent)] backdrop-blur-sm">
              <Spinner size={28} className="mb-2" />
              <p className="text-[11px] md:text-[13px] font-bold text-primary">{t.optimizingImage}</p>
            </div>
          ) : (
            images.length < 2 && (
              <div className="text-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
                <UploadCloud size={24} className={`mb-1.5 md:mb-3 transition-colors md:w-8 md:h-8 ${isDragging ? 'text-primary' : 'text-on-surface-variant'}`} />
                <p className="text-[10px] md:text-[13px] font-bold text-on-surface-variant">{t.dragDrop}</p>
              </div>
            )
          )}
            
            <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={handleFileSelect} disabled={images.length >= 2} />

            {images.length > 0 && (
              <div className="flex gap-2.5 md:gap-4 w-full justify-center relative z-20 pointer-events-auto">
                {images.map(img => (
                  <div key={img.id} className="relative w-20 h-20 md:w-32 md:h-32 rounded-m3-sm md:rounded-m3-md overflow-hidden border border-outline-variant shadow-elev-1 group">
                    <img src={img.base64} alt="Uploaded preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-scrim opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <button onClick={() => removeImage(img.id)} className="m3-interactive p-1 md:p-2 bg-error text-on-error rounded-full transition-colors"><Trash2 size={12} className="md:w-4 md:h-4"/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-3 md:mb-4 px-1 md:px-0">
            <label className="text-[10px] md:text-[12px] font-bold text-on-surface mb-1.5 md:mb-2 block">{t.optionalPrompt}</label>
            <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)} placeholder={t.placeholder} className="w-full h-16 md:h-24 p-2.5 md:p-4 bg-surface-container border border-outline-variant rounded-m3-md text-[11px] md:text-[13px] font-medium outline-none focus:bg-surface-container-lowest focus:border-primary resize-none transition-all placeholder:text-on-surface-variant" />
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-t border-outline-variant pt-3 md:pt-5 mt-2 gap-2.5 md:gap-3 px-1 md:px-0">

            <div className="flex-1 order-2 sm:order-1 text-center sm:text-left">
              {aiData && !aiData.isUnlimited && aiData.remaining < 15 && (
                <p className="text-[10px] md:text-[12px] font-medium text-warning px-1">
                  {t.monthlyLeft(aiData.remaining).prefix} <span className="font-bold">{t.monthlyLeft(aiData.remaining).bold}</span> {t.monthlyLeft(aiData.remaining).suffix}
                </p>
              )}
            </div>

            <Button
              variant="filled"
              icon={<Wand2 />}
              loading={isGenerating}
              onClick={handleGenerate}
              disabled={isGenerating || images.length === 0}
              className="order-1 sm:order-2 w-full sm:w-auto"
            >
              {isGenerating ? t.generating : t.generateBtn}
            </Button>
          </div>
        </div>

        {generatedQuestions.length > 0 && (
          <div className="space-y-3.5 md:space-y-5 pb-12">
            <div className="flex items-center justify-between px-1 md:px-2 mb-2 md:mb-4">
               <h2 className="text-[11px] md:text-sm font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 md:gap-2"><Layers size={14} className="text-on-surface-variant md:w-[18px] md:h-[18px]" />{t.resultsTitle} ({generatedQuestions.length})</h2>
            </div>
            {generatedQuestions.map((q, idx) => <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} t={t} />)}
            {!isGenerating && (
              <div className="pt-3 md:pt-6 flex justify-center">
                <button onClick={handleAddMoreClick} className="px-4 py-2 md:px-6 md:py-3 border-2 border-dashed border-outline text-[11px] md:text-[14px] text-on-surface-variant font-bold rounded-m3-md hover:border-primary hover:text-primary hover:bg-state-hover transition-all flex items-center gap-1.5 md:gap-2"><Plus size={14} className="md:w-[18px] md:h-[18px]" /> {t.addMore}</button>
              </div>
            )}
            <div ref={bottomRef} className="h-8" />
          </div>
        )}

      </div>
    </div>
  );
}