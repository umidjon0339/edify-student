"use client";

import { useState, useRef, useEffect, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, Wand2, CheckCircle2, Trash2, EyeOff, Eye, BookOpen, Layers, Minus, Plus, UploadCloud, Image as ImageIcon, X, Bot, Zap, Lightbulb, Database, Crown } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";

import { useTeacherLanguage } from "@/app/teacher/layout"; 
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

// 🟢 NEW AI MONTHLY LIMIT BLOCK START
import { useMonthlyLimit } from "@/hooks/useMonthlyLimit";
import AiMonthlyLimitCard from "@/app/teacher/create/_components/AiMonthlyLimitCard"; 
// 🔴 NEW AI MONTHLY LIMIT BLOCK END

import imageCompression from 'browser-image-compression';

// --- TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    headerTitle: "Rasm orqali yaratish",
    publishBtn: "Chop Qilish",
    saveToBankBtn: "Bazaga Saqlash",
    savedToBankSuccess: "Savollar bazangizga muvaffaqiyatli saqlandi!",
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
    maxImagesError: "Maksimal 2 ta rasm yuklash mumkin."
  },
  en: {
    headerTitle: "Create via Image",
    publishBtn: "Publish Test",
    saveToBankBtn: "Save to Bank",
    savedToBankSuccess: "Questions successfully saved to your bank!",
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
    maxImagesError: "You can upload a maximum of 2 images."
  },
  ru: {
    headerTitle: "Создать по фото",
    publishBtn: "Опубликовать",
    saveToBankBtn: "Сохранить в базу",
    savedToBankSuccess: "Вопросы успешно сохранены в вашу базу!",
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
    maxImagesError: "Максимум 2 изображения."
  }
};

interface AIQuestion { 
  id: string; 
  uiDifficulty: string; 
  question: { uz: string; ru: string; en: string }; 
  options: { A: { uz: string; ru: string; en: string }; B: { uz: string; ru: string; en: string }; C: { uz: string; ru: string; en: string }; D: { uz: string; ru: string; en: string }; }; 
  answer: string; 
  explanation: { uz: string; ru: string; en: string }; 
  subject: string; 
  topic: string; 
  chapter: string; 
  subtopic: string; 
  difficultyId: number; 
}

