"use client";

import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageContext } from "@/app/(public)/layout";
import { Step0Role } from "./_components/FormSteps";
import TeacherSignupFlow from "./_components/TeacherSignupFlow";
import StudentSignupFlow from "./_components/StudentSignupFlow";

// --- 1. FULL TRANSLATION DICTIONARY ---
export const SIGNUP_TRANSLATIONS = {
  uz: {
    steps: {
      0: { title: "Yo'nalishni tanlang", sub: "O'qishni xohlaysizmi yoki o'qitishni?" },
      1: { title: "Hisob yaratish", sub: "1 / 4 qadam" },
      2: { title: "Shaxsiy ma'lumotlar", sub: "2 / 4 qadam" },
      3: { title: "Joylashuv", sub: "3 / 4 qadam" },
      4: { title: "Ta'lim / Ish", sub: "4 / 4 qadam" },
      10: { title: "Deyarli tayyor!", sub: "Bir nechta ma'lumot qoldi" }
    },
    roles: {
      student: { title: "Men O'quvchiman", desc: "Fanlarni o'rganish, XP yig'ish va natijalarni kuzatish." },
      teacher: { title: "Men O'qituvchiman", desc: "Testlar yaratish va o'quvchilarni boshqarish." }
    },
    inputs: {
      email: "Email manzili", username: "Foydalanuvchi nomi", password: "Parol", confirm: "Parolni tasdiqlang",
      fullname: "To'liq ism (F.I.O)", birth: "Tug'ilgan sana", phone: "Telefon", institution: "Maktab / Universitet nomi", institutionOrg: "Maktab / Tashkilot nomi"
    },
    selects: { region: "Viloyatni tanlang", district: "Tumanni tanlang", grade: "Sinf / Kursni tanlang", subject: "Fanni tanlang", gender: "Jinsi (Gender)" },
    buttons: { google: "Google orqali davom etish", next: "Keyingi qadam", back: "Ortga", complete: "Ro'yxatdan o'tish", finalize: "Yakunlash va Kirish", loginLink: "Hisobingiz bormi? Kirish" },
    validation: { fillAll: "Iltimos, barcha maydonlarni to'ldiring.", userTaken: "Bu nom band qilingan.", passMatch: "Parollar mos kelmadi.", phoneInvalid: "Noto'g'ri telefon raqami.", location: "Iltimos, joylashuvni tanlang.", welcome: "Xush kelibsiz, {role}!" },
    placeholders: { username: "Foydalanuvchi nomini tanlang" },
    terms: "Foydalanish shartlari va Maxfiylik siyosatiga roziman."
  },
  en: {
    steps: {
      0: { title: "Choose your path", sub: "Are you learning or teaching?" },
      1: { title: "Create Account", sub: "Step 1 of 4" },
      2: { title: "Personal Details", sub: "Step 2 of 4" },
      3: { title: "Location", sub: "Step 3 of 4" },
      4: { title: "Education / Work", sub: "Step 4 of 4" },
      10: { title: "Almost there!", sub: "Just a few more details" }
    },
    roles: {
      student: { title: "I am a Student", desc: "I want to learn, earn XP, and track my progress." },
      teacher: { title: "I am a Teacher", desc: "I want to create tests and manage my students." }
    },
    inputs: { email: "Email Address", username: "Username", password: "Password", confirm: "Confirm", fullname: "Full Name", birth: "Date of Birth", phone: "Phone", institution: "School / University Name", institutionOrg: "School / Organization Name" },
    selects: { region: "Select Region", district: "Select District", grade: "Select Grade / Year", subject: "Select Subject", gender: "Gender" },
    buttons: { google: "Continue with Google", next: "Next Step", back: "Back", complete: "Complete Registration", finalize: "Complete & Enter", loginLink: "Already have an account? Log in" },
    validation: { fillAll: "Please fill in all fields.", userTaken: "Username is taken.", passMatch: "Passwords do not match.", phoneInvalid: "Invalid phone number.", location: "Please select your location.", welcome: "Welcome, {role}!" },
    placeholders: { username: "Choose a Username" },
    terms: "I agree to the Terms of Service and Privacy Policy."
  },
  ru: {
    steps: {
      0: { title: "Выберите путь", sub: "Вы учитесь или преподаете?" },
      1: { title: "Создать аккаунт", sub: "Шаг 1 из 4" },
      2: { title: "Личные данные", sub: "Шаг 2 из 4" },
      3: { title: "Местоположение", sub: "Шаг 3 из 4" },
      4: { title: "Образование / Работа", sub: "Шаг 4 из 4" },
      10: { title: "Почти готово!", sub: "Еще немного деталей" }
    },
    roles: {
      student: { title: "Я Ученик", desc: "Хочу учиться, получать XP и следить за прогрессом." },
      teacher: { title: "Я Учитель", desc: "Хочу создавать тесты и управлять учениками." }
    },
    inputs: { email: "Эл. почта", username: "Имя пользователя", password: "Пароль", confirm: "Подтвердить", fullname: "Ф.И.О", birth: "Дата рождения", phone: "Телефон", institution: "Название Школы / ВУЗа", institutionOrg: "Название Школы / Организации" },
    selects: { region: "Выберите регион", district: "Выберите район", grade: "Выберите класс / курс", subject: "Выберите предмет", gender: "Пол" },
    buttons: { google: "Продолжить с Google", next: "Далее", back: "Назад", complete: "Завершить", finalize: "Завершить и Войти", loginLink: "Уже есть аккаунт? Войти" },
    validation: { fillAll: "Пожалуйста, заполните все поля.", userTaken: "Имя пользователя занято.", passMatch: "Пароли не совпадают.", phoneInvalid: "Неверный номер телефона.", location: "Пожалуйста, выберите местоположение.", welcome: "Добро пожаловать, {role}!" },
    placeholders: { username: "Выберите имя пользователя" },
    terms: "Я согласен с Условиями использования и Политикой конфиденциальности."
  }
};

// --- 2. FULL UZBEKISTAN REGIONS DATA ---
export const UZB_LOCATIONS: Record<string, string[]> = {
  "Tashkent City": ["Bektemir","Chilanzar","Mirzo Ulugbek","Mirobod","Olmazor","Sergeli","Shaykhantakhur","Uchtepa","Yakkasaray","Yashnobod","Yunusabad","Yangihayot"],
  "Tashkent Region": ["Angren","Bekabad","Buka","Chinaz","Chirchik","Kibray","Ohangaron","Parkent","Piskent","Quyi Chirchiq","Orta Chirchiq","Yuqori Chirchiq","Yangiyo‘l","Zangiota"],
  "Samarkand": ["Samarkand City","Bulungur","Ishtikhon","Jomboy","Kattakurgan","Narpay","Nurabad","Oqdaryo","Pastdargom","Paxtachi","Payariq","Toyloq","Urgut"],
  "Bukhara": ["Bukhara City","Gijduvan","Jondor","Kogon","Olot","Peshku","Qorako‘l","Romitan","Shofirkon","Vobkent"],
  "Andijan": ["Andijan City","Asaka","Baliqchi","Bo‘z","Buloqboshi","Izboskan","Jalaquduq","Kurgontepa","Marhamat","Oltinko‘l","Paxtaobod","Shahrixon","Ulugnor","Xo‘jaobod"],
  "Fergana": ["Fergana City","Beshariq","Bog‘dod","Buvayda","Dang‘ara","Furqat","Kokand","Margilan","Oltiariq","Qo‘shtepa","Quva","Rishton","So‘x","Toshloq","Uchko‘prik","Yozyovon"],
  "Namangan": ["Namangan City","Chortoq","Chust","Kosonsoy","Mingbuloq","Norin","Pop","To‘raqo‘rg‘on","Uchqo‘rg‘on","Uychi","Yangiqo‘rg‘on"],
  "Khorezm": ["Urgench","Bog‘ot","Gurlan","Hazorasp","Khiva","Qo‘shko‘pir","Shovot","Xonqa","Yangiariq","Yangibozor"],
  "Kashkadarya": ["Karshi","Chiroqchi","Dehqonobod","G‘uzor","Kasbi","Kitob","Koson","Mirishkor","Muborak","Nishon","Qamashi","Shahrisabz","Yakkabog‘"],
  "Surkhandarya": ["Termez","Angor","Bandixon","Boysun","Denau","Jarqo‘rg‘on","Qiziriq","Qumqo‘rg‘on","Muzrabot","Oltinsoy","Sariosiyo","Sherobod","Sho‘rchi","Uzun"],
  "Navoi": ["Navoi City","Zarafshan","Karmana","Konimex","Navbahor","Nurota","Qiziltepa","Tomdi","Uchquduq","Xatirchi"],
  "Jizzakh": ["Jizzakh City","Arnasoy","Bakhmal","Dustlik","Forish","Gallaorol","Mirzachul","Paxtakor","Sharof Rashidov","Zafarobod","Zarbdor","Zaamin"],
  "Syrdarya": ["Gulistan","Akaltyn","Bayaut","Khavast","Mirzaobod","Saykhunobod","Sardoba","Sirdaryo","Yangiyer","Shirin"],
  "Karakalpakstan": ["Nukus","Amudarya","Beruniy","Chimbay","Ellikqala","Kegeyli","Kungrad","Moynaq","Qanlikol","Shumanay","Takhiatash","Turtkul","Xojeli"]
};

export default function SignupPage() {
  const { lang } = useContext(LanguageContext) as { lang: 'uz' | 'en' | 'ru' };
  const t = SIGNUP_TRANSLATIONS[lang] || SIGNUP_TRANSLATIONS['uz'];

  const [role, setRole] = useState<"student" | "teacher" | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAFA] font-sans pt-24 pb-12 relative overflow-hidden">
      {/* Background Glows */}
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
              <TeacherSignupFlow onBack={() => setRole(null)} t={t} locations={UZB_LOCATIONS} />
            </motion.div>
          )}

          {role === "student" && (
            <motion.div key="student" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <StudentSignupFlow onBack={() => setRole(null)} t={t} locations={UZB_LOCATIONS} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}