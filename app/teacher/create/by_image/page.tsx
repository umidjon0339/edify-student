"use client";

import { useState, useRef, useEffect, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, Wand2, CheckCircle2, Trash2, EyeOff, Eye, BookOpen, Layers, Minus, Plus, UploadCloud, Image as ImageIcon, X, Bot, Zap, Lightbulb } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";

import { useTeacherLanguage } from "@/app/teacher/layout"; 
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

// 🟢 AI LIMIT BLOCK START
import { useAiLimits } from "@/hooks/useAiLimits";
import AiLimitCard from "@/app/teacher/create/_components/AiLimitCard"; 
// 🔴 AI LIMIT BLOCK END

// --- TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    headerTitle: "Rasm orqali yaratish",
    publishBtn: "Nashr Qilish",
    modalTitle: "Test nomini kiriting",
    modalDesc: "Yangi yaratilgan testni saqlash va sozlashdan oldin unga nom bering.",
    modalCancel: "Bekor qilish",
    modalNext: "Keyingi qadam",
    uploadTitle: "Rasmni yuklang",
    uploadDesc: "Darslik, qo'llanma yoki test qog'ozining rasmini yuklang (Maksimal 2 ta).",
    // 🟢 NEW TRANSLATIONS
    howItWorksTitle: "Qanday ishlaydi?",
    howItWorksDesc: "Darslikdagi biror mavzu yoki savolni rasmga oling. AI rasm mavzusini o'rganib, xuddi shunga o'xshash yangi testlar yaratib beradi.",
    dragDrop: "Rasmni shu yerga tashlang yoki yuklash uchun bosing",
    optionalPrompt: "Qo'shimcha ko'rsatma (Ixtiyoriy)",
    placeholder: "Masalan: Shu rasmning mavzusi bo'yicha sal qiyinroq savollar tuzing...",
    items: "Savol",
    easy: "Oson", medium: "O'rta", hard: "Qiyin",
    generating: "Yaratilmoqda...",
    generateBtn: "Test Yaratish",
    resultsTitle: "Tayyorlangan Savollar",
    addMore: "Yana savol qo'shish",
    solutionLogic: "Yechim Mantiqi",
    hideExp: "Yechimni yashirish",
    showExp: "Yechimni ko'rish",
    invalidImageError: "Iltimos, faqat matematika yoki ta'limga oid rasmlarni yuklang.",
    maxImagesError: "Maksimal 2 ta rasm yuklash mumkin."
  },
  en: {
    headerTitle: "Create via Image",
    publishBtn: "Publish Test",
    modalTitle: "Name Your Test",
    modalDesc: "Give your newly generated test a clear title before configuring the settings.",
    modalCancel: "Cancel",
    modalNext: "Next Step",
    uploadTitle: "Upload Material",
    uploadDesc: "Upload a photo of a textbook, worksheet, or exam paper (Max 2).",
    // 🟢 NEW TRANSLATIONS
    howItWorksTitle: "How it works:",
    howItWorksDesc: "Take a photo of a topic or a specific question. The AI will analyze the image and generate new, similar questions based on that topic.",
    dragDrop: "Drag and drop images here or click to browse",
    optionalPrompt: "Additional Instructions (Optional)",
    placeholder: "E.g., Generate slightly harder questions based on this image's topic...",
    items: "Items",
    easy: "Easy", medium: "Medium", hard: "Hard",
    generating: "Generating...",
    generateBtn: "Generate Test",
    resultsTitle: "Generated Questions",
    addMore: "Add More Questions",
    solutionLogic: "Solution Logic",
    hideExp: "Hide Explanation",
    showExp: "Show Explanation",
    invalidImageError: "Please upload an image related to math or education.",
    maxImagesError: "You can upload a maximum of 2 images."
  },
  ru: {
    headerTitle: "Создать по фото",
    publishBtn: "Опубликовать Тест",
    modalTitle: "Назовите свой тест",
    modalDesc: "Дайте вашему новому тесту понятное название перед настройкой.",
    modalCancel: "Отмена",
    modalNext: "Следующий Шаг",
    uploadTitle: "Загрузите материал",
    uploadDesc: "Загрузите фото учебника, рабочего листа или экзамена (Макс. 2).",
    // 🟢 NEW TRANSLATIONS
    howItWorksTitle: "Как это работает:",
    howItWorksDesc: "Сфотографируйте тему или вопрос. ИИ проанализирует изображение и создаст новые похожие вопросы по этой теме.",
    dragDrop: "Перетащите изображения сюда или нажмите для выбора",
    optionalPrompt: "Дополнительные инструкции (необязательно)",
    placeholder: "Например, Создай вопросы немного сложнее по теме этого фото...",
    items: "Вопр.",
    easy: "Легкий", medium: "Средний", hard: "Сложный",
    generating: "Создание...",
    generateBtn: "Создать Тест",
    resultsTitle: "Сгенерированные Вопросы",
    addMore: "Добавить вопросы",
    solutionLogic: "Логика решения",
    hideExp: "Скрыть объяснение",
    showExp: "Показать объяснение",
    invalidImageError: "Пожалуйста, загрузите изображение, связанное с математикой или образованием.",
    maxImagesError: "Вы можете загрузить максимум 2 изображения."
  }
};

// 🟢 TEXT-FIRST: Clean Interface without arbitrary IDs
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

// ==========================================
// 🟢 AI THINKING MODAL (INTERNAL COMPONENT)
// ==========================================
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
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl border border-indigo-100/50 shadow-2xl p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-blue-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-8 mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-full blur-xl opacity-40" />
              <div className="relative w-24 h-24 bg-white/80 backdrop-blur-md rounded-3xl border border-white flex items-center justify-center shadow-xl">
                <Bot size={44} className="text-indigo-600 animate-bounce" style={{ animationDuration: "2s" }} />
                <Sparkles size={20} className="absolute -top-3 -right-3 text-amber-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 relative z-10 tracking-tight text-center">AI Studiya ishlamoqda</h3>
            <div className="h-6 relative z-10 overflow-hidden flex items-center justify-center w-full">
              <motion.p key={phraseIndex} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className="text-[14px] font-medium text-slate-500 absolute text-center w-full">{phrases[phraseIndex]}</motion.p>
            </div>
            <div className="w-[80%] h-1.5 bg-slate-200/50 rounded-full mt-8 overflow-hidden relative z-10">
              <motion.div className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 rounded-full w-[200%]" animate={{ x: ["-50%", "0%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
// ==========================================

const FormattedText = ({ text }: { text: any }) => {
  if (!text) return null;
  let content = typeof text === 'string' ? text : JSON.stringify(text);

  content = content
    .replace(/\\\((.*?)\\\)/g, '$$$1$$')    
    .replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$') 
    .replace(/&nbsp;/g, ' ')                 
    .replace(/\\\\/g, '\\');                 

  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="break-words">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-3 text-center overflow-x-auto custom-scrollbar" />;
          } catch (e) { return <span key={index} className="text-rose-500 font-mono text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) { return <span key={index} className="text-rose-500 font-mono text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        return <span key={index}>{part.split('\n').map((line, i, arr) => (<span key={i}>{line}{i < arr.length - 1 && <br />}</span>))}</span>;
      })}
    </span>
  );
};

const AIQuestionCard = ({ q, idx, onRemove, t }: { q: any, idx: number, onRemove: (id: string) => void, t: any }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 group relative">
      <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-indigo-50 text-indigo-700 text-[11px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1.5 border border-indigo-100/50">
            <Sparkles size={12} className="text-indigo-500" /> Q{idx + 1}
          </span>
          <span className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-sm">{q.uiDifficulty}</span>
        </div>
        <button onClick={() => onRemove(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={16} /></button>
      </div>
      <div className="font-semibold text-[15px] text-slate-900 mb-6 leading-relaxed"><FormattedText text={q.question.uz} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {Object.entries(q.options).map(([key, value]: any) => {
          const isCorrect = q.answer === key;
          return (
            <div key={key} className={`flex items-start p-3 rounded-xl border-2 transition-all ${isCorrect ? 'bg-indigo-50/40 border-indigo-500/30' : 'bg-white border-slate-100'}`}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black mr-3 mt-0.5 ${isCorrect ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{key}</div>
              <div className={`text-sm font-medium pt-0.5 ${isCorrect ? 'text-indigo-950' : 'text-slate-700'}`}><FormattedText text={value.uz} /></div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 pt-4 border-t border-slate-50">
        <button onClick={() => setShowExplanation(!showExplanation)} className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors">
          {showExplanation ? <EyeOff size={14} /> : <Eye size={14} />} {showExplanation ? t.hideExp : t.showExp}
        </button>
      </div>
      {showExplanation && (
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mt-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><BookOpen size={14} className="text-indigo-400" /> {t.solutionLogic}</p>
          <p className="text-[13.5px] text-slate-700 font-medium leading-relaxed"><FormattedText text={q.explanation.uz} /></p>
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

  // 🟢 AI LIMIT BLOCK START
  const aiData = useAiLimits(); 
  // 🔴 AI LIMIT BLOCK END

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
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedQuestions, isGenerating]);

  // --- IMAGE UPLOAD HANDLERS ---
  const processFile = (file: File) => {
    if (images.length >= 2) return toast.error(t.maxImagesError);
    if (!file.type.startsWith("image/")) return toast.error("Please upload valid image files.");

    const reader = new FileReader();
    reader.onloadend = () => {
      setImages(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), base64: reader.result as string }]);
    };
    reader.readAsDataURL(file);
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

  // --- GENERATE API CALL ---
  const handleGenerate = async () => {
    if (images.length === 0) return toast.error("Please upload at least 1 image.");

    if (aiData?.isLimitReached || (aiData && count > aiData.remaining)) {
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
      
      if (response.status === 400 && data.error === "invalid_image") {
        setIsGenerating(false);
        return toast.error(t.invalidImageError, { duration: 4000, style: { fontWeight: 'bold' } });
      }
      
      if (!response.ok) throw new Error(data.error);

      const diffVal = difficulty === "Easy" ? 1 : difficulty === "Medium" ? 2 : 3;

      // 🟢 TEXT-FIRST: Hardcoding to 'by_image' 
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
      toast.success(`${count} questions generated successfully!`);
      setImages([]); 
      setUserPrompt(""); 
      
    } catch (error: any) {
      console.error(error);
      if (error.message.includes("fetch failed") || error.message.includes("ENOTFOUND")) {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error(error.message || "An error occurred.");
      }
    } finally {
      setIsGenerating(false);
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
        
        // 🟢 The explicit differentiator for NoSQL Routing
        track: "by_image",

        // 🟢 Text-First database structure
        subject: "by_image",
        topic: "by_image",
        chapter: "by_image",
        subtopic: "by_image",
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
      
      // 🟢 The explicit differentiator
      track: "by_image",

      // 🟢 Save the container cleanly
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
      router.push("/teacher/dashboard");
    } catch (error) {
      toast.error("Error publishing test.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-24">
      
      <AiThinkingModal isVisible={isGenerating} />

      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl z-10 flex flex-col items-center text-center">
              <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-5 border border-rose-100 shadow-inner"><Zap size={28} className="text-rose-500" /></div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{aiData?.isLimitReached ? "Kunlik limit tugadi" : "Limit yetarli emas"}</h3>
              <p className="text-[14px] text-slate-500 mb-6 font-medium leading-relaxed">
                {aiData?.isLimitReached ? "Siz bugungi bepul kunlik limitingizni tugatdingiz. Cheklovsiz foydalanish uchun profilingizni yangilang." : `Sizda bugun uchun faqatgina ${aiData?.remaining} ta bepul limit qoldi. Iltimos, so'ralayotgan miqdorni kamaytiring yoki limitni oshiring.`}
              </p>
              <div className="w-full flex flex-col gap-3">
                <button onClick={() => window.open('https://t.me/Umidjon0339', '_blank')} className="w-full py-3.5 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2">Limitni oshirish</button>
                <button onClick={() => setIsLimitModalOpen(false)} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors active:scale-[0.98]">Orqaga qaytish</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 z-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.modalTitle}</h3>
              <p className="text-[14px] text-slate-500 mb-6 font-medium">{t.modalDesc}</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="e.g., Algebra Exam" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all mb-8" autoFocus/>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">{t.modalCancel}</button>
                <button onClick={() => { if (!testTitle.trim()) return toast.error("Enter a title"); setIsTitleModalOpen(false); setIsConfigModalOpen(true); }} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2">{t.modalNext} <ArrowLeft className="rotate-180" size={16}/></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={generatedQuestions.length} testTitle={testTitle} isSaving={isPublishing} />

      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/teacher/create')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={18} /></button>
            <h1 className="text-[15px] md:text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2"><ImageIcon size={16} className="text-indigo-500" /> {t.headerTitle}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <AiLimitCard aiData={aiData} />
            <button onClick={handleInitiatePublish} disabled={isPublishing || isGenerating || generatedQuestions.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 text-[13px]"><CheckCircle2 size={16} /> <span className="hidden sm:inline">{t.publishBtn}</span></button>
          </div>
        </div>
      </div>

<div className="max-w-5xl mx-auto px-4 mt-4">
  <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 mb-8 relative">
       
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6 pb-6 border-b border-slate-100">
  <div className="max-w-md">
    <h2 className="text-[18px] font-black text-slate-900 tracking-tight">{t.uploadTitle}</h2>
    <p className="text-[13px] font-medium text-slate-500 mt-1">{t.uploadDesc}</p>
  </div>

  <div className="flex flex-wrap items-end gap-4 sm:gap-6">
    
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
        Savollar soni
      </label>
      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner h-[46px]">
        <button 
          onClick={() => setCount(prev => Math.max(1, prev - 1))} 
          className="w-9 h-full flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40" 
          disabled={count <= 1}
        >
          <Minus size={16} strokeWidth={2.5} />
        </button>
        <div className="w-12 text-center flex items-center justify-center">
          <span className="text-[15px] font-black text-slate-800 leading-none">{count}</span>
        </div>
        
        <button 
          onClick={() => setCount(prev => Math.min(15, aiData?.remaining ?? 15, prev + 1))} 
          className="w-9 h-full flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40" 
          disabled={count >= 15 || count >= (aiData?.remaining ?? 15)}
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>

      </div>
    </div>

    <div className="hidden sm:block w-px h-10 bg-slate-200 mb-1"></div>

    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
        Qiyinlik darajasi
      </label>
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner h-[46px]">
        <button 
          onClick={() => setDifficulty('Easy')} 
          className={`px-4 py-1 text-[13px] font-bold rounded-lg transition-all ${difficulty === 'Easy' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.easy}
        </button>
        <button 
          onClick={() => setDifficulty('Medium')} 
          className={`px-4 py-1 text-[13px] font-bold rounded-lg transition-all ${difficulty === 'Medium' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.medium}
        </button>
        <button 
          onClick={() => setDifficulty('Hard')} 
          className={`px-4 py-1 text-[13px] font-bold rounded-lg transition-all ${difficulty === 'Hard' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.hard}
        </button>
      </div>
    </div>

  </div>
</div>

          {/* 🟢 NEW: "HOW IT WORKS" INFO BANNER */}
          <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shrink-0 mt-0.5">
              <Lightbulb size={18} />
            </div>
            <p className="text-[13px] text-blue-900/80 font-medium leading-relaxed">
              <span className="font-bold text-blue-900 mr-1">{t.howItWorksTitle}</span>
              {t.howItWorksDesc}
            </p>
          </div>
          {/* 🔴 END OF NEW BANNER */}

          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`w-full min-h-[160px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-all mb-6 relative overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'}`}
          >
            {images.length < 2 && (
              <div className="text-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <UploadCloud size={32} className={`mb-3 transition-colors ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                <p className="text-[13px] font-bold text-slate-600">{t.dragDrop}</p>
              </div>
            )}
            
            <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={handleFileSelect} disabled={images.length >= 2} />

            {images.length > 0 && (
              <div className="flex gap-4 w-full justify-center relative z-20 pointer-events-auto">
                {images.map(img => (
                  <div key={img.id} className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                    <img src={img.base64} alt="Uploaded preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <button onClick={() => removeImage(img.id)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="text-[12px] font-bold text-slate-700 mb-2 block">{t.optionalPrompt}</label>
            <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)} placeholder={t.placeholder} className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:bg-white focus:border-indigo-400 resize-none transition-all placeholder:text-slate-400" />
          </div>

          <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-2">
            
            <div className="flex-1">
              {aiData && !aiData.isLimitReached && aiData.remaining < 15 && (
                <p className="text-[12px] font-medium text-amber-600 px-1">
                  Sizda <span className="font-bold">{aiData.remaining} ta</span> savol yaratish limiti qoldi.
                </p>
              )}
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={isGenerating || images.length === 0} 
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
              {isGenerating ? t.generating : t.generateBtn}
            </button>
          </div>
        </div>

        {generatedQuestions.length > 0 && (
          <div className="space-y-5 pb-12">
            <div className="flex items-center justify-between px-2 mb-4">
               <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2"><Layers size={18} className="text-slate-400" />{t.resultsTitle} ({generatedQuestions.length})</h2>
            </div>
            {generatedQuestions.map((q, idx) => <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} t={t} />)}
            {!isGenerating && (
              <div className="pt-6 flex justify-center">
                <button onClick={handleScrollTop} className="px-6 py-3 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-xl hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2"><Plus size={18} /> {t.addMore}</button>
              </div>
            )}
            <div ref={bottomRef} className="h-8" />
          </div>
        )}

      </div>
    </div>
  );
}