const AiThinkingModal = ({ isVisible }: { isVisible: boolean }) => {
  const phrases = [
    "Rasmlar o'qilmoqda...",
    "Konteks tahlil qilinmoqda...",
    "Formula va chizmalar aniqlanmoqda...",
    "Savollar va javoblar tuzilmoqda...",
    "Qiyinlik darajasi moslashtirilmoqda..."
  ];
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-[320px] md:max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl border border-indigo-100/50 shadow-2xl p-6 md:p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-blue-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-6 md:mb-8 mt-2 md:mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-full blur-xl opacity-40" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white/80 backdrop-blur-md rounded-3xl border border-white flex items-center justify-center shadow-xl">
                <Bot size={36} className="text-indigo-600 animate-bounce md:w-11 md:h-11" style={{ animationDuration: "2s" }} />
                <Sparkles size={16} className="absolute -top-2 -right-2 text-amber-400 animate-pulse md:w-5 md:h-5 md:-top-3 md:-right-3" />
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-black text-slate-800 mb-1 md:mb-2 relative z-10 tracking-tight text-center">AI Studiya ishlamoqda</h3>
            <div className="h-5 md:h-6 relative z-10 overflow-hidden flex items-center justify-center w-full">
              <motion.p key={phraseIndex} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className="text-[12px] md:text-[14px] font-medium text-slate-500 absolute text-center w-full">{phrases[phraseIndex]}</motion.p>
            </div>
            <div className="w-[80%] h-1 md:h-1.5 bg-slate-200/50 rounded-full mt-6 md:mt-8 overflow-hidden relative z-10">
              <motion.div className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 rounded-full w-[200%]" animate={{ x: ["-50%", "0%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
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
          } catch (e) { return <span key={index} className="text-rose-500 font-mono text-[11px] md:text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) { return <span key={index} className="text-rose-500 font-mono text-[11px] md:text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
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
    <div className="bg-white p-3.5 md:p-6 rounded-[1rem] md:rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 group relative">
      <div className="flex justify-between items-start mb-3 md:mb-5 pb-2.5 md:pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          <span className="bg-indigo-50 text-indigo-700 text-[9px] md:text-[11px] font-black px-2 md:px-3 py-1 rounded-full uppercase flex items-center gap-1 md:gap-1.5 border border-indigo-100/50">
            <Sparkles size={10} className="text-indigo-500 md:w-3 md:h-3" /> Q{idx + 1}
          </span>
          <span className="bg-slate-800 text-white text-[9px] md:text-[10px] font-bold px-2 md:px-3 py-1 rounded-full uppercase shadow-sm">{q.uiDifficulty}</span>
        </div>
        <button onClick={() => onRemove(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"><Trash2 size={14} className="md:w-4 md:h-4" /></button>
      </div>
      
      <div className="font-semibold text-[12px] md:text-[15px] text-slate-900 mb-3 md:mb-6 leading-relaxed">
        <FormattedText text={getText(q.question)} />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-2 md:mb-4">
        {Object.entries(q.options).map(([key, value]: any) => {
          const isCorrect = q.answer === key;
          return (
            <div key={key} className={`flex items-start p-2 md:p-3 rounded-xl border-2 transition-all ${isCorrect ? 'bg-indigo-50/40 border-indigo-500/30' : 'bg-white border-slate-100'}`}>
              <div className={`w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center text-[10px] md:text-[11px] font-black mr-2 md:mr-3 mt-0.5 ${isCorrect ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{key}</div>
              <div className={`text-[11px] md:text-sm font-medium pt-0.5 ${isCorrect ? 'text-indigo-950' : 'text-slate-700'}`}>
                <FormattedText text={getText(value)} />
              </div>
            </div>
          );
        })}
      </div>
      
      {getText(q.explanation).trim() && (
        <div className="mt-2 pt-2.5 md:pt-4 border-t border-slate-50">
          <button onClick={() => setShowExplanation(!showExplanation)} className="text-[11px] md:text-[13px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors">
            {showExplanation ? <EyeOff size={12} className="md:w-3.5 md:h-3.5" /> : <Eye size={12} className="md:w-3.5 md:h-3.5" />} {showExplanation ? t.hideExp : t.showExp}
          </button>
        </div>
      )}
      
      {showExplanation && getText(q.explanation).trim() && (
        <div className="bg-slate-50 border border-slate-100 p-2.5 md:p-4 rounded-xl mt-2.5 md:mt-4">
          <p className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 md:mb-2 flex items-center gap-1 md:gap-1.5"><BookOpen size={12} className="text-indigo-400 md:w-3.5 md:h-3.5" /> {t.solutionLogic}</p>
          <p className="text-[11px] md:text-[13.5px] text-slate-700 font-medium leading-relaxed">
            <FormattedText text={getText(q.explanation)} />
          </p>
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
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedQuestions, isGenerating]);

  const processFile = async (file: File) => {
  if (images.length >= 2) return toast.error(t.maxImagesError);
  if (!file.type.startsWith("image/")) return toast.error("Please upload valid image files.");

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
    toast.error("Rasmni yuklashda xatolik yuz berdi (Image compression failed).");
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
    if (images.length === 0) return toast.error("Please upload at least 1 image.");

    // 🟢 NEW: Check against Monthly Limits before calling the API to save time
    if (!aiData.isUnlimited && aiData.remaining < count) {
      setLimitModalMessage(`Sizda ${aiData.remaining} ta savol yaratish uchun limit qoldi. Iltimos so'ralayotgan miqdorni kamaytiring yoki tarifni oshiring.`);
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
          setLimitModalMessage("Rasm orqali test yaratish faqat Pro va VIP tariflarida mavjud. Funksiyani ochish uchun tarifingizni oshiring.");
          setIsLimitModalOpen(true);
          return;
        }
        if (data.code === 'LIMIT_REACHED') {
          setLimitModalMessage("Oylik AI limitingiz yetarli emas. Tarifingizni oshiring yoki keyingi oyni kuting.");
          setIsLimitModalOpen(true);
          return;
        }
        if (response.status === 400 && data.error === "invalid_image") {
          return toast.error(t.invalidImageError, { duration: 4000, style: { fontWeight: 'bold' } });
        }
        throw new Error(data.error);
      }

      const diffVal = difficulty === "Easy" ? 1 : difficulty === "Medium" ? 2 : 3;

      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        ...q,
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        subject: "by_image",
        topic: "by_image",
        chapter: "by_image",
        subtopic: "by_image",
        difficultyId: diffVal,
        uiDifficulty: difficulty
      }));

      setGeneratedQuestions(prev => [...prev, ...enrichedQuestions]);
      toast.success(`${count} ta savol yaratildi!`);
      setUserPrompt(""); 
      
    } catch (error: any) {
      console.error(error);
      if (error.message.includes("fetch failed") || error.message.includes("ENOTFOUND")) {
        toast.error("Tarmoq xatosi. Internetni tekshiring.");
      } else {
        toast.error(error.message || "Xatolik yuz berdi.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // --- SAVE TO BANK LOGIC ---
  const handleSaveToBank = async () => {
    if (generatedQuestions.length === 0) return toast.error("Iltimos, oldin savol yarating.");
    if (!user) return;

    setIsSavingToBank(true);
    const batch = writeBatch(db);
    const currentTimestampString = new Date().toISOString();

    try {
      for (const q of generatedQuestions) {
        const questionRef = doc(collection(db, "teacher_questions"));
        const finalQ = {
          ...q,
          id: `tq_${questionRef.id}`, 
          creatorId: user.uid, 
          number: "", 
          track: "by_image",
          subject: q.subject || "by_image",
          topic: q.topic || "by_image",
          chapter: q.chapter || "by_image",
          subtopic: q.subtopic || "by_image",
          creationMethod: "by_image", 
          difficulty: q.uiDifficulty.toLowerCase(),
          difficultyId: q.difficultyId, 
          tags: ["ai_generated", "by_image"],
          language: ["uz", "ru", "en"],
          solutions: [], 
          uploadedAt: currentTimestampString, 
        };
        batch.set(questionRef, { ...finalQ, createdAt: serverTimestamp() });
      }

      await batch.commit();
      toast.success(t.savedToBankSuccess);
      router.push('/teacher/create/my_questions');
    } catch (error) {
      console.error("Save to bank error:", error);
      toast.error("Bazaga saqlashda xatolik yuz berdi.");
    } finally {
      setIsSavingToBank(false);
    }
  };

  // --- PUBLISH LOGIC ---
  const handleInitiatePublish = () => {
    if (generatedQuestions.length === 0) return toast.error("Please generate questions first.");
    setIsTitleModalOpen(true); 
  };

  const handleFinalPublish = async (testSettings: any) => {
    if (!user) return;
    setIsPublishing(true);
    
    const batch = writeBatch(db);
    const finalQuestionsToSave = [];
    const currentTimestampString = new Date().toISOString();

    for (const q of generatedQuestions) {
      const secureFirebaseId = doc(collection(db, "teacher_questions")).id;

      const finalQ = {
        ...q,
        id: `tq_${secureFirebaseId}`, 
        creatorId: user.uid, 
        number: "", 
        track: "by_image",
        subject: "by_image",
        topic: "by_image",
        chapter: "by_image",
        subtopic: "by_image",
        creationMethod: "by_image",
        difficulty: q.uiDifficulty.toLowerCase(),
        difficultyId: q.difficultyId, 
        tags: ["ai_generated", "by_image"],
        language: ["uz", "ru", "en"],
        solutions: [], 
        uploadedAt: currentTimestampString, 
      };
      
      finalQuestionsToSave.push(finalQ);
      batch.set(doc(db, "teacher_questions", finalQ.id), { ...finalQ, createdAt: serverTimestamp() });
    }

    batch.set(doc(collection(db, "custom_tests")), {
      teacherId: user.uid,
      teacherName: user.displayName || "Teacher",
      title: testTitle,
      track: "by_image",
      subjectName: "by_image",
      topicName: "by_image",
      chapterName: "by_image",
      subtopicName: "by_image",
      questions: finalQuestionsToSave, 
      duration: testSettings.duration,
      shuffle: testSettings.shuffleQuestions,
      resultsVisibility: testSettings.resultsVisibility,
      accessCode: testSettings.accessCode,
      status: "active",
      createdAt: serverTimestamp(),
      questionCount: finalQuestionsToSave.length,
    });

    try {
      await batch.commit();
      toast.success("Test published successfully!");
      setIsConfigModalOpen(false);
      router.push("/teacher/library/tests");
    } catch (error) {
      toast.error("Error publishing test.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-24">
      
      <AiThinkingModal isVisible={isGenerating} />

      {/* 🟢 NEW: Enhanced Premium Warning Modal for Limitations */}
      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] md:rounded-3xl p-6 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-2xl z-10 flex flex-col items-center text-center">
              <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-3 right-3 md:top-4 md:right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="md:w-5 md:h-5" /></button>
              
              <div className="w-14 h-14 md:w-16 md:h-16 bg-indigo-50 rounded-[1rem] md:rounded-2xl flex items-center justify-center mb-4 border border-indigo-100 shadow-inner">
                <Crown size={28} className="text-amber-500" />
              </div>
              
              <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">Premium Xususiyat</h3>
              <p className="text-[13px] md:text-[14px] text-slate-500 mb-6 font-medium leading-relaxed">
                {limitModalMessage}
              </p>
              
              <div className="w-full flex flex-col gap-2">
                <button onClick={() => router.push('/teacher/subscription')} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-[13px] md:text-[14px] font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  Tariflarni ko'rish <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
                <button onClick={() => setIsLimitModalOpen(false)} className="w-full py-3 md:py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] md:text-[14px] font-bold rounded-xl transition-colors active:scale-[0.98]">
                  Orqaga qaytish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] md:rounded-3xl p-5 md:p-8 w-full max-w-[320px] md:max-w-md shadow-2xl border border-slate-100 z-10">
              <h3 className="text-lg md:text-xl font-black text-slate-900 mb-1.5 md:mb-2">{t.modalTitle}</h3>
              <p className="text-[12px] md:text-[14px] text-slate-500 mb-5 md:mb-6 font-medium">{t.modalDesc}</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="e.g., Algebra Exam" className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] md:text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all mb-6 md:mb-8" autoFocus/>
              <div className="flex gap-2 md:gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-4 py-2 md:px-5 md:py-2.5 text-[12px] md:text-[14px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">{t.modalCancel}</button>
                <button onClick={() => { if (!testTitle.trim()) return toast.error("Enter a title"); setIsTitleModalOpen(false); setIsConfigModalOpen(true); }} className="px-4 py-2 md:px-6 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-[12px] md:text-[14px] text-white font-bold rounded-xl flex items-center gap-1.5 md:gap-2">{t.modalNext} <ArrowLeft className="rotate-180 w-3.5 h-3.5 md:w-4 md:h-4"/></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={generatedQuestions.length} testTitle={testTitle} isSaving={isPublishing} />

      {/* TOP STICKY BAR */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 md:gap-3">
            <button onClick={() => router.push('/teacher/create')} className="p-1.5 md:p-2 -ml-1 md:-ml-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" /></button>
            <h1 className="text-[13px] md:text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-1.5 md:gap-2"><ImageIcon size={14} className="text-indigo-500 md:w-4 md:h-4" /> <span className="hidden xs:inline">{t.headerTitle}</span></h1>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-3">
            {/* 🟢 NEW: AiMonthlyLimitCard Replaces the old card */}
            <div className="hidden sm:block"><AiMonthlyLimitCard aiData={aiData} /></div>
            
            <button 
              onClick={handleSaveToBank} 
              disabled={isPublishing || isSavingToBank || isGenerating || generatedQuestions.length === 0} 
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-1.5 md:gap-2 disabled:opacity-50 text-[10px] md:text-[13px]"
            >
              {isSavingToBank ? <Loader2 size={14} className="animate-spin md:w-4 md:h-4" /> : <Database size={14} className="md:w-4 md:h-4" />} 
              <span>{t.saveToBankBtn}</span>
            </button>

            <button 
              onClick={handleInitiatePublish} 
              disabled={isPublishing || isSavingToBank || isGenerating || generatedQuestions.length === 0} 
              className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-1.5 md:gap-2 disabled:opacity-50 text-[10px] md:text-[13px]"
            >
              {isPublishing ? <Loader2 size={14} className="animate-spin md:w-4 md:h-4" /> : <CheckCircle2 size={14} className="md:w-4 md:h-4" />} 
              <span>{t.publishBtn}</span>
            </button>
          </div>
        </div>
      </div>

<div className="max-w-5xl mx-auto px-3 md:px-4 mt-3 md:mt-4">
  <div className="bg-white rounded-[1rem] md:rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-3.5 md:p-8 mb-5 md:mb-8 relative">
       
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 md:gap-6 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-slate-100">
      <div className="max-w-md px-1 md:px-0">
        <h2 className="text-[15px] md:text-[18px] font-black text-slate-900 tracking-tight">{t.uploadTitle}</h2>
        <p className="text-[11px] md:text-[13px] font-medium text-slate-500 mt-0.5 md:mt-1">{t.uploadDesc}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 sm:gap-6 px-1 md:px-0">
        
        <div className="flex flex-col gap-1.5 md:gap-2">
          <label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
            Savollar
          </label>
          <div className="flex items-center bg-slate-100 p-1 rounded-[0.5rem] md:rounded-xl border border-slate-200/60 shadow-inner h-[36px] md:h-[46px]">
            <button 
              onClick={() => setCount(prev => Math.max(1, prev - 1))} 
              className="w-7 md:w-9 h-full flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40" 
              disabled={count <= 1}
            >
              <Minus size={12} className="md:w-4 md:h-4" strokeWidth={2.5} />
            </button>
            <div className="w-8 md:w-12 text-center flex items-center justify-center">
              <span className="text-[12px] md:text-[15px] font-black text-slate-800 leading-none">{count}</span>
            </div>
            {/* 🟢 NEW: Ensure the plus button disables if requested count > remaining limits */}
            <button 
              onClick={() => setCount(prev => Math.min(15, aiData?.isUnlimited ? 15 : (aiData?.remaining ?? 15), prev + 1))} 
              className="w-7 md:w-9 h-full flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40" 
              disabled={count >= 15 || (!aiData?.isUnlimited && count >= (aiData?.remaining ?? 15))}
            >
              <Plus size={12} className="md:w-4 md:h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 md:h-10 bg-slate-200 mb-1"></div>

        <div className="flex flex-col gap-1.5 md:gap-2">
          <label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
            Qiyinligi
          </label>
          <div className="flex bg-slate-100 p-1 rounded-[0.5rem] md:rounded-xl border border-slate-200/60 shadow-inner h-[36px] md:h-[46px]">
            <button 
              onClick={() => setDifficulty('Easy')} 
              className={`px-3 md:px-4 py-1 text-[10px] md:text-[13px] font-bold rounded-lg transition-all ${difficulty === 'Easy' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.easy}
            </button>
            <button 
              onClick={() => setDifficulty('Medium')} 
              className={`px-3 md:px-4 py-1 text-[10px] md:text-[13px] font-bold rounded-lg transition-all ${difficulty === 'Medium' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.medium}
            </button>
            <button 
              onClick={() => setDifficulty('Hard')} 
              className={`px-3 md:px-4 py-1 text-[10px] md:text-[13px] font-bold rounded-lg transition-all ${difficulty === 'Hard' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.hard}
            </button>
          </div>
        </div>

      </div>
    </div>

          <div className="mb-4 md:mb-6 bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 md:p-4 flex items-start gap-2.5 md:gap-3 shadow-sm mx-1 md:mx-0">
            <div className="bg-blue-100 text-blue-600 p-1.5 md:p-2 rounded-lg shrink-0 mt-0.5">
              <Lightbulb size={16} className="md:w-[18px] md:h-[18px]" />
            </div>
            <p className="text-[10px] md:text-[13px] text-blue-900/80 font-medium leading-relaxed">
              <span className="font-bold text-blue-900 mr-1 block sm:inline">{t.howItWorksTitle}</span>
              {t.howItWorksDesc}
            </p>
          </div>

         <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`w-full min-h-[120px] md:min-h-[160px] border-2 border-dashed rounded-xl md:rounded-2xl flex flex-col items-center justify-center p-3 md:p-6 transition-all mb-4 md:mb-6 relative overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'}`}
        >
          {/* Add the compressing spinner state here */}
          {isCompressing ? (
            
            <div className="text-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 z-20 bg-white/50 backdrop-blur-sm">
              <Loader2 size={28} className="mb-2 text-indigo-600 animate-spin" />
              <p className="text-[11px] md:text-[13px] font-bold text-indigo-600">Rasm optimallashtirilmoqda...</p>
            </div>
          ) : (
            images.length < 2 && (
              <div className="text-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
                <UploadCloud size={24} className={`mb-1.5 md:mb-3 transition-colors md:w-8 md:h-8 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                <p className="text-[10px] md:text-[13px] font-bold text-slate-600">{t.dragDrop}</p>
              </div>
            )
          )}
            
            <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={handleFileSelect} disabled={images.length >= 2} />

            {images.length > 0 && (
              <div className="flex gap-2.5 md:gap-4 w-full justify-center relative z-20 pointer-events-auto">
                {images.map(img => (
                  <div key={img.id} className="relative w-20 h-20 md:w-32 md:h-32 rounded-lg md:rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                    <img src={img.base64} alt="Uploaded preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <button onClick={() => removeImage(img.id)} className="p-1 md:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"><Trash2 size={12} className="md:w-4 md:h-4"/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-3 md:mb-4 px-1 md:px-0">
            <label className="text-[10px] md:text-[12px] font-bold text-slate-700 mb-1.5 md:mb-2 block">{t.optionalPrompt}</label>
            <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)} placeholder={t.placeholder} className="w-full h-16 md:h-24 p-2.5 md:p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] md:text-[13px] font-medium outline-none focus:bg-white focus:border-indigo-400 resize-none transition-all placeholder:text-slate-400" />
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-t border-slate-100 pt-3 md:pt-5 mt-2 gap-2.5 md:gap-3 px-1 md:px-0">
            
            <div className="flex-1 order-2 sm:order-1 text-center sm:text-left">
              {aiData && !aiData.isUnlimited && aiData.remaining < 15 && (
                <p className="text-[10px] md:text-[12px] font-medium text-amber-600 px-1">
                  Sizda oylik limitdan <span className="font-bold">{aiData.remaining} ta</span> savol qoldi.
                </p>
              )}
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={isGenerating || images.length === 0} 
              className="order-1 sm:order-2 w-full sm:w-auto px-4 py-2.5 md:px-8 md:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] md:text-[14px] font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 md:gap-2 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="animate-spin w-4 h-4 md:w-[18px] md:h-[18px]" /> : <Wand2 className="w-4 h-4 md:w-[18px] md:h-[18px]" />}
              {isGenerating ? t.generating : t.generateBtn}
            </button>
          </div>
        </div>

        {generatedQuestions.length > 0 && (
          <div className="space-y-3.5 md:space-y-5 pb-12">
            <div className="flex items-center justify-between px-1 md:px-2 mb-2 md:mb-4">
               <h2 className="text-[11px] md:text-sm font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5 md:gap-2"><Layers size={14} className="text-slate-400 md:w-[18px] md:h-[18px]" />{t.resultsTitle} ({generatedQuestions.length})</h2>
            </div>
            {generatedQuestions.map((q, idx) => <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} t={t} />)}
            {!isGenerating && (
              <div className="pt-3 md:pt-6 flex justify-center">
                <button onClick={handleAddMoreClick} className="px-4 py-2 md:px-6 md:py-3 border-2 border-dashed border-slate-300 text-[11px] md:text-[14px] text-slate-500 font-bold rounded-xl hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-1.5 md:gap-2"><Plus size={14} className="md:w-[18px] md:h-[18px]" /> {t.addMore}</button>
              </div>
            )}
            <div ref={bottomRef} className="h-8" />
          </div>
        )}

      </div>
    </div>
  );
}