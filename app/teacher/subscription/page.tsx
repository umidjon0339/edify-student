'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Tag, ArrowLeft, Layout, Zap, Users, Bot, PhoneCall, Loader2, Star, Send, Crown } from 'lucide-react';
import { PLANS_CONFIG, ACTIVE_PROMO, FEATURE_REGISTRY, FeatureKey } from './plansData';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions'; 
import { functions, auth, db } from '@/lib/firebase'; 
import { doc, onSnapshot } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

// 🟢 GLOBAL LANGUAGE HOOK
import { useTeacherLanguage } from '@/app/teacher/layout';

// 🟢 TRANSLATION DICTIONARY
const TRANSLATIONS = {
  uz: {
    back: "Orqaga",
    loading: "Ma'lumotlar yuklanmoqda...",
    currentStatus: "Joriy Limitlar",
    activeClasses: "Sinflar",
    students: "O'quvchilar",
    aiRequests: "AI So'rovlar",
    renews: "Yangilanadi:",
    choosePlan: "Tarifni tanlang",
    monthly: "1 Oylik",
    sixMonth: "6 Oylik",
    discount: "Chegirma",
    activeBadge: "FAOL",
    saveBadge: "TEJANG",
    free: "BEPUL",
    currency: "so'm",
    currentPlanBtn: "Joriy Tarif",
    trialBtn: "30 Kun Bepul Sinash",
    purchaseBtn: "Tarifga O'tish",
    trialSuccessTitle: "Tabriklaymiz! 🎉",
    trialSuccessDesc: "Siz 30 kunlik Pro tarifini muvaffaqiyatli faollashtirdingiz. Barcha premium imkoniyatlardan 1 oy davomida bepul foydalanishingiz mumkin.",
    contactAdminTitle: "Tarifni Faollashtirish",
    contactAdminDesc: "Ushbu tarifni xarid qilish va hisobingizni faollashtirish uchun admin bilan Telegram orqali bog'laning.",
    selectedPlan: "Tanlangan Tarif:",
    telegramBtn: "Telegram orqali yozish",
    closeBtn: "Yopish",
    b2bTag: "B2B / Ta'lim markazlari",
    b2bTitle: "Maxsus Litsenziya",
    b2bDesc: "Maktablar va o'quv markazlari uchun. Cheklovsiz o'quvchilar va maxsus arzonlashtirilgan narxlar kafolatlanadi.",
    b2bBtn: "Admin bilan bog'lanish",
    unlimited: "Cheksiz"
  },
  ru: {
    back: "Назад",
    loading: "Загрузка...",
    currentStatus: "Текущие Лимиты",
    activeClasses: "Классы",
    students: "Ученики",
    aiRequests: "AI Запросы",
    renews: "Обновляется:",
    choosePlan: "Выберите тариф",
    monthly: "1 Месяц",
    sixMonth: "6 Месяцев",
    discount: "Скидка",
    activeBadge: "АКТИВЕН",
    saveBadge: "ЭКОНОМИЯ",
    free: "БЕСПЛАТНО",
    currency: "сум",
    currentPlanBtn: "Текущий тариф",
    trialBtn: "30 дней бесплатно",
    purchaseBtn: "Выбрать тариф",
    trialSuccessTitle: "Поздравляем! 🎉",
    trialSuccessDesc: "Вы успешно активировали тариф Pro на 30 дней. Пользуйтесь всеми премиум функциями бесплатно.",
    contactAdminTitle: "Активация тарифа",
    contactAdminDesc: "Для приобретения этого тарифа и активации аккаунта свяжитесь с администратором через Telegram.",
    selectedPlan: "Выбранный тариф:",
    telegramBtn: "Написать в Telegram",
    closeBtn: "Закрыть",
    b2bTag: "Для школ и центров",
    b2bTitle: "Специальная лицензия",
    b2bDesc: "Для школ и учебных центров. Неограниченное количество учеников и специальные скидки.",
    b2bBtn: "Связаться с админом",
    unlimited: "Безлимит"
  },
  en: {
    back: "Back",
    loading: "Loading...",
    currentStatus: "Current Limits",
    activeClasses: "Classes",
    students: "Students",
    aiRequests: "AI Requests",
    renews: "Renews:",
    choosePlan: "Choose a Plan",
    monthly: "1 Month",
    sixMonth: "6 Months",
    discount: "Discount",
    activeBadge: "ACTIVE",
    saveBadge: "SAVE",
    free: "FREE",
    currency: "UZS",
    currentPlanBtn: "Current Plan",
    trialBtn: "30 Days Free",
    purchaseBtn: "Upgrade Plan",
    trialSuccessTitle: "Congratulations! 🎉",
    trialSuccessDesc: "You have successfully activated the Pro plan for 30 days. Enjoy all premium features for free.",
    contactAdminTitle: "Plan Activation",
    contactAdminDesc: "To purchase this plan and activate your account, please contact the admin via Telegram.",
    selectedPlan: "Selected Plan:",
    telegramBtn: "Contact via Telegram",
    closeBtn: "Close",
    b2bTag: "Schools & B2B",
    b2bTitle: "Custom License",
    b2bDesc: "Designed for schools and educational centers. Unlimited students and special discounted prices.",
    b2bBtn: "Contact Admin",
    unlimited: "Unlimited"
  }
};

export default function SubscriptionPage() { 
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // 🟢 USE GLOBAL LANGUAGE HOOK
  const { lang } = useTeacherLanguage();
  const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS] || TRANSLATIONS['uz'];

  const [isSixMonth, setIsSixMonth] = useState(false);
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🟢 MODAL STATES
  const [trialSuccessModal, setTrialSuccessModal] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{isOpen: boolean, planName: string, period: string}>({ isOpen: false, planName: "", period: "" });

  useEffect(() => {
    setMounted(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubscribeDb = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setCurrentUser({ id: docSnap.id, ...docSnap.data() });
          }
          setLoading(false);
        });
        return () => unsubscribeDb();
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const plansArray = Object.values(PLANS_CONFIG);
  const allFeatureKeys = Object.keys(FEATURE_REGISTRY) as FeatureKey[];

  const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const hasUsedTrial = currentUser?.hasUsedTrial === true;
  const currentPlanId = currentUser?.subscription?.planId || 'free';
  const isActive = currentUser?.subscription?.status === 'active' || currentUser?.subscription?.status === 'trialing';

  const limits = currentUser?.currentLimits || { maxClasses: 1, maxStudents: 20, monthlyAiQuestions: 100 };
  const usage = currentUser?.usage || { activeClassCount: 0, totalStudents: 0, aiQuestionsUsed: 0, aiLimitResetDate: '' };
  
  const handleStartTrial = async () => {
    setIsActivatingTrial(true);
    try {
      const startFreeTrial = httpsCallable(functions, 'startFreeTrial');
      await startFreeTrial();
      setTrialSuccessModal(true); 
    } catch (error: any) {
      toast.error(error.message || "Error activating trial.");
    } finally {
      setIsActivatingTrial(false);
    }
  };

  const handlePurchaseClick = (planName: string) => {
    const period = isSixMonth ? t.sixMonth : t.monthly;
    setPurchaseModal({ isOpen: true, planName, period });
  };

  const getTheme = (planId: string) => {
    switch(planId) {
      case 'pro': return {
        gradient: 'bg-gradient-to-br from-purple-600 to-indigo-600',
        btn: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/30',
        highlightBorder: 'border-2 border-indigo-500 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.4)]'
      };
      case 'vip': return {
        gradient: 'bg-gradient-to-br from-orange-500 to-amber-400',
        btn: 'bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 text-white shadow-lg shadow-orange-500/30',
        highlightBorder: 'border-2 border-orange-500 shadow-[0_10px_30px_-10px_rgba(249,115,22,0.4)]'
      };
      default: return { 
        gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500',
        btn: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-cyan-500/30',
        highlightBorder: 'border border-slate-200 shadow-sm'
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-600 mb-3" />
        <p className="text-slate-500 font-bold text-sm">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans pb-20 selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
      
      <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-slate-100 to-transparent pointer-events-none z-0"></div>

      <AnimatePresence>
        {ACTIVE_PROMO && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="relative z-30 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white py-2 px-3 text-center text-[11px] md:text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-sm bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
            <Tag size={14} className="animate-pulse" /> {ACTIVE_PROMO}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 ULTRA-MINIMAL TOP BAR */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 pt-4 md:pt-6">
        <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 text-slate-600 hover:text-slate-900 bg-white rounded-full border border-slate-200 shadow-sm transition-all active:scale-95">
          <ArrowLeft size={18} /> <span className="hidden md:block font-bold text-[13px] ml-1.5">{t.back}</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10 pt-4 md:pt-6">

        {/* 🟢 COMPACT LIMITS DASHBOARD */}
        <div className="mb-8 md:mb-12 bg-slate-900 rounded-[1.5rem] p-4 md:p-6 shadow-lg border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <h2 className="text-white font-black text-[14px] md:text-[16px] mb-4 flex items-center gap-1.5">
            <Zap className="text-amber-400" size={16} /> {t.currentStatus}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
            <UserUsageBar icon={<Layout size={12} />} label={t.activeClasses} used={usage.activeClassCount} limit={limits.maxClasses} colorClass="bg-emerald-500" t={t} />
            <UserUsageBar icon={<Users size={12} />} label={t.students} used={usage.totalStudents} limit={limits.maxStudents} colorClass="bg-blue-500" t={t} />
            <UserUsageBar icon={<Bot size={12} />} label={t.aiRequests} used={usage.aiQuestionsUsed} limit={limits.monthlyAiQuestions} colorClass="bg-indigo-500" resetDate={usage.aiLimitResetDate} t={t} />
          </div>
        </div>
        
        {/* HEADER */}
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[22px] md:text-4xl font-black text-slate-900 tracking-tight mb-5 leading-tight">
            {t.choosePlan}
          </motion.h1>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center p-1 bg-slate-200/60 rounded-xl border border-slate-200/80 backdrop-blur-sm">
            <button onClick={() => setIsSixMonth(false)} className={`px-4 py-2 md:px-6 md:py-2.5 rounded-lg text-[12px] md:text-[13px] font-bold transition-all ${!isSixMonth ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {t.monthly}
            </button>
            <button onClick={() => setIsSixMonth(true)} className={`px-4 py-2 md:px-6 md:py-2.5 rounded-lg text-[12px] md:text-[13px] font-bold transition-all flex items-center gap-1.5 ${isSixMonth ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}>
              {t.sixMonth} 
              <span className={`text-[8px] md:text-[9px] uppercase px-1.5 py-0.5 rounded flex-shrink-0 font-black ${isSixMonth ? 'bg-indigo-400/30 text-white' : 'bg-indigo-100 text-indigo-600'}`}>{t.discount}</span>
            </button>
          </motion.div>
        </div>

        {/* PRICING CARDS (Ultra-Compact on Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 mb-12">
          {plansArray.map((plan, index) => {
            const currentPricing = isSixMonth ? plan.pricing.sixMonth : plan.pricing.monthly;
            const finalPrice = currentPricing.price;
            const oldPrice = currentPricing.originalPrice || 0;
            const hasDiscount = oldPrice > finalPrice && !plan.pricing.isFree;
            const savings = oldPrice - finalPrice;
            const discountPercent = hasDiscount ? Math.round(((oldPrice - finalPrice) / oldPrice) * 100) : 0;
            
            const isHighlighted = (isSixMonth && plan.id === 'vip') || (!isSixMonth && plan.id === 'pro');
            const theme = getTheme(plan.id);

            const isCurrentPlan = currentPlanId === plan.id && isActive;
            const isTrialAvailable = plan.id === 'pro' && !hasUsedTrial && currentPlanId === 'free';
            
            let buttonText = plan.pricing.isFree ? plan.ui.buttonText : t.purchaseBtn;
            if (isCurrentPlan) buttonText = t.currentPlanBtn;
            else if (isTrialAvailable) buttonText = t.trialBtn;

            return (
              <motion.div 
                key={plan.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
                className={`relative bg-white rounded-[1.5rem] transition-all flex flex-col overflow-hidden ${isHighlighted ? `${theme.highlightBorder} lg:-translate-y-2` : 'border border-slate-200 shadow-sm'}`}
              >
                <div className={`p-5 md:p-6 text-center text-white relative ${theme.gradient}`}>
                  {(plan.ui.badge || hasDiscount || isCurrentPlan) && (
                    <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                      {isCurrentPlan ? t.activeBadge : (hasDiscount ? `${discountPercent}% ${t.saveBadge}` : plan.ui.badge)}
                    </div>
                  )}

                  <h3 className="text-[15px] md:text-[17px] font-bold uppercase tracking-widest mb-3 opacity-90">{plan.ui.name}</h3>
                  
                  <div className="flex flex-col items-center justify-center min-h-[70px] md:min-h-[80px]">
                    {plan.pricing.isFree ? (
                      <span className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-sm">{t.free}</span>
                    ) : (
                      <>
                        {hasDiscount && !isCurrentPlan && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11px] md:text-[12px] font-bold text-white/70 line-through decoration-rose-400">
                              {formatNumber(oldPrice)}
                            </span>
                            <span className="bg-rose-500 text-white text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                              -{formatNumber(savings)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-end justify-center gap-1">
                          <span className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-sm leading-none">{formatNumber(finalPrice)}</span>
                        </div>
                        <span className="text-[10px] md:text-[11px] font-bold text-white/80 mt-1.5 block">{currentPricing.periodLabel}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-5 md:p-6 flex-1 flex flex-col bg-white">
                  
                  <div className="space-y-3 mb-5 pb-5 border-b border-slate-100">
                    <div className="flex justify-between items-center text-[11px] md:text-[12px]">
                      <span className="font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Layout size={14}/> {t.activeClasses}</span>
                      <span className="font-black text-slate-900">{plan.displayLimits.classes}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] md:text-[12px]">
                      <span className="font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Users size={14}/> {t.students}</span>
                      <span className="font-black text-slate-900">{plan.displayLimits.students}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] md:text-[12px]">
                      <span className="font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5"><Bot size={14}/> {t.aiRequests}</span>
                      <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{plan.displayLimits.aiQuestions}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 mb-6">
                    {allFeatureKeys.map((featureKey) => {
                      const isIncluded = plan.includedFeatures.includes(featureKey);
                      const featureInfo = FEATURE_REGISTRY[featureKey];

                      return (
                        <div key={featureKey} className={`flex items-start gap-2.5 text-[11px] md:text-[12px] font-bold group ${isIncluded ? 'text-slate-700' : 'text-slate-400 opacity-50'}`}>
                          {isIncluded ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <XCircle size={16} className="text-slate-300 shrink-0" />}
                          <span className="leading-snug flex items-center gap-1">
                            {featureInfo.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {isCurrentPlan ? (
                    <button disabled className="w-full py-3 rounded-xl font-black text-[12px] uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-500/20 flex items-center justify-center gap-1.5">
                      <Star size={14} className="fill-emerald-600" /> {t.currentPlanBtn}
                    </button>
                  ) : (
                    <button 
                      disabled={(isActivatingTrial && isTrialAvailable) || (plan.pricing.isFree)}
                      onClick={() => {
                        if (isTrialAvailable) {
                          handleStartTrial();
                        } else if (!plan.pricing.isFree) {
                          handlePurchaseClick(plan.ui.name); 
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-black text-[12px] uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${plan.pricing.isFree ? 'bg-slate-100 text-slate-400' : theme.btn} disabled:opacity-70`}
                    >
                      {(isActivatingTrial && isTrialAvailable) ? <Loader2 size={16} className="animate-spin" /> : buttonText}
                    </button>
                  )}
                </div>

              </motion.div>
            );
          })}
        </div>

        {/* CUSTOM B2B BANNER */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-slate-900 rounded-[1.5rem] p-6 md:p-10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-60 h-60 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="relative z-10 text-center sm:text-left flex-1">
            <div className="inline-flex px-3 py-1 rounded bg-white/10 text-white text-[9px] font-black uppercase tracking-widest mb-3 border border-white/10">
              {t.b2bTag}
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">{t.b2bTitle}</h3>
            <p className="text-slate-300 font-medium text-[12px] md:text-[13px] leading-relaxed mx-auto sm:mx-0 max-w-sm">
              {t.b2bDesc}
            </p>
          </div>
          
          <div className="relative z-10 w-full sm:w-auto shrink-0">
            <button onClick={() => window.open('https://t.me/Umidjon0339', '_blank')} className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-900 font-black text-[12px] md:text-[13px] uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
              <PhoneCall size={16} /> {t.b2bBtn}
            </button>
          </div>
        </motion.div>

      </div>

      {/* ===================================================================== */}
      {/* 🟢 MODALS (PORTALIZED FOR Z-INDEX SAFETY)                             */}
      {/* ===================================================================== */}

      {mounted && createPortal(
        <AnimatePresence>
          {trialSuccessModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] p-6 w-full max-w-sm shadow-2xl z-10 flex flex-col items-center text-center overflow-hidden">
                <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-500/20 rounded-full blur-[60px] pointer-events-none"></div>
                
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 border border-emerald-200 shadow-inner relative z-10">
                  <Star size={32} className="fill-emerald-500 text-emerald-500" />
                </div>
                
                <h3 className="text-[18px] font-black text-slate-900 mb-2 relative z-10">{t.trialSuccessTitle}</h3>
                <p className="text-[12px] md:text-[13px] text-slate-500 mb-6 font-medium leading-relaxed relative z-10">
                  {t.trialSuccessDesc}
                </p>
                
                <button onClick={() => setTrialSuccessModal(false)} className="w-full py-3 bg-slate-900 hover:bg-black text-white font-black rounded-xl shadow-md transition-all active:scale-95 text-[12px] md:text-[13px] relative z-10">
                  {t.closeBtn}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {purchaseModal.isOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPurchaseModal({ isOpen: false, planName: "", period: "" })} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] p-6 w-full max-w-sm shadow-2xl z-10 flex flex-col items-center text-center">
                
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100 shadow-inner">
                  <Crown size={24} className="text-indigo-500" />
                </div>
                
                <h3 className="text-[16px] md:text-[18px] font-black text-slate-900 mb-2">{t.contactAdminTitle}</h3>
                
                <div className="bg-slate-50 border border-slate-100 w-full p-3 rounded-xl mb-4 text-left">
                  <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.selectedPlan}</p>
                  <p className="text-[13px] md:text-[14px] font-bold text-indigo-700">{purchaseModal.planName} • {purchaseModal.period}</p>
                </div>

                <p className="text-[11px] md:text-[12px] text-slate-500 mb-6 font-medium leading-relaxed">
                  {t.contactAdminDesc}
                </p>
                
                <div className="w-full flex flex-col gap-2">
                  <button onClick={() => window.open('https://t.me/Umidjon0339', '_blank')} className="w-full py-3 bg-[#0088cc] hover:bg-[#0077b3] text-white font-black rounded-xl shadow-sm transition-all active:scale-[0.98] text-[12px] md:text-[13px] flex items-center justify-center gap-2">
                    <Send size={16} /> {t.telegramBtn}
                  </button>
                  <button onClick={() => setPurchaseModal({ isOpen: false, planName: "", period: "" })} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl active:scale-[0.98] text-[12px] md:text-[13px] transition-colors">
                    {t.closeBtn}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}

// 🟢 ULTRA-COMPACT USAGE BAR
function UserUsageBar({ icon, label, used, limit, colorClass, resetDate, t }: any) {
  const isUnlimited = limit >= 5000;
  const percent = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isDanger = percent >= 90 && !isUnlimited; 

  return (
    <div className="bg-white p-3.5 md:p-4 rounded-[1rem] border border-slate-200 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
          {icon} <span className="truncate max-w-[80px] sm:max-w-full">{label}</span>
        </div>
        <div className="text-right flex items-baseline gap-0.5">
          <span className={`text-[15px] md:text-[18px] font-black leading-none tracking-tight ${isDanger ? 'text-rose-500' : 'text-slate-800'}`}>
            {used}
          </span>
          <span className="text-slate-400 font-bold text-[10px]">
            {isUnlimited ? `/${t.unlimited}` : `/${limit}`}
          </span>
        </div>
      </div>

      {!isUnlimited && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${isDanger ? 'bg-rose-500' : colorClass}`} style={{ width: `${percent}%` }}></div>
        </div>
      )}
      {isUnlimited && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-emerald-400 to-teal-400 opacity-50"></div>
        </div>
      )}
      
      {resetDate && (
        <div className="text-[9px] font-medium text-slate-400 mt-1.5 truncate">
          {t.renews} {resetDate}
        </div>
      )}
    </div>
  );
}