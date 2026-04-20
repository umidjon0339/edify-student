'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, Variants } from 'framer-motion';
import { 
  Users, FileText, Layout, BarChart2, Sparkles, 
  School, ImageIcon, Bot, Library, Calendar, ChevronRight, 
  ClipboardList, Settings, Crown, ArrowRight, Zap, Target, BookOpen, 
  Award, GraduationCap, Calculator, PenTool, Gift
} from 'lucide-react';
import { useTeacherLanguage, LangType } from '@/app/teacher/layout';
import { useRouter } from 'next/navigation';

// ============================================================================
// 1. TRANSLATION DICTIONARY
// ============================================================================
const DASHBOARD_TRANSLATIONS: Record<string, any> = {
  uz: {
    welcome: { morning: "Xayrli tong", afternoon: "Xayrli kun", evening: "Xayrli kech", subtitle: "Bugun nima o'rganamiz?" },
    stats: { students: "O'quvchilar", classes: "Faol Sinflar", tests: "Testlar" },
    headers: { create: "Test Yaratish Vositalari", manage: "O'quv Markazi", limits: "Oylik AI Limit" },
    subscription: {
      trialTitle: "Pro tarifini 30 kun BEPUL sinab ko'ring! 🎉",
      trialDesc: "Cheksiz testlar, BSB/CHSB generatori va AI vositalaridan to'liq foydalanish imkoniyati.",
      trialBtn: "Sinovni Boshlash",
      current: "Joriy Tarif",
      plans: { free: "Start (Bepul)", pro: "Pro", vip: "VIP" }
    },
    actions: {
      library: { title: "Mening Arxivim", desc: "Barcha testlar va materiallar" },
      classes: { title: "Sinflar va O'quvchilar", desc: "Jurnal va reytinglar" },
      analytics: { title: "Tahlillar", desc: "O'zlashtirish ko'rsatkichlari" },
      assignments: { title: "Uy Vazifalari", desc: "Vazifalar va tekshiruv" },
      settings: { title: "Sozlamalar", desc: "Profil va xavfsizlik" },
    },
    tools: {
      bsb: { badge: "Rasmiy", title: "BSB va CHSB", desc: "Matritsa asosida rasmiy chorak imtihonlarini avtomatik yarating.", btn: "Boshlash" },
      maktab: { badge: "Kundalik", title: "Maktab Dasturi", desc: "Darsliklar asosida tezkor so'rovlar va uy vazifalarini tuzing.", btn: "Boshlash" },
      ixtisos: { badge: "Mantiq", title: "Ixtisoslashtirilgan", desc: "Iqtidorli o'quvchilar uchun qiyinlashtirilgan, mantiqiy masalalar.", btn: "Boshlash" },
      abiturient: { badge: "DTM", title: "Abituriyent", desc: "Oliy ta'limga kirish imtihonlari formatidagi 5 fanli blok testlar.", btn: "Boshlash" },
      mathOps: { badge: "Yangi", title: "Arifmetika", desc: "Qo'shish, ayirish, ko'paytirish uchun cheksiz PDF misollar.", btn: "Yaratish" },
      aiImage: { badge: "Skaner 📸", title: "Rasm Orqali", desc: "Eski testni rasmga oling. AI uning yangi variantlarini tuzadi.", btn: "Yuklash" },
      aiPrompt: { badge: "Avtomat", title: "AI Prompt", desc: "Test mavzusini yozing, AI qolgan barcha ishni o'zi bajaradi.", btn: "Yozish" },
      custom: { badge: "Qo'l Mehnati", title: "Oq Qog'oz", desc: "Matematik klaviatura yordamida o'z savollaringizni yozing.", btn: "Ochish" },
    }
  },
  en: {
    welcome: { morning: "Good Morning", afternoon: "Good Afternoon", evening: "Good Evening", subtitle: "What are we learning today?" },
    stats: { students: "Students", classes: "Active Classes", tests: "Tests Created" },
    headers: { create: "Creation Tools", manage: "Management Hub", limits: "Monthly AI Limit" },
    subscription: {
      trialTitle: "Try Pro for 30 Days FREE! 🎉",
      trialDesc: "Unlock unlimited tests, BSB generators, and full access to all AI teaching tools.",
      trialBtn: "Start Free Trial",
      current: "Current Plan",
      plans: { free: "Starter (Free)", pro: "Pro", vip: "VIP" }
    },
    actions: {
      library: { title: "My Library", desc: "All saved tests and materials" },
      classes: { title: "Classes & Students", desc: "Rosters and leaderboards" },
      analytics: { title: "Analytics", desc: "Performance tracking" },
      assignments: { title: "Assignments", desc: "Homework and grading" },
      settings: { title: "Settings", desc: "Profile and limits" },
    },
    tools: {
      bsb: { badge: "Official", title: "BSB & CHSB", desc: "Instantly generate matrix-based, official term exam papers.", btn: "Start" },
      maktab: { badge: "Daily", title: "Public School", desc: "Create quick quizzes and homework based on textbooks.", btn: "Start" },
      ixtisos: { badge: "Logic", title: "Specialized", desc: "Generate Olympiad-level logic problems for gifted students.", btn: "Start" },
      abiturient: { badge: "DTM", title: "Entrance Exams", desc: "Build highly competitive subject blocks formatted for exams.", btn: "Start" },
      mathOps: { badge: "New", title: "Arithmetic", desc: "Endless PDF worksheets for basic math operations.", btn: "Generate" },
      aiImage: { badge: "Scanner 📸", title: "Create via Image", desc: "Snap a photo of an old test to generate brand new variants.", btn: "Upload" },
      aiPrompt: { badge: "Auto", title: "AI Text Command", desc: "Describe your topic. AI builds the entire test for you.", btn: "Write" },
      custom: { badge: "Manual", title: "Blank Canvas", desc: "Write questions from scratch using the math keyboard.", btn: "Open" },
    }
  }
};

// ============================================================================
// 2. THEMES & ANIMATIONS
// ============================================================================
const THEMES = {
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'group-hover:bg-purple-600', border: 'hover:border-purple-300', shadow: 'hover:shadow-purple-500/20' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'group-hover:bg-blue-600', border: 'hover:border-blue-300', shadow: 'hover:shadow-blue-500/20' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'group-hover:bg-amber-500', border: 'hover:border-amber-300', shadow: 'hover:shadow-amber-500/20' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'group-hover:bg-emerald-600', border: 'hover:border-emerald-300', shadow: 'hover:shadow-emerald-500/20' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', iconBg: 'group-hover:bg-cyan-500', border: 'hover:border-cyan-300', shadow: 'hover:shadow-cyan-500/20' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'group-hover:bg-rose-500', border: 'hover:border-rose-300', shadow: 'hover:shadow-rose-500/20' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'group-hover:bg-violet-600', border: 'hover:border-violet-300', shadow: 'hover:shadow-violet-500/20' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', iconBg: 'group-hover:bg-teal-500', border: 'hover:border-teal-300', shadow: 'hover:shadow-teal-500/20' },
};

const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } } };

// SVG Decorative Background for Cards
const CardIllustration = ({ theme }: { theme: string }) => (
  <div className={`absolute inset-0 overflow-hidden rounded-[1.5rem] pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity duration-700 text-${theme}-500`}>
    <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <motion.circle cx="160" cy="160" r="70" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="10 10" animate={{ rotate: [0, 360] }} style={{ originX: "160px", originY: "160px" }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} />
      <motion.polygon points="40,140 70,190 10,190" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
    </svg>
  </div>
);

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================
export default function TeacherDashboard() {
  const { user } = useAuth() as any; 
  const router = useRouter();
  const { lang } = useTeacherLanguage() as { lang: LangType };
  const t = DASHBOARD_TRANSLATIONS[lang] || DASHBOARD_TRANSLATIONS['uz'];

  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [userData, setUserData] = useState<any>({ stats: { students: 0, classes: 0, tests: 0 }, sub: { planId: 'free', status: 'active', hasUsedTrial: false }, usage: { aiUsed: 0, aiLimit: 100 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t.welcome.morning);
    else if (hour < 18) setGreeting(t.welcome.afternoon);
    else setGreeting(t.welcome.evening);
    setCurrentDate(new Date().toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, [lang, t]);

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData({
            stats: { students: data.totalStudents || 0, classes: data.activeClassCount || 0, tests: (data.customTestCount || 0) + (data.bsbTestCount || 0) },
            sub: { planId: data.subscription?.planId || 'free', status: data.subscription?.status || 'active', hasUsedTrial: data.hasUsedTrial === true },
            usage: { aiUsed: data.usage?.aiQuestionsUsed || 0, aiLimit: data.currentLimits?.monthlyAiQuestions || 100 }
          });
        }
      } catch (error) { console.error("Failed to fetch data", error); } 
      finally { setLoading(false); }
    };
    fetchUserData();
  }, [user]);

  if (loading || !user) return <DashboardSkeleton />;

  const showTrialPrompt = userData.sub.planId === 'free' && !userData.sub.hasUsedTrial;

  // Plan Styling
  const getPlanStyle = () => {
    switch (userData.sub.planId) {
      case 'vip': return { bg: 'bg-gradient-to-r from-orange-400 to-amber-500', text: 'text-white', icon: <Crown size={14}/>, label: t.subscription.plans.vip };
      case 'pro': return { bg: 'bg-gradient-to-r from-indigo-500 to-purple-600', text: 'text-white', icon: <Sparkles size={14}/>, label: t.subscription.plans.pro };
      default: return { bg: 'bg-slate-100', text: 'text-slate-700', icon: <Layout size={14}/>, label: t.subscription.plans.free };
    }
  };
  const planStyle = getPlanStyle();

  // All Creation Tools Array
  const CREATION_TOOLS = [
    { id: 'bsb', icon: FileText, theme: 'purple', href: '/teacher/create/bsb-chsb', data: t.tools.bsb },
    { id: 'maktab', icon: School, theme: 'blue', href: '/teacher/create/maktab', data: t.tools.maktab },
    { id: 'ixtisos', icon: Award, theme: 'amber', href: '/teacher/create/ixtisoslashtirilgan_maktab', data: t.tools.ixtisos },
    { id: 'abiturient', icon: GraduationCap, theme: 'emerald', href: '/teacher/create/abiturient', data: t.tools.abiturient },
    { id: 'aiPrompt', icon: Bot, theme: 'violet', href: '/teacher/create/by_user_input', data: t.tools.aiPrompt },
    { id: 'aiImage', icon: ImageIcon, theme: 'rose', href: '/teacher/create/by_image', data: t.tools.aiImage },
    { id: 'mathOps', icon: Calculator, theme: 'cyan', href: '/teacher/create/operations', data: t.tools.mathOps },
    { id: 'custom', icon: PenTool, theme: 'teal', href: '/teacher/create/custom', data: t.tools.custom },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#F4F7FB] font-sans relative pb-28 md:pb-12 overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Background Soft Blob */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[40vh] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-10">        
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 md:space-y-8">
          
          {/* ================= 1. HEADER SECTION (Bento Card Variant) ================= */}
          <motion.div variants={itemVariants} className="w-full bg-white rounded-[1.5rem] p-5 md:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
            
            {/* Orqa fondagi yengil effekt */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Calendar size={14} /> {currentDate}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{user?.displayName?.split(' ')[0] || 'O\'qituvchi'}</span>!
              </h1>
              <p className="text-[13px] text-slate-500 font-medium">{t.welcome.subtitle}</p>
            </div>

            <div className="relative z-10">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 md:text-right">
                {t.subscription.current}
              </div>
              <div 
                onClick={() => router.push('/teacher/subscription')} 
                className={`flex items-center justify-center md:justify-end gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-sm border ${planStyle.bg} ${planStyle.text}`}
              >
                {planStyle.icon} {planStyle.label}
              </div>
            </div>
          </motion.div>

          {/* ================= 2. 30-DAY FREE TRIAL BANNER (High Visibility) ================= */}
          {showTrialPrompt && (
            <motion.div variants={itemVariants}>
              <div 
                onClick={() => router.push('/teacher/subscription')}
                className="relative overflow-hidden w-full rounded-[1.5rem] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 p-5 md:p-6 cursor-pointer shadow-xl shadow-emerald-500/20 group transition-transform hover:-translate-y-1 active:scale-[0.98] bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]"
              >
                {/* Decorative Elements */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-colors"></div>
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md shrink-0 border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
                      <Gift size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-[18px] md:text-2xl font-black text-white leading-tight drop-shadow-sm">{t.subscription.trialTitle}</h3>
                      <p className="text-[12px] md:text-[14px] text-emerald-50 font-medium mt-1 max-w-lg leading-snug">{t.subscription.trialDesc}</p>
                    </div>
                  </div>
                  <button className="w-full md:w-auto px-6 py-3 bg-white text-emerald-600 rounded-xl font-bold text-[13px] md:text-[14px] shadow-lg group-hover:shadow-xl transition-all flex items-center justify-center gap-2 shrink-0">
                    {t.subscription.trialBtn} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= 3. STATS & AI LIMIT GRID ================= */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard label={t.stats.tests} value={userData.stats.tests} icon={FileText} color="blue" />
            <StatCard label={t.stats.classes} value={userData.stats.classes} icon={Layout} color="violet" />
            <StatCard label={t.stats.students} value={userData.stats.students} icon={Users} color="emerald" />
            
            {/* AI Usage Limit Box */}
            <div className="p-4 bg-white border border-slate-200/80 rounded-[1.25rem] md:rounded-[1.5rem] flex flex-col justify-between shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group" onClick={() => router.push('/teacher/subscription')}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t.headers.limits}</span>
                <Zap size={16} className="text-amber-500 group-hover:scale-110 transition-transform"/>
              </div>
              <div>
                <div className="flex items-end gap-1 mb-1.5">
                  <span className="text-[20px] md:text-[24px] font-black text-slate-800 leading-none">{userData.usage.aiUsed}</span>
                  <span className="text-[11px] md:text-[13px] font-bold text-slate-400 mb-0.5">/ {userData.usage.aiLimit >= 5000 ? '∞' : userData.usage.aiLimit}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${userData.usage.aiUsed >= userData.usage.aiLimit * 0.8 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`} style={{ width: `${Math.min((userData.usage.aiUsed / userData.usage.aiLimit) * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* ================= 4. LEFT COLUMN: CREATION TOOLS (Vibrant Grid) ================= */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Target size={18} className="text-indigo-500" />
                <h2 className="text-[16px] md:text-[18px] font-black text-slate-800">{t.headers.create}</h2>
              </div>
              
              {/* Unified Colorful Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {CREATION_TOOLS.map((tool) => (
                  <CreateToolCard 
                    key={tool.id} 
                    icon={tool.icon} 
                    title={tool.data.title} 
                    desc={tool.data.desc} 
                    badge={tool.data.badge} 
                    themeName={tool.theme} 
                    onClick={() => router.push(tool.href)} 
                  />
                ))}
              </div>
            </div>

            {/* ================= 5. RIGHT COLUMN: MANAGEMENT HUB ================= */}
            <div className="space-y-4 mt-6 lg:mt-0">
              <div className="flex items-center gap-2 px-1">
                <BookOpen size={18} className="text-slate-500" />
                <h2 className="text-[16px] md:text-[18px] font-black text-slate-800">{t.headers.manage}</h2>
              </div>
              
              <div className="flex flex-col gap-2.5 md:gap-3">
                <ManagementRow icon={Library} title={t.actions.library.title} desc={t.actions.library.desc} onClick={() => router.push('/teacher/library')} />
                <ManagementRow icon={Users} title={t.actions.classes.title} desc={t.actions.classes.desc} onClick={() => router.push('/teacher/classes')} />
                <ManagementRow icon={ClipboardList} title={t.actions.assignments.title} desc={t.actions.assignments.desc} onClick={() => router.push('/teacher/library/tests')} />
                <ManagementRow icon={BarChart2} title={t.actions.analytics.title} desc={t.actions.analytics.desc} onClick={() => router.push('/teacher/analytics')} />
                <ManagementRow icon={Settings} title={t.actions.settings.title} desc={t.actions.settings.desc} onClick={() => router.push('/teacher/profile')} />
              </div>
            </div>

          </div>

        </motion.div>
      </main>
    </div>
  );
}

// ============================================================================
// 4. SUB-COMPONENTS
// ============================================================================

const StatCard = ({ label, value, icon: Icon, color }: any) => {
  const colorMap: any = {
    blue: { light: 'bg-blue-50', text: 'text-blue-600' },
    violet: { light: 'bg-violet-50', text: 'text-violet-600' },
    emerald: { light: 'bg-emerald-50', text: 'text-emerald-600' },
  };
  const theme = colorMap[color];
  return (
    <motion.div variants={itemVariants} className="p-4 bg-white border border-slate-200/80 rounded-[1.25rem] md:rounded-[1.5rem] flex flex-col items-start gap-2 shadow-sm relative overflow-hidden">
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] flex items-center justify-center ${theme.light} ${theme.text}`}>
        <Icon size={18} className="md:w-5 md:h-5" strokeWidth={2.5} />
      </div>
      <div className="mt-1">
        <span className="text-[20px] md:text-[24px] font-black text-slate-800 leading-none block mb-1">{value}</span>
        <span className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
    </motion.div>
  );
};

// VIBRANT TOOL CARD (Brings the beautiful Hub design into the Dashboard)
const CreateToolCard = ({ icon: Icon, title, desc, badge, themeName, onClick }: any) => {
  const theme = THEMES[themeName as keyof typeof THEMES];
  
  return (
    <motion.button 
      whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
      onClick={onClick} 
      className={`relative flex items-center p-3.5 md:p-5 bg-white border border-slate-200/80 rounded-[1.25rem] md:rounded-[1.5rem] text-left shadow-sm transition-all group overflow-hidden ${theme.border} ${theme.shadow}`}
    >
      <CardIllustration theme={themeName} />
      
      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${theme.bg} ${theme.text} ${theme.iconBg} group-hover:text-white mr-3 md:mr-4 shadow-sm z-10`}>
        <Icon size={24} strokeWidth={2} className="md:w-7 md:h-7" />
      </div>
      
      <div className="flex-1 min-w-0 pr-1 z-10">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`text-[14px] md:text-[16px] font-black text-slate-800 group-hover:${theme.text} truncate transition-colors`}>{title}</h4>
          <span className={`text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 bg-white ${theme.text} border-${themeName}-200 shadow-sm hidden sm:inline-block`}>
            {badge}
          </span>
        </div>
        <p className="text-[11px] md:text-[13px] text-slate-500 font-medium line-clamp-2 leading-snug">{desc}</p>
      </div>
    </motion.button>
  );
};

// COMPACT MANAGEMENT ROWS
const ManagementRow = ({ icon: Icon, title, desc, onClick }: any) => (
  <motion.button 
    whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
    onClick={onClick} 
    className="w-full flex items-center justify-between p-3 md:p-3.5 bg-white border border-slate-200/80 hover:border-slate-300 rounded-[1rem] md:rounded-[1.25rem] transition-all shadow-sm group"
  >
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 md:w-10 md:h-10 rounded-[10px] bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
        <Icon size={16} className="md:w-[18px] md:h-[18px] text-slate-500 group-hover:text-indigo-600 transition-colors" />
      </div>
      <div className="text-left">
        <h4 className="text-[13px] md:text-[14px] font-bold text-slate-800 mb-0.5">{title}</h4>
        <p className="text-[10px] md:text-[11px] text-slate-500 font-medium">{desc}</p>
      </div>
    </div>
    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 mr-1 transition-colors md:w-[18px] md:h-[18px]" />
  </motion.button>
);

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-[#F4F7FB] p-4 max-w-[1200px] mx-auto space-y-6 pt-8">
    <div className="h-12 w-64 bg-slate-200 rounded-xl animate-pulse"></div>
    <div className="h-32 w-full bg-slate-200 rounded-[1.5rem] animate-pulse"></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="h-28 bg-slate-200 rounded-[1.5rem] animate-pulse"></div><div className="h-28 bg-slate-200 rounded-[1.5rem] animate-pulse"></div>
      <div className="h-28 bg-slate-200 rounded-[1.5rem] animate-pulse"></div><div className="h-28 bg-slate-200 rounded-[1.5rem] animate-pulse"></div>
    </div>
  </div>
);