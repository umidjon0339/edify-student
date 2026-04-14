"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Bot, PenTool, Image as ImageIcon, School, Award, GraduationCap, Zap, FileText, Calculator, Database } from "lucide-react";
import { useTeacherLanguage } from "@/app/teacher/layout"; 
import { motion, Variants } from "framer-motion";

const CardIllustration = ({ theme }: { theme: string }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity duration-700 text-${theme}-500`}>
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Large Wireframe Circle */}
        <motion.circle cx="160" cy="160" r="70" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" strokeDasharray="10 10"
          animate={{ rotate: [0, 360] }} 
          style={{ originX: "160px", originY: "160px" }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }} 
        />
        {/* Solid Floating Triangle */}
        <motion.polygon points="40,140 70,190 10,190" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5"
          animate={{ y: [0, -15, 0], rotate: [0, 15, 0] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} 
        />
        {/* Floating Square */}
        <motion.rect x="140" y="20" width="50" height="50" rx="8" fill="currentColor" fillOpacity="0.08"
          animate={{ x: [0, -10, 0], y: [0, 15, 0], rotate: [0, 45, 0] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} 
        />
      </svg>
    </div>
  );
};

// ============================================================================
// 🌐 TRANSLATION DICTIONARY
// ============================================================================
const HUB_TRANSLATIONS: Record<string, any> = {
  uz: {
    heroBadge: "Studiya 2.0 ✨", title: "Test Yaratish Markazi", subtitle: "Maqsadingizga qarab, eng tezkor usulni tanlang.",
    myBank: "Mening Savollarim",
    sections: { cur: "Ta'lim Dasturlari", work: "Ishchi Varaqlar", ai: "AI va Maxsus Vositalar" },
    bsb: { badge: "Rasmiy", title: "BSB va CHSB", desc: "Matritsa asosida rasmiy chorak imtihonlarini avtomatik yarating.", btn: "Boshlash" },
    maktab: { badge: "Kundalik", title: "Maktab Dasturi", desc: "Darsliklar asosida tezkor so'rovlar va uy vazifalarini tuzing.", btn: "Boshlash" },
    ixtisos: { badge: "Mantiq", title: "Ixtisoslashtirilgan", desc: "Iqtidorli o'quvchilar uchun qiyinlashtirilgan, mantiqiy masalalar.", btn: "Boshlash" },
    abiturient: { badge: "DTM", title: "Abituriyent (Blok)", desc: "Oliy ta'limga kirish imtihonlari formatidagi 5 fanli blok testlar.", btn: "Boshlash" },
    mathOps: { badge: "Yangi", title: "Matematik Amallar", desc: "Qo'shish, ayirish, ko'paytirish va bo'lish uchun cheksiz PDF varaqlar.", btn: "Yaratish" },
    aiImage: { badge: "Skaner 📸", title: "Rasm Orqali", desc: "Eski testni rasmga oling. AI uni o'qib, yangi variantlarini tuzadi.", btn: "Yuklash" },
    aiPrompt: { badge: "Avtomat", title: "AI Maxsus Buyruq", desc: "Test mavzusini so'z bilan yozing, AI qolganini o'zi bajaradi.", btn: "Yozish" },
    custom: { badge: "Qo'l Mehnati", title: "Oq Qog'oz", desc: "Matematik klaviatura yordamida o'z savollaringizni noldan yozing.", btn: "Ochish" },
  },
  en: {
    heroBadge: "Studio 2.0 ✨", title: "Creation Hub", subtitle: "Select the fastest workflow for your teaching goals.",
    myBank: "My Question Bank",
    sections: { cur: "Curriculum Exams", work: "Worksheets & Practice", ai: "AI & Manual Tools" },
    bsb: { badge: "Official", title: "BSB & CHSB", desc: "Instantly generate matrix-based, official term exam papers.", btn: "Start" },
    maktab: { badge: "Daily", title: "Public School", desc: "Create quick quizzes and homework based on standard textbooks.", btn: "Start" },
    ixtisos: { badge: "Logic", title: "Specialized Track", desc: "Generate multi-step, Olympiad-level logic problems.", btn: "Start" },
    abiturient: { badge: "University", title: "Entrance Exams", desc: "Build highly competitive subject blocks formatted for DTM.", btn: "Start" },
    mathOps: { badge: "New", title: "Math Operations", desc: "Generate endless PDF worksheets for basic arithmetic practice.", btn: "Generate" },
    aiImage: { badge: "Scanner 📸", title: "Create via Image", desc: "Snap a photo of an old test. AI will generate brand new variants.", btn: "Upload" },
    aiPrompt: { badge: "Auto", title: "AI Text Command", desc: "Just describe your topic. The AI builds the entire test for you.", btn: "Write" },
    custom: { badge: "Manual", title: "Blank Canvas", desc: "Write questions from scratch using our built-in math keyboard.", btn: "Open" },
  },
  ru: {
    heroBadge: "Студия 2.0 ✨", title: "Центр Создания", subtitle: "Выберите самый быстрый способ для ваших целей.",
    myBank: "Моя База Вопросов",
    sections: { cur: "Учебные Программы", work: "Рабочие Листы", ai: "ИИ и Инструменты" },
    bsb: { badge: "Официально", title: "Генератор BSB", desc: "Автоматическое создание четвертных экзаменов по матрице.", btn: "Начать" },
    maktab: { badge: "Ежедневно", title: "Школьная программа", desc: "Быстрые тесты и домашки на основе стандартных учебников.", btn: "Начать" },
    ixtisos: { badge: "Логика", title: "Спец. школы", desc: "Сложные, логические задачи для одаренных детей.", btn: "Начать" },
    abiturient: { badge: "Поступление", title: "Подготовка в ВУЗ", desc: "Блоки по 5 предметам в формате вступительных экзаменов.", btn: "Начать" },
    mathOps: { badge: "Новое", title: "Математические Операции", desc: "Бесконечные PDF-листы для практики сложения и вычитания.", btn: "Создать" },
    aiImage: { badge: "Сканер 📸", title: "Создать по фото", desc: "Сфотографируйте старый тест. ИИ создаст его новые аналоги.", btn: "Загрузить" },
    aiPrompt: { badge: "Автомат", title: "AI Свой Запрос", desc: "Просто опишите тему. ИИ сам составит готовый тест.", btn: "Написать" },
    custom: { badge: "Вручную", title: "Чистый Лист", desc: "Создавайте тесты с нуля, используя математическую клавиатуру.", btn: "Открыть" },
  }
};

// --- THEME ENGINE (Tailwind-safe mappings) ---
const THEMES = {
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'group-hover:bg-purple-600', border: 'hover:border-purple-300', shadow: 'hover:shadow-purple-500/20', badgeBorder: 'border-purple-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'group-hover:bg-blue-600', border: 'hover:border-blue-300', shadow: 'hover:shadow-blue-500/20', badgeBorder: 'border-blue-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'group-hover:bg-amber-500', border: 'hover:border-amber-300', shadow: 'hover:shadow-amber-500/20', badgeBorder: 'border-amber-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'group-hover:bg-emerald-600', border: 'hover:border-emerald-300', shadow: 'hover:shadow-emerald-500/20', badgeBorder: 'border-emerald-200' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', iconBg: 'group-hover:bg-cyan-500', border: 'hover:border-cyan-300', shadow: 'hover:shadow-cyan-500/20', badgeBorder: 'border-cyan-200' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'group-hover:bg-rose-500', border: 'hover:border-rose-300', shadow: 'hover:shadow-rose-500/20', badgeBorder: 'border-rose-200' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'group-hover:bg-violet-600', border: 'hover:border-violet-300', shadow: 'hover:shadow-violet-500/20', badgeBorder: 'border-violet-200' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', iconBg: 'group-hover:bg-teal-500', border: 'hover:border-teal-300', shadow: 'hover:shadow-teal-500/20', badgeBorder: 'border-teal-200' },
};

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const cardVariants: Variants = { 
  hidden: { opacity: 0, y: 15, scale: 0.98 }, 
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } },
  hover: { y: -4, transition: { duration: 0.2 } },
  tap: { scale: 0.97 }
};

// ============================================================================
// 🏛️ MAIN PAGE COMPONENT
// ============================================================================
export default function CreateHubPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = HUB_TRANSLATIONS[lang] || HUB_TRANSLATIONS['uz'];

  const SECTIONS = [
    {
      title: t.sections.cur,
      items: [
        { id: 'bsb', icon: FileText, theme: 'purple', href: '/teacher/create/bsb-chsb', data: t.bsb },
        { id: 'maktab', icon: School, theme: 'blue', href: '/teacher/create/maktab', data: t.maktab },
        { id: 'ixtisos', icon: Award, theme: 'amber', href: '/teacher/create/ixtisoslashtirilgan_maktab', data: t.ixtisos },
        { id: 'abiturient', icon: GraduationCap, theme: 'emerald', href: '/teacher/create/abiturient', data: t.abiturient },
      ]
    },
    {
      title: t.sections.work,
      items: [
        { id: 'mathOps', icon: Calculator, theme: 'cyan', href: '/teacher/create/operations', data: t.mathOps },
      ]
    },
    {
      title: t.sections.ai,
      items: [
        { id: 'aiImage', icon: ImageIcon, theme: 'rose', href: '/teacher/create/by_image', data: t.aiImage },
        { id: 'aiPrompt', icon: Bot, theme: 'violet', href: '/teacher/create/by_user_input', data: t.aiPrompt },
        { id: 'custom', icon: PenTool, theme: 'teal', href: '/teacher/create/custom', data: t.custom },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans relative overflow-hidden pb-[100px] selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 🟢 AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-slate-100 to-transparent pointer-events-none z-0"></div>
      <div className="absolute -left-[20%] top-[-10%] w-[70vw] h-[50vh] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      
      {/* 🟢 NEW STICKY GLOBAL HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex justify-between items-center shadow-sm w-full">
        <div className="flex items-center">
          {/* Spacer to push the button to the right */}
        </div>
        <button 
          onClick={() => router.push('/teacher/create/my_questions')} 
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 text-[11px] md:text-[13px] active:scale-95"
        >
          <Database size={16} className="md:w-4 md:h-4 text-indigo-500" />
          <span>{t.myBank}</span>
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10 pt-6 md:pt-12">
        
        {/* --- HERO SECTION --- */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 md:mb-16 max-w-2xl flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 text-slate-700 font-bold text-[10px] md:text-[12px] uppercase tracking-widest mb-4 shadow-sm">
            <Zap size={14} className="fill-amber-400 text-amber-500" /> {t.heroBadge}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 leading-tight">{t.title}</h1>
          <p className="text-slate-500 text-[14px] md:text-[18px] font-medium leading-relaxed px-4">{t.subtitle}</p>
        </motion.div>

        {/* --- DYNAMIC SECTIONS RENDERER --- */}
        {SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className="w-full mb-12 md:mb-16">
            
            {/* Section Divider */}
            <div className="flex items-center justify-center gap-4 mb-6 md:mb-8">
              <div className="h-px flex-1 max-w-[50px] md:max-w-[100px] bg-gradient-to-r from-transparent to-slate-300"></div>
              <h3 className="text-[11px] md:text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">{section.title}</h3>
              <div className="h-px flex-1 max-w-[50px] md:max-w-[100px] bg-gradient-to-l from-transparent to-slate-300"></div>
            </div>
            
            {/* Cards Grid */}
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {section.items.map((item) => {
                const theme = THEMES[item.theme as keyof typeof THEMES];
                return (
                  <motion.div 
                    key={item.id} variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push(item.href)} 
                    className={`group relative bg-white rounded-2xl md:rounded-[2rem] p-4 md:p-6 border border-slate-200/80 transition-all duration-300 cursor-pointer overflow-hidden flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 ${theme.border} hover:shadow-xl ${theme.shadow} hover:-translate-y-1`}
                  >
                    <CardIllustration theme={item.theme} />
                    
                    {/* Icon & Badge (Responsive Flex) */}
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start w-auto md:w-full md:mb-6 relative z-10 shrink-0">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border border-slate-100 group-hover:text-white group-hover:scale-110 group-hover:rotate-3 ${theme.bg} ${theme.text} ${theme.iconBg}`}>
                        <item.icon size={24} strokeWidth={2.5} className="md:w-7 md:h-7" />
                      </div>
                      {/* Fixed dynamic border classes to be production safe */}
                      <span className={`hidden md:block text-[9px] font-black px-2 py-1 rounded border uppercase tracking-widest bg-white ${theme.text} ${theme.badgeBorder} shadow-sm`}>{item.data.badge}</span>
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 text-left relative z-10 w-full">
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                         <h2 className={`text-[15px] md:text-[18px] font-black text-slate-900 group-hover:${theme.text} transition-colors leading-tight`}>{item.data.title}</h2>
                         <span className={`md:hidden text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-white ${theme.text} border ${theme.badgeBorder}`}>{item.data.badge}</span>
                      </div>
                      <p className="text-[12px] md:text-[14px] text-slate-500 font-medium leading-relaxed md:mb-8 line-clamp-2 md:line-clamp-3">{item.data.desc}</p>
                      
                      {/* Desktop Button */}
                      <div className={`hidden md:inline-flex items-center gap-2 text-[13px] font-bold transition-colors ${theme.text} opacity-80 group-hover:opacity-100 mt-auto`}>
                        <span className="group-hover:mr-1 transition-all duration-300">{item.data.btn}</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300"/>
                      </div>
                    </div>
                    
                    {/* Mobile Arrow */}
                    <div className="md:hidden shrink-0 text-slate-300 group-hover:text-slate-600 transition-colors">
                      <ArrowRight size={20} />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        ))}

      </div>
    </div>
  );
}