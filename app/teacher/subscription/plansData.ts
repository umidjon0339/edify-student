// app/teacher/subscription/plansData.ts

export type PlanId = 'free' | 'pro' | 'vip';

// 🟢 1. BARCHA XUSUSIYATLAR RO'YXATI (FEATURE REGISTRY)
export type FeatureKey = 
  | 'ONLINE_LIBRARY'
  | 'MATH_WORKSHEETS'
  | 'PDF_EXPORT'
  | 'IMAGE_AI'
  | 'BSB_GENERATOR'
  | 'ANALYTICS'
  | 'CLOUD_STORAGE'
  

export const FEATURE_REGISTRY: Record<FeatureKey, { label: string; tooltip?: string }> = {
  ONLINE_LIBRARY: { label: "Onlayn kutubxona" },
  MATH_WORKSHEETS: { label: "Matematik ishchi varoqlar" },
  PDF_EXPORT: { label: "PDF formatda chop etish" },
  IMAGE_AI: { label: "Rasm orqali AI test yaratish" },
  BSB_GENERATOR: { label: "BSB va CHSB yaratish" },
  ANALYTICS: { label: "O'quvchilar reytingi va tahlili" },
  CLOUD_STORAGE: { label: "Sinfga material yuklash (Cloud)" },

};

// 🟢 2. NARXLAR UCHUN MAXSUS INTERFEYS
export interface PricingPeriod {
  price: number;          // Foydalanuvchi to'laydigan YAKUNIY aniq narx
  originalPrice?: number; // Eski narx. Agar kiritilmasa yoki 'price' bilan teng bo'lsa, chegirma yo'q!
  periodLabel: string;    // "so'm / oy"
}

export interface PlanConfig {
  id: PlanId;
  tierLevel: number;
  ui: {
    name: string;
    badge: string | null;
    description: string;
    buttonText: string;
    isPopular: boolean;
  };
  pricing: {
    isFree: boolean;
    monthly: PricingPeriod;
    sixMonth: PricingPeriod;
  };
  paymentIds: { payme: string | null; click: string | null; };
  limits: { maxClasses: number; maxStudents: number; monthlyAiQuestions: number; };
  displayLimits: { classes: string; students: string; aiQuestions: string; };
  includedFeatures: FeatureKey[];
}

// 🟢 3. GLOBAL PROMO BANNER (Null qilsangiz o'chadi)
export const ACTIVE_PROMO: string | null = "⚡ Ilk foydalanuvchilar uchun: Barcha ta'riflarda 40% gacha tejab qoling!";

// 🟢 4. ASOSIY BAZA
export const PLANS_CONFIG: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    tierLevel: 0,
    ui: { name: "Start", badge: null, description: "Platforma imkoniyatlari bilan tanishish uchun.", buttonText: "Joriy Tarif", isPopular: false },
    pricing: {
      isFree: true,
      monthly: { price: 0, originalPrice: 0, periodLabel: "so'm / oy" },
      sixMonth: { price: 0, originalPrice: 0, periodLabel: "so'm / 6 oy" }
    },
    paymentIds: { payme: null, click: null },
    limits: { maxClasses: 1, maxStudents: 20, monthlyAiQuestions: 100 },
    displayLimits: { classes: "1 ta sinf", students: "20 ta o'quvchi", aiQuestions: "100 ta savol / oy" },
    includedFeatures: ['ONLINE_LIBRARY'] 
  },

  pro: {
    id: "pro",
    tierLevel: 1,
    ui: { name: "Pro Teacher", badge: "Tavsiya etiladi", description: "Faol o'qituvchilar uchun barcha kerakli vositalar.", buttonText: "Pro'ga o'tish", isPopular: true },
    pricing: {
      isFree: false,
      // OYLIK CHEGIRMA: Eski narx 69,000, hozirgi narx 49,000 (Agar chegirma xohlamasangiz ikkalasiga ham 49000 yozing)
      monthly: { price: 49000, originalPrice: 99000, periodLabel: "so'm / oy" },
      // 6 OYLIK CHEGIRMA: Eski narx 414,000 (69k x 6), hozirgi narx 235,000
      sixMonth: { price: 235000, originalPrice: 414000, periodLabel: "so'm / 6 oy" } 
    },
    paymentIds: { payme: "prod_pro_monthly", click: "srv_pro_123" },
    limits: { maxClasses: 5, maxStudents: 200, monthlyAiQuestions: 1000 },
    displayLimits: { classes: "5 ta sinfgacha", students: "200 o'quvchi", aiQuestions: "1,000 ta savol" },
    includedFeatures: ['ONLINE_LIBRARY', 'MATH_WORKSHEETS', 'PDF_EXPORT', 'IMAGE_AI', 'BSB_GENERATOR', 'ANALYTICS']
  },

  vip: {
    id: "vip",
    tierLevel: 2,
    ui: { name: "VIP Teacher", badge: "Premium", description: "Cheklovsiz erkinlik va bulutli xotira.", buttonText: "VIP'ga o'tish", isPopular: false },
    pricing: {
      isFree: false,
      // OYLIK CHEGIRMA
      monthly: { price: 149000, originalPrice: 199000, periodLabel: "so'm / oy" },
      // 6 OYLIK CHEGIRMA
      sixMonth: { price: 415000, originalPrice: 774000, periodLabel: "so'm / 6 oy" } 
    },
    paymentIds: { payme: "prod_vip_monthly", click: "srv_vip_123" },
    limits: { maxClasses: 9999, maxStudents: 99999, monthlyAiQuestions: 5000 },
    displayLimits: { classes: "Cheklanmagan", students: "Cheklanmagan", aiQuestions: "5,000 ta savol" },
    includedFeatures: ['ONLINE_LIBRARY', 'MATH_WORKSHEETS', 'PDF_EXPORT', 'IMAGE_AI', 'BSB_GENERATOR', 'ANALYTICS', 'CLOUD_STORAGE']
  }
};