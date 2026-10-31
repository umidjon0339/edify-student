"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Bot, PenTool, Image as ImageIcon, School, Award, GraduationCap, Zap, FileText, Calculator, Database, HelpCircle, Blocks, FileJson } from "lucide-react";
import { useTeacherLanguage } from "@/app/teacher/layout";
import { motion, Variants } from "framer-motion";

import { Button, cn } from "@/components/ui";

// ============================================================================
// 🌐 TRANSLATION DICTIONARY
// ============================================================================
const HUB_TRANSLATIONS: Record<string, any> = {
  uz: {
    heroBadge: "Studiya 2.0 ✨", title: "Test Yaratish Markazi", subtitle: "Maqsadingizga qarab, eng tezkor usulni tanlang.",
    myBank: "Mening Savollarim",
    sections: { cur: "Ta'lim Dasturlari", work: "Ishchi Varaqlar", ai: "AI va Maxsus Vositalar", single: "Savollar Bazasi" },
    bsb: { badge: "Rasmiy", title: "BSB va CHSB", desc: "Matritsa asosida rasmiy chorak imtihonlarini avtomatik yarating.", btn: "Boshlash" },
    maktab: { badge: "Kundalik", title: "Maktab Dasturi", desc: "Darsliklar asosida tezkor so'rovlar va uy vazifalarini tuzing.", btn: "Boshlash" },
    ixtisos: { badge: "Mantiq", title: "Ixtisoslashtirilgan", desc: "Iqtidorli o'quvchilar uchun qiyinlashtirilgan, mantiqiy masalalar.", btn: "Boshlash" },
    abiturient: { badge: "DTM", title: "Abituriyent (Blok)", desc: "Oliy ta'limga kirish imtihonlari formatidagi 5 fanli blok testlar.", btn: "Boshlash" },
    mathOps: { badge: "Yangi", title: "Matematik Amallar", desc: "Qo'shish, ayirish, ko'paytirish va bo'lish uchun cheksiz PDF varaqlar.", btn: "Yaratish" },
    aiImage: { badge: "Skaner 📸", title: "Rasm Orqali", desc: "Eski testni rasmga oling. AI uni o'qib, yangi variantlarini tuzadi.", btn: "Yuklash" },
    aiPrompt: { badge: "Avtomat", title: "AI Maxsus Buyruq", desc: "Test mavzusini so'z bilan yozing, AI qolganini o'zi bajaradi.", btn: "Yozish" },
    custom: { badge: "Qo'l Mehnati", title: "Oq Qog'oz", desc: "Matematik klaviatura yordamida o'z savollaringizni noldan yozing.", btn: "Ochish" },
    question: { badge: "Bitta Savol", title: "Savol Yaratish", desc: "Rasm yoki matnli savol; javob ochiq yoki variantli bo'lishi mumkin.", btn: "Yaratish" },
    block: { badge: "Blok", title: "Ko'p savolli test", desc: "Bitta shart ostida bir nechta savol — yopiq (umumiy variantli) yoki ochiq (yozma javob).", btn: "Yaratish" },
    jsonImport: { badge: "JSON", title: "JSON orqali import", desc: "Biologiya, kimyo, fizika, ona tili, matematika yoki SAT — ko'p savolni bitta fayl bilan bazaga qo'shing.", btn: "Yuklash" },
  },
  en: {
    heroBadge: "Studio 2.0 ✨", title: "Creation Hub", subtitle: "Select the fastest workflow for your teaching goals.",
    myBank: "My Question Bank",
    sections: { cur: "Curriculum Exams", work: "Worksheets & Practice", ai: "AI & Manual Tools", single: "Question Bank" },
    bsb: { badge: "Official", title: "BSB & CHSB", desc: "Instantly generate matrix-based, official term exam papers.", btn: "Start" },
    maktab: { badge: "Daily", title: "Public School", desc: "Create quick quizzes and homework based on standard textbooks.", btn: "Start" },
    ixtisos: { badge: "Logic", title: "Specialized Track", desc: "Generate multi-step, Olympiad-level logic problems.", btn: "Start" },
    abiturient: { badge: "University", title: "Entrance Exams", desc: "Build highly competitive subject blocks formatted for DTM.", btn: "Start" },
    mathOps: { badge: "New", title: "Math Operations", desc: "Generate endless PDF worksheets for basic arithmetic practice.", btn: "Generate" },
    aiImage: { badge: "Scanner 📸", title: "Create via Image", desc: "Snap a photo of an old test. AI will generate brand new variants.", btn: "Upload" },
    aiPrompt: { badge: "Auto", title: "AI Text Command", desc: "Just describe your topic. The AI builds the entire test for you.", btn: "Write" },
    custom: { badge: "Manual", title: "Blank Canvas", desc: "Write questions from scratch using our built-in math keyboard.", btn: "Open" },
    question: { badge: "Single", title: "Create Question", desc: "One question from an image or text; open or multiple-choice answer.", btn: "Create" },
    block: { badge: "Block", title: "Multi-question test", desc: "Several questions under one stem — closed (shared A–F variants) or open (written answers).", btn: "Create" },
    jsonImport: { badge: "JSON", title: "Import from JSON", desc: "Biology, chemistry, physics, Uzbek, maths or SAT — add many questions to your bank with one file.", btn: "Upload" },
  },
  ru: {
    heroBadge: "Студия 2.0 ✨", title: "Центр Создания", subtitle: "Выберите самый быстрый способ для ваших целей.",
    myBank: "Моя База Вопросов",
    sections: { cur: "Учебные Программы", work: "Рабочие Листы", ai: "ИИ и Инструменты", single: "База Вопросов" },
    bsb: { badge: "Официально", title: "Генератор BSB", desc: "Автоматическое создание четвертных экзаменов по матрице.", btn: "Начать" },
    maktab: { badge: "Ежедневно", title: "Школьная программа", desc: "Быстрые тесты и домашки на основе стандартных учебников.", btn: "Начать" },
    ixtisos: { badge: "Логика", title: "Спец. школы", desc: "Сложные, логические задачи для одаренных детей.", btn: "Начать" },
    abiturient: { badge: "Поступление", title: "Подготовка в ВУЗ", desc: "Блоки по 5 предметам в формате вступительных экзаменов.", btn: "Начать" },
    mathOps: { badge: "Новое", title: "Математические Операции", desc: "Бесконечные PDF-листы для практики сложения и вычитания.", btn: "Создать" },
    aiImage: { badge: "Сканер 📸", title: "Создать по фото", desc: "Сфотографируйте старый тест. ИИ создаст его новые аналоги.", btn: "Загрузить" },
    aiPrompt: { badge: "Автомат", title: "AI Свой Запрос", desc: "Просто опишите тему. ИИ сам составит готовый тест.", btn: "Написать" },
    custom: { badge: "Вручную", title: "Чистый Лист", desc: "Создавайте тесты с нуля, используя математическую клавиатуру.", btn: "Открыть" },
    question: { badge: "Один вопрос", title: "Создать Вопрос", desc: "Вопрос из картинки или текста; открытый ответ или варианты.", btn: "Создать" },
    block: { badge: "Блок", title: "Тест с несколькими вопросами", desc: "Несколько вопросов под одним условием — закрытый (общие варианты A–F) или открытый (письменные ответы).", btn: "Создать" },
    jsonImport: { badge: "JSON", title: "Импорт из JSON", desc: "Биология, химия, физика, родной язык, математика или SAT — добавьте много вопросов одним файлом.", btn: "Загрузить" },
  }
};

// --- M3 three-tone rotation (see docs/UI_KIT.md — no rainbow accents) ---
type Tone = 'primary' | 'secondary' | 'tertiary';

const TONE_TILE: Record<Tone, string> = {
  primary: "bg-primary-container text-on-primary-container group-hover:bg-primary group-hover:text-on-primary",
  secondary: "bg-secondary-container text-on-secondary-container group-hover:bg-secondary group-hover:text-on-secondary",
  tertiary: "bg-tertiary-container text-on-tertiary-container group-hover:bg-tertiary group-hover:text-on-tertiary",
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

  const SECTIONS: { title: string; items: { id: string; icon: any; tone: Tone; href: string; data: any }[] }[] = [
    {
      title: t.sections.cur,
      items: [
        { id: 'bsb', icon: FileText, tone: 'primary', href: '/teacher/create/bsb-chsb', data: t.bsb },
        { id: 'maktab', icon: School, tone: 'secondary', href: '/teacher/create/maktab', data: t.maktab },
        { id: 'ixtisos', icon: Award, tone: 'tertiary', href: '/teacher/create/ixtisoslashtirilgan_maktab', data: t.ixtisos },
        { id: 'abiturient', icon: GraduationCap, tone: 'primary', href: '/teacher/create/abiturient', data: t.abiturient },
        // ⚠️ The Milliy sertifikat papers (maths + subjects) deliberately do NOT
        // appear here any more — they moved to their own top-level nav
        // destination, `/teacher/milliy-sertifikat`, because they are a
        // per-subject exam programme rather than one of this hub's test-creation
        // methods. See docs/MILLIY_QUIZ.md and docs/TEACHER.md.
      ]
    },
    {
      title: t.sections.work,
      items: [
        { id: 'mathOps', icon: Calculator, tone: 'secondary', href: '/teacher/create/operations', data: t.mathOps },
      ]
    },
    {
      title: t.sections.ai,
      items: [
        { id: 'aiImage', icon: ImageIcon, tone: 'tertiary', href: '/teacher/create/by_image', data: t.aiImage },
        { id: 'aiPrompt', icon: Bot, tone: 'primary', href: '/teacher/create/by_user_input', data: t.aiPrompt },
        { id: 'custom', icon: PenTool, tone: 'secondary', href: '/teacher/create/custom', data: t.custom },
      ]
    },
    {
      title: t.sections.single,
      items: [
        { id: 'question', icon: HelpCircle, tone: 'tertiary', href: '/teacher/create/question', data: t.question },
        { id: 'block', icon: Blocks, tone: 'primary', href: '/teacher/create/block', data: t.block },
        { id: 'jsonImport', icon: FileJson, tone: 'secondary', href: '/teacher/create/import', data: t.jsonImport },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col relative overflow-clip pb-[100px]">

      {/* STICKY GLOBAL HEADER — phones: a sticky bar; md+: no bar, just the
          button at the top-right (a full-width bar around one button read as
          an empty strip under the floating top-bar pills). */}
      <header className="sticky top-0 z-50 bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-md border-b border-outline-variant px-4 md:px-8 py-3 flex justify-end items-center w-full md:static md:bg-transparent md:backdrop-blur-none md:border-b-0 md:pb-0">
        <Button variant="tonal" size="sm" icon={<Database />} onClick={() => router.push('/teacher/create/my_questions')}>
          {t.myBank}
        </Button>
      </header>

      <div className="flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10 pt-6 md:pt-12">

        {/* --- HERO SECTION --- */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 md:mb-16 max-w-2xl flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low shadow-elev-1 text-on-surface-variant font-bold text-[10px] md:text-[12px] uppercase tracking-widest mb-4">
            <Zap size={14} className="fill-warning text-warning" /> {t.heroBadge}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-on-surface tracking-tight mb-3 leading-tight">{t.title}</h1>
          <p className="text-on-surface-variant text-[14px] md:text-[18px] font-medium leading-relaxed px-4">{t.subtitle}</p>
        </motion.div>

        {/* --- DYNAMIC SECTIONS RENDERER --- */}
        {SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className="w-full mb-12 md:mb-16">

            {/* Section Divider */}
            <div className="flex items-center justify-center gap-4 mb-6 md:mb-8">
              <div className="h-px flex-1 max-w-[50px] md:max-w-[100px] bg-outline-variant"></div>
              <h3 className="text-[11px] md:text-[12px] font-extrabold text-on-surface-variant uppercase tracking-widest text-center">{section.title}</h3>
              <div className="h-px flex-1 max-w-[50px] md:max-w-[100px] bg-outline-variant"></div>
            </div>

            {/* Cards Grid */}
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {section.items.map((item) => (
                <motion.div
                  key={item.id} variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push(item.href)}
                  className="group relative bg-surface-container-low rounded-m3-lg p-4 md:p-6 shadow-elev-1 hover:shadow-elev-2 transition-shadow duration-300 cursor-pointer overflow-hidden flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0"
                >
                  {/* Icon & Badge (Responsive Flex) */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start w-auto md:w-full md:mb-6 relative z-10 shrink-0">
                    <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-m3-md flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3", TONE_TILE[item.tone])}>
                      <item.icon size={24} strokeWidth={2.5} className="md:w-7 md:h-7" />
                    </div>
                    <span className="hidden md:block text-[9px] font-extrabold px-2 py-1 rounded-m3-xs uppercase tracking-widest bg-surface-container-high text-on-surface-variant">{item.data.badge}</span>
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 text-left relative z-10 w-full">
                    <div className="flex items-center gap-2 mb-1 md:mb-2">
                      <h2 className="text-[15px] md:text-[18px] font-extrabold text-on-surface group-hover:text-primary transition-colors leading-tight">{item.data.title}</h2>
                      <span className="md:hidden text-[9px] font-extrabold px-1.5 py-0.5 rounded-m3-xs uppercase tracking-widest bg-surface-container-high text-on-surface-variant">{item.data.badge}</span>
                    </div>
                    <p className="text-[12px] md:text-[14px] text-on-surface-variant font-medium leading-relaxed md:mb-8 line-clamp-2 md:line-clamp-3">{item.data.desc}</p>

                    {/* Desktop Button */}
                    <div className="hidden md:inline-flex items-center gap-2 text-[13px] font-bold transition-colors text-primary opacity-80 group-hover:opacity-100 mt-auto">
                      <span className="group-hover:mr-1 transition-all duration-300">{item.data.btn}</span>
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>

                  {/* Mobile Arrow */}
                  <div className="md:hidden shrink-0 text-outline group-hover:text-primary transition-colors">
                    <ArrowRight size={20} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}

      </div>
    </div>
  );
}
