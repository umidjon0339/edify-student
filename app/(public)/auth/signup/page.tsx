"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from "firebase/auth";
import { doc, writeBatch, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { checkUsernameUnique } from "@/services/userService";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { LanguageContext } from "@/app/(public)/layout";

// 🟢 KOMPONENTLARNI IMPORT QILISH (UI)
import { 
  Step0Role, Step1Credentials, Step2Personal, 
  Step3Location, Step4WorkEdu, Step10Google 
} from "./_components/FormSteps";

// --- 1. TRANSLATION DICTIONARY ---
const SIGNUP_TRANSLATIONS = {
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
      student: { title: "Men O'quvchiman", desc: "Matematikani o'rganish, XP yig'ish va natijalarni kuzatish." },
      teacher: { title: "Men O'qituvchiman", desc: "Testlar yaratish va o'quvchilarni boshqarish." }
    },
    inputs: {
      email: "Email manzili", username: "Foydalanuvchi nomi", password: "Parol", confirm: "Parolni tasdiqlang",
      fullname: "To'liq ism (F.I.O)", birth: "Tug'ilgan sana", phone: "Telefon", institution: "Maktab / Universitet nomi", institutionOrg: "Maktab / Tashkilot nomi"
    },
    selects: { region: "Viloyatni tanlang", district: "Tumanni tanlang", grade: "Sinf / Kursni tanlang", subject: "Fanni tanlang" },
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
    selects: { region: "Select Region", district: "Select District", grade: "Select Grade / Year", subject: "Select Subject" },
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
    selects: { region: "Выберите регион", district: "Выберите район", grade: "Выберите класс / курс", subject: "Выберите предмет" },
    buttons: { google: "Продолжить с Google", next: "Далее", back: "Назад", complete: "Завершить", finalize: "Завершить и Войти", loginLink: "Уже есть аккаунт? Войти" },
    validation: { fillAll: "Пожалуйста, заполните все поля.", userTaken: "Имя пользователя занято.", passMatch: "Пароли не совпадают.", phoneInvalid: "Неверный номер телефона.", location: "Пожалуйста, выберите местоположение.", welcome: "Добро пожаловать, {role}!" },
    placeholders: { username: "Выберите имя пользователя" },
    terms: "Я согласен с Условиями использования и Политикой конфиденциальности."
  }
};

// --- DATA: UZBEKISTAN REGIONS ---
const UZB_LOCATIONS: Record<string, string[]> = {
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

// --- HELPERS ---
const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length === 0) return "+998 ";
  let formatted = "+998 ";
  const inputNumbers = numbers.startsWith("998") ? numbers.slice(3) : numbers;
  if (inputNumbers.length > 0) formatted += ` (${inputNumbers.slice(0, 2)}`;
  if (inputNumbers.length >= 2) formatted += `) ${inputNumbers.slice(2, 5)}`;
  if (inputNumbers.length >= 5) formatted += `-${inputNumbers.slice(5, 7)}`;
  if (inputNumbers.length >= 7) formatted += `-${inputNumbers.slice(7, 9)}`;
  return formatted;
};

const validatePassword = (pwd: string) => {
  if (pwd.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(pwd)) return "Password must contain at least one letter.";
  return null;
};

const validateUsernameFormat = (username: string) => {
  if (!username) return null;
  if (username.length < 5) return "Min 5 characters.";
  if (!/^[a-zA-Z]/.test(username)) return "Must start with a letter.";
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Only a-z, 0-9, and _ allowed.";
  return null;
};

// --- MAIN PAGE ---
export default function SignupPage() {
  const router = useRouter();
  
  const { lang } = useContext(LanguageContext) as { lang: 'uz' | 'en' | 'ru' };
  const t = SIGNUP_TRANSLATIONS[lang] || SIGNUP_TRANSLATIONS['uz'];

  // States
  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [showPassword, setShowPassword] = useState(false);

  // Google State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);

  // Username Check State
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    email: "", username: "", password: "", confirmPassword: "", fullName: "", birthDate: "", 
    phone: "+998 ", country: "Uzbekistan", region: "", district: "", institutionName: "", 
    gradeLevel: "", schoolSubject: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    if (name === "phone") {
      if (value.length < 5) value = "+998 ";
      else value = formatPhoneNumber(value);
    }
    setFormData({ ...formData, [name]: value });
  };

  useEffect(() => {
    const check = async () => {
      setUsernameAvailable(null);
      setUsernameError(null);

      if (!formData.username) return;

      const formatError = validateUsernameFormat(formData.username);
      if (formatError) {
        setUsernameError(formatError);
        return;
      }

      setIsCheckingUser(true);
      try {
        const isUnique = await checkUsernameUnique(formData.username);
        setUsernameAvailable(isUnique);
      } catch (error) {
        setUsernameAvailable(true); 
      } finally {
        setIsCheckingUser(false);
      }
    };

    const timeoutId = setTimeout(check, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  // Optionally keeping this if you uncomment Google Auth later
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const existingData = userDoc.data();
        toast.success(`Welcome back, ${existingData.displayName || "User"}!`,{ duration: 4000 });
        if (existingData.role === "teacher") router.push("/teacher/dashboard");
        else router.push("/dashboard");
      } else {
        setGoogleUser(user);
        setStep(10);
        setLoading(false);
      }
    } catch (error: any) {
      console.error(error);
      setLoading(false);
      toast.error("Google Sign-In failed.");
    }
  };

  const handleGoogleFinalize = async () => {
    if (!googleUser) return;
    if (!formData.username) return toast.error(t.validation.fillAll);
    if (usernameError) return toast.error(usernameError);
    if (usernameAvailable === false) return toast.error(t.validation.userTaken);
    if (role === 'teacher' && !formData.schoolSubject) return toast.error(t.validation.fillAll);

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, "users", googleUser.uid);

      const newProfile: any = {
        uid: googleUser.uid,
        email: googleUser.email,
        username: formData.username.toLowerCase(),
        displayName: googleUser.displayName || "User",
        photoURL: googleUser.photoURL || null,
        phone: null,
        birthDate: null,
        role: role,
        institution: null,
        location: { country: "Uzbekistan", region: null, district: null },
        createdAt: new Date().toISOString(),
      };

      if (role === "student") {
        newProfile.grade = null;
        newProfile.totalXP = 0;
        newProfile.currentStreak = 0;
        newProfile.level = 1;
        newProfile.dailyHistory = {};
        newProfile.progress = { completedTopicIndex: 0, completedChapterIndex: 0, completedSubtopicIndex: 0 };
      } else {
        newProfile.grade = "Teacher";
        newProfile.subject = formData.schoolSubject;
        newProfile.verifiedTeacher = false;
        newProfile.createdTests = [];
      }

      batch.set(userRef, newProfile);
      batch.set(doc(db, "usernames", formData.username.toLowerCase()), { uid: googleUser.uid });

      await batch.commit();
      toast.success("Account created successfully!");
      if (role === "teacher") router.push("/teacher/dashboard");
      else router.push("/dashboard");

    } catch (error) {
      console.error(error);
      toast.error("Failed to complete registration");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.email || !formData.username || !formData.password)
        return toast.error(t.validation.fillAll);
      if (usernameError) return toast.error(usernameError);
      if (usernameAvailable === false) return toast.error(t.validation.userTaken);
      if (usernameAvailable === null && formData.username.length > 0)
        return toast.error("Checking username...");
      const pwdError = validatePassword(formData.password);
      if (pwdError) return toast.error(pwdError);
      if (formData.password !== formData.confirmPassword)
        return toast.error(t.validation.passMatch);
    }
    if (step === 2) {
      if (!formData.fullName || !formData.birthDate || !formData.phone)
        return toast.error(t.validation.fillAll);
      if (formData.phone.length < 17)
        return toast.error(t.validation.phoneInvalid);
    }
    if (step === 3) {
      if (!formData.region || !formData.district)
        return toast.error(t.validation.location);
    }
    setStep((prev) => prev + 1);
  };

  const handleManualSignup = async () => {
    setLoading(true);
    let user = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      user = userCredential.user;
      await updateProfile(user, { displayName: formData.fullName });

      const batch = writeBatch(db);
      const userRef = doc(db, "users", user.uid);

      const newProfile: any = {
        uid: user.uid,
        email: formData.email,
        username: formData.username.toLowerCase(),
        displayName: formData.fullName,
        phone: formData.phone,
        birthDate: formData.birthDate,
        role: role,
        institution: formData.institutionName,
        location: { country: formData.country, region: formData.region, district: formData.district },
        createdAt: new Date().toISOString(),
      };

      if (role === "student") {
        newProfile.grade = formData.gradeLevel;
        newProfile.totalXP = 0;
        newProfile.currentStreak = 0;
        newProfile.level = 1;
        newProfile.dailyHistory = {};
        newProfile.progress = { completedTopicIndex: 0, completedChapterIndex: 0, completedSubtopicIndex: 0 };
      } else {
        newProfile.grade = "Teacher";
        newProfile.subject = formData.schoolSubject;
        newProfile.verifiedTeacher = false;
        newProfile.createdTests = [];
      }

      batch.set(userRef, newProfile);
      batch.set(doc(db, "usernames", formData.username.toLowerCase()), { uid: user.uid });

      await batch.commit();
      toast.success(t.validation.welcome.replace("{role}", role === "teacher" ? "Professor" : "Student"),{ duration: 4000 });
      if (role === "teacher") router.push("/teacher/dashboard");
      else router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      if (user && auth.currentUser) await deleteUser(auth.currentUser);
      if (error.code === "auth/email-already-in-use") toast.error("Email already in use.");
      else toast.error("Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  // Safe fallback for step text
  // @ts-ignore
  const stepText = t.steps[step] || t.steps[1];

  return (
    // 🟢 YANGI LIGHT THEME DIZAYN
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAFA] font-sans pt-24 pb-12 relative overflow-hidden">
      
      {/* Orqa fon bezaklari (Light Glows) */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-cyan-50/50 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg bg-white border border-slate-200 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative z-10"
      >
        {/* HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {stepText.title}
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            {stepText.sub}
          </p>

          {/* Progress Bar (Light Theme) */}
          {step > 0 && step < 10 && (
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${step * 25}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* 🟢 KOMPONENTLARNI CHAQIRISH (UI Render) */}
        {step === 0 && <Step0Role setRole={setRole} setStep={setStep} t={t} />}
        
        {step === 10 && (
          <div className="space-y-6">
            <Step10Google formData={formData} handleChange={handleChange} googleUser={googleUser} role={role} usernameError={usernameError} usernameAvailable={usernameAvailable} isCheckingUser={isCheckingUser} t={t} />
            <button onClick={handleGoogleFinalize} disabled={loading || !usernameAvailable} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-sm hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
               {loading ? <Loader2 className="animate-spin" /> : t.buttons.finalize}
             </button>
          </div>
        )}

        {step > 0 && step < 10 && (
          <form onSubmit={(e) => e.preventDefault()}>
            
            {step === 1 && <Step1Credentials formData={formData} handleChange={handleChange} usernameError={usernameError} usernameAvailable={usernameAvailable} isCheckingUser={isCheckingUser} showPassword={showPassword} setShowPassword={setShowPassword} t={t} />}
            {step === 2 && <Step2Personal formData={formData} handleChange={handleChange} t={t} />}
            {step === 3 && <Step3Location formData={formData} setFormData={setFormData} handleChange={handleChange} locations={UZB_LOCATIONS} t={t} />}
            {step === 4 && <Step4WorkEdu formData={formData} handleChange={handleChange} role={role} t={t} />}

            {/* BUTTONS (Light Theme) */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
              <button onClick={() => setStep((s) => s - 1)} className="px-6 py-3.5 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition flex items-center gap-2 shadow-sm">
                <ArrowLeft size={18} /> <span className="hidden sm:block">{t.buttons.back}</span>
              </button>
              
              {step < 4 ? (
                <button onClick={handleNext} className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-sm hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                  {t.buttons.next} <ArrowRight size={18} />
                </button>
              ) : (
                <button onClick={handleManualSignup} disabled={loading} className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-sm hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" /> : t.buttons.complete}
                </button>
              )}
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}