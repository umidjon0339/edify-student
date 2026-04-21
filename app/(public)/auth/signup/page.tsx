"use client";

import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageContext } from "@/app/(public)/layout";
import { Step0Role } from "./_components/FormSteps";
import TeacherSignupFlow from "./_components/TeacherSignupFlow";
import StudentSignupFlow from "./_components/StudentSignupFlow";

// --- 1. TURBO TRANSLATION DICTIONARY ---
export const SIGNUP_TRANSLATIONS = {
  uz: {
    steps: {
      0: { title: "Yo'nalishni tanlang", sub: "O'qishni xohlaysizmi yoki o'qitishni?" },
      1: { title: "Hisob yaratish", sub: "1 / 2 qadam" },
      2: { title: "Shaxsiy ma'lumotlar", sub: "2 / 2 qadam" }
    },
    roles: {
      student: { title: "Men O'quvchiman", desc: "Fanlarni o'rganish, XP yig'ish va natijalarni kuzatish." },
      teacher: { title: "Men O'qituvchiman", desc: "Testlar yaratish va o'quvchilarni boshqarish." }
    },
    inputs: { email: "Email manzili", username: "Foydalanuvchi nomi", password: "Parol", fullname: "To'liq ism (F.I.O)" },
    buttons: { next: "Keyingi qadam", back: "Ortga", complete: "Ro'yxatdan o'tish", loginLink: "Hisobingiz bormi? Kirish" },
    validation: { fillAll: "Iltimos, barcha maydonlarni to'ldiring.", userTaken: "Bu nom band qilingan.", welcome: "Xush kelibsiz, {role}!" },
    terms: {
      text1: "Men qabul qilaman: ",
      link1: "Foydalanish shartlari",
      text2: " va ",
      link2: "Maxfiylik siyosatiga",
      text3: "."
    },
    policyModals: {
      termsTitle: "Foydalanish Shartlari",
      privacyTitle: "Maxfiylik Siyosati",
      close: "Yopish"
    }
  },
  en: {
    steps: {
      0: { title: "Choose your path", sub: "Are you learning or teaching?" },
      1: { title: "Create Account", sub: "Step 1 of 2" },
      2: { title: "Personal Details", sub: "Step 2 of 2" }
    },
    roles: {
      student: { title: "I am a Student", desc: "Learn, earn XP, and track progress." },
      teacher: { title: "I am a Teacher", desc: "Create tests and manage students." }
    },
    inputs: { email: "Email Address", username: "Username", password: "Password", fullname: "Full Name" },
    buttons: { next: "Next Step", back: "Back", complete: "Complete Registration", loginLink: "Already have an account? Log in" },
    validation: { fillAll: "Please fill in all fields.", userTaken: "Username is taken.", welcome: "Welcome, {role}!" },
    terms: {
      text1: "I agree to the ",
      link1: "Terms of Service",
      text2: " and ",
      link2: "Privacy Policy",
      text3: "."
    },
    policyModals: {
      termsTitle: "Terms of Service",
      privacyTitle: "Privacy Policy",
      close: "Close"
    }
  },
  ru: {
    steps: {
      0: { title: "Выберите путь", sub: "Вы учитесь или преподаете?" },
      1: { title: "Создать аккаунт", sub: "Шаг 1 из 2" },
      2: { title: "Личные данные", sub: "Шаг 2 из 2" }
    },
    roles: {
      student: { title: "Я Ученик", desc: "Учиться, получать XP и следить за прогрессом." },
      teacher: { title: "Я Учитель", desc: "Создавать тесты и управлять учениками." }
    },
    inputs: { email: "Эл. почта", username: "Имя пользователя", password: "Пароль", fullname: "Ф.И.О" },
    buttons: { next: "Далее", back: "Назад", complete: "Завершить", loginLink: "Уже есть аккаунт? Войти" },
    validation: { fillAll: "Пожалуйста, заполните все поля.", userTaken: "Имя пользователя занято.", welcome: "Добро пожаловать, {role}!" },
    terms: {
      text1: "Я согласен с ",
      link1: "Условиями использования",
      text2: " и ",
      link2: "Политикой конфиденциальности",
      text3: "."
    },
    policyModals: {
      termsTitle: "Условия Использования",
      privacyTitle: "Политика Конфиденциальности",
      close: "Закрыть"
    }
  }
};

export default function SignupPage() {
  const { lang } = useContext(LanguageContext) as { lang: 'uz' | 'en' | 'ru' };
  const t = SIGNUP_TRANSLATIONS[lang] || SIGNUP_TRANSLATIONS['uz'];

  const [role, setRole] = useState<"student" | "teacher" | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAFA] font-sans pt-24 pb-12 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-cyan-50/50 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white border border-slate-200 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative z-10"
      >
        <AnimatePresence mode="wait">
          {!role && (
            <motion.div key="step0" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.steps[0].title}</h1>
                <p className="text-slate-500 mt-2 font-medium">{t.steps[0].sub}</p>
              </div>
              <Step0Role setRole={setRole} t={t} />
            </motion.div>
          )}

          {role === "teacher" && (
            <motion.div key="teacher" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <TeacherSignupFlow onBack={() => setRole(null)} t={t} />
            </motion.div>
          )}

          {role === "student" && (
            <motion.div key="student" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <StudentSignupFlow onBack={() => setRole(null)} t={t} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}