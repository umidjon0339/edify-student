"use client";

import { useState, useContext } from "react"; // 🟢 Added useContext
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
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { LanguageContext } from "@/app/(public)/layout"; // 🟢 Import Context from your layout

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
    // Toasts
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
    // Toasts
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
    // Toasts
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
  
  // 🟢 CONSUME CONTEXT
  // Using 'as any' to bypass strict context null checks for simplicity in this file
  const { lang } = useContext(LanguageContext) as { lang: 'uz' | 'en' | 'ru' };
  const t = LOGIN_TRANSLATIONS[lang]; // Get translations for current language

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
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        throw new Error("Profile not found");
      }

      const profile = userDoc.data();

      toast.dismiss();
      // 🟢 Translated Welcome Message
      toast.success(t.welcomeBack.replace("{name}", profile.displayName || "User"), { duration: 4000 });

      if (profile.role === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/dashboard");
      }
      
    } catch (error: any) {
      console.error(error);
      setLoading(false); 

      // 🟢 Translated Error Messages
      if (error.code === "auth/invalid-credential") {
        toast.error(t.invalidCred);
      } else if (error.code === "auth/user-not-found") {
        toast.error(t.noUser);
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
        // 🟢 Translated Success
        toast.success(t.welcomeBack.replace("{name}", profile.displayName || "User"));
        
        if (profile.role === "teacher") {
          router.push("/teacher/dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        await deleteUser(user); 
        setLoading(false);
        // 🟢 Translated Error
        toast.error(t.accNotFound);
      }

    } catch (error: any) {
      console.error(error);
      setLoading(false);
      // 🟢 Translated Error
      toast.error(t.googleFail);
    }
  };

  // 3. FORGOT PASSWORD LOGIC
  const handleForgotPassword = async () => {
    if (!email) {
      // 🟢 Translated Validation
      toast.error(t.enterEmail);
      return;
    }
    
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      // 🟢 Translated Success
      toast.success(t.resetSent);
    } catch (error: any) {
      console.error(error);
      // 🟢 Translated Errors
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
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-900 pt-20">
      <Toaster position="top-center" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-[2rem] shadow-2xl shadow-purple-900/20"
      >
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-purple-500/20">
            <LogIn size={24} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">{t.welcomeHeader}</h1>
          <p className="text-slate-400 mt-2 font-medium">{t.subHeader}</p>
        </div>

        {/* 1. GOOGLE BUTTON */}
        {/* <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-slate-800 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-md mb-6"
        >
          {loading ? (
            <Loader2 className="animate-spin text-slate-400" size={20} />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t.googleBtn}
            </>
          )}
        </button> */}

        {/* 2. DIVIDER */}
        {/* <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-700"></div>
          <span className="text-xs text-slate-500 font-bold uppercase">{t.divider}</span>
          <div className="flex-1 h-px bg-slate-700"></div>
        </div> */}

        {/* 3. LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          <div className="space-y-1.5">
            <div className="relative group">
              <Mail className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-700/50 bg-slate-800/50 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:bg-slate-800 outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-slate-700/50 bg-slate-800/50 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:bg-slate-800 outline-none transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {/* FORGOT PASSWORD LINK */}
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 hover:underline"
              >
                {resetLoading ? t.sending : t.forgotPassLink}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="relative z-10 flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <>{t.signInBtn} <ChevronRight size={18}/></>}
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </button>

        </form>

        <div className="mt-8 text-center text-sm text-slate-400 font-medium">
          {t.noAccount}{' '}
          <Link href="/auth/signup" className="text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition-colors">
            {t.createOne}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}