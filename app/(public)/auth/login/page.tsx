"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  deleteUser,
  sendPasswordResetEmail 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2, Mail, Lock, LogIn, ChevronRight, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { LanguageContext } from "@/app/(public)/layout";

// --- 1. TRANSLATION DICTIONARY ---
const LOGIN_TRANSLATIONS = {
  uz: {
    welcomeHeader: "Xush kelibsiz",
    subHeader: "Edify hisobingizga kiring.",
    googleBtn: "Google orqali davom etish",
    divider: "Yoki email orqali kiring",
    emailPlaceholder: "Email manzili",
    passwordPlaceholder: "Parol",
    signInBtn: "Kirish",
    forgotPassLink: "Parolni unutdingizmi?",
    sending: "Yuborilmoqda...",
    noAccount: "Hisobingiz yo'qmi?",
    createOne: "Bepul hisob yarating",
    welcomeBack: "Xush kelibsiz, {name}!",
    invalidCred: "Email yoki parol noto'g'ri.",
    noUser: "Bu email bilan hisob topilmadi.",
    loginFail: "Kirishda xatolik. Qaytadan urinib ko'ring.",
    accNotFound: "Hisob topilmadi. Iltimos, avval ro'yxatdan o'ting.",
    googleFail: "Google orqali kirishda xatolik.",
    enterEmail: "Iltimos, avval email manzilingizni kiriting.",
    resetSent: "Tiklash havolasi yuborildi! Emailingizni tekshiring.",
    invalidEmail: "Noto'g'ri email manzili.",
    resetFail: "Havola yuborishda xatolik yuz berdi."
  },
  en: {
    welcomeHeader: "Welcome Back",
    subHeader: "Access your Edify account.",
    googleBtn: "Continue with Google",
    divider: "Or login manually",
    emailPlaceholder: "Email Address",
    passwordPlaceholder: "Password",
    signInBtn: "Sign In",
    forgotPassLink: "Forgot Password?",
    sending: "Sending...",
    noAccount: "Don't have an account?",
    createOne: "Create one for free",
    welcomeBack: "Welcome back, {name}!",
    invalidCred: "Invalid email or password.",
    noUser: "No account found with this email.",
    loginFail: "Login failed. Please try again.",
    accNotFound: "Account not found. Please Sign Up first to create your profile.",
    googleFail: "Google Sign-In failed.",
    enterEmail: "Please enter your email address first.",
    resetSent: "Password reset link sent! Check your email.",
    invalidEmail: "Invalid email address.",
    resetFail: "Failed to send reset link."
  },
  ru: {
    welcomeHeader: "С возвращением",
    subHeader: "Войдите в свой аккаунт Edify.",
    googleBtn: "Продолжить с Google",
    divider: "Или войдите вручную",
    emailPlaceholder: "Электронная почта",
    passwordPlaceholder: "Пароль",
    signInBtn: "Войти",
    forgotPassLink: "Забыли пароль?",
    sending: "Отправка...",
    noAccount: "Нет аккаунта?",
    createOne: "Создать бесплатно",
    welcomeBack: "С возвращением, {name}!",
    invalidCred: "Неверный email или пароль.",
    noUser: "Аккаунт с таким email не найден.",
    loginFail: "Ошибка входа. Попробуйте снова.",
    accNotFound: "Аккаунт не найден. Пожалуйста, сначала зарегистрируйтесь.",
    googleFail: "Ошибка входа через Google.",
    enterEmail: "Пожалуйста, сначала введите email.",
    resetSent: "Ссылка для сброса отправлена! Проверьте почту.",
    invalidEmail: "Неверный формат email.",
    resetFail: "Не удалось отправить ссылку."
  }
};

export default function LoginPage() {
  const router = useRouter();
  
  const { lang } = useContext(LanguageContext) as { lang: 'uz' | 'en' | 'ru' };
  const t = LOGIN_TRANSLATIONS[lang] || LOGIN_TRANSLATIONS['uz'];

  // State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // 1. MANUAL LOGIN LOGIC
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const tokenResult = await user.getIdTokenResult(true);
      if (tokenResult.claims.super_admin) {
        toast.dismiss();
        toast.success("Welcome to the Admin Console", { duration: 4000 });
        router.push("/admin"); 
        return; 
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        throw new Error("Profile not found");
      }

      const profile = userDoc.data();

      toast.dismiss();
      toast.success(t.welcomeBack.replace("{name}", profile.displayName || "User"), { duration: 4000 });

      if (profile.role === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/dashboard");
      }
      
    } catch (error: any) {
      console.error(error);
      setLoading(false); 

      if (error.code === "auth/invalid-credential") {
        toast.error(t.invalidCred);
      } else if (error.code === "auth/user-not-found") {
        toast.error(t.noUser);
      } else if (error.message === "Profile not found") {
        toast.error(t.accNotFound);
      } else {
        toast.error(t.loginFail);
      }
    }
  };

  // 2. GOOGLE LOGIN LOGIC
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const profile = userDoc.data();
        toast.success(t.welcomeBack.replace("{name}", profile.displayName || "User"),{ duration: 4000 });
        
        if (profile.role === "teacher") {
          router.push("/teacher/dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        await deleteUser(user); 
        setLoading(false);
        toast.error(t.accNotFound);
      }

    } catch (error: any) {
      console.error(error);
      setLoading(false);
      toast.error(t.googleFail);
    }
  };

  // 3. FORGOT PASSWORD LOGIC
  const handleForgotPassword = async () => {
    if (!email) {
      toast.error(t.enterEmail);
      return;
    }
    
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(t.resetSent);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found') {
        toast.error(t.noUser);
      } else if (error.code === 'auth/invalid-email') {
        toast.error(t.invalidEmail);
      } else {
        toast.error(t.resetFail);
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    // 🟢 LIGHT THEME BACKGROUND
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAFA] font-sans pt-20 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-cyan-50/50 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-slate-200 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative z-10"
      >
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
            <LogIn size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.welcomeHeader}</h1>
          <p className="text-slate-500 mt-2 font-medium">{t.subHeader}</p>
        </div>

        {/* 3. LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          <div className="space-y-1.5">
            <div className="relative group">
              <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-semibold text-[15px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-semibold text-[15px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {/* FORGOT PASSWORD LINK */}
            <div className="flex justify-end pt-1">
              <button 
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-[13px] font-bold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 hover:underline"
              >
                {resetLoading ? t.sending : t.forgotPassLink}
              </button>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-sm hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
             {loading ? <Loader2 className="animate-spin" /> : <>{t.signInBtn} <ChevronRight size={18}/></>}
          </button>

        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-[14px] text-slate-500 font-medium">
          {t.noAccount}{' '}
          <Link href="/auth/signup" className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-colors ml-1">
            {t.createOne}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}