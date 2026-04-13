"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, deleteUser } from "firebase/auth";
import { doc, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { checkUsernameUnique } from "@/services/userService";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Step1Auth, Step2Profile } from "./FormSteps";

const validatePassword = (pwd: string) => { if (pwd.length < 8) return "Parol kamida 8 ta belgidan iborat bo'lishi kerak."; return null; };
const validateUsernameFormat = (u: string) => { if (!u) return null; if (u.length < 5) return "Min 5ta belgi."; if (!/^[a-zA-Z]/.test(u)) return "Harf bilan boshlanishi kerak."; if (!/^[a-zA-Z0-9_]+$/.test(u)) return "Faqat a-z, 0-9, _ ruxsat etiladi."; return null; };

export default function StudentSignupFlow({ onBack, t }: any) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Enterprise Username Checking State
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const cache = useRef(new Map<string, boolean>());

  const [formData, setFormData] = useState({
    email: "", password: "", fullName: "", username: "", gradeLevel: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Debounced Username Check
  useEffect(() => {
    const input = formData.username.trim().toLowerCase();
    setUsernameAvailable(null); setUsernameError(null);
    if (!input) return;

    const error = validateUsernameFormat(input);
    if (error) return setUsernameError(error);

    if (cache.current.has(input)) {
      setUsernameAvailable(cache.current.get(input)!);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingUser(true);
      try {
        const isUnique = await checkUsernameUnique(input);
        cache.current.set(input, isUnique);
        setUsernameAvailable(isUnique);
      } catch (err) { setUsernameAvailable(true); } 
      finally { setIsCheckingUser(false); }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.email || !formData.password) return toast.error(t.validation.fillAll);
      const pwdError = validatePassword(formData.password);
      if (pwdError) return toast.error(pwdError);
      setStep(2);
      return;
    }
    
    if (step === 2) {
      if (!formData.fullName || !formData.username || !formData.gradeLevel) return toast.error(t.validation.fillAll);
      if (usernameError || usernameAvailable === false) return toast.error(t.validation.userTaken);
      await handleSignup();
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    let user = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      user = userCredential.user;
      await updateProfile(user, { displayName: formData.fullName });

      const batch = writeBatch(db);
      const lowerUsername = formData.username.toLowerCase();

      // 🚀 TURBO STUDENT PAYLOAD
      batch.set(doc(db, "users", user.uid), {
        uid: user.uid, 
        email: formData.email, 
        username: lowerUsername,
        displayName: formData.fullName, 
        role: "student", 
        grade: formData.gradeLevel,
        
        // Progressive Profiling Empty Fields (Ensures app doesn't crash on nulls)
        phone: "", 
        birthDate: "", 
        gender: "", 
        institution: "",
        location: { country: "Uzbekistan", region: "", district: "" },
        
        // App Logic Defaults
        totalXP: 0, 
        currentStreak: 0, 
        level: 1, 
        dailyHistory: {},
        progress: { completedTopicIndex: 0, completedChapterIndex: 0, completedSubtopicIndex: 0 },
        createdAt: new Date().toISOString(),
      });

      batch.set(doc(db, "usernames", lowerUsername), { uid: user.uid });
      
      // Execute Write
      await batch.commit();

      toast.success(t.validation.welcome.replace("{role}", "O'quvchi"));
      router.push("/dashboard");
    } catch (error: any) {
      // 🛡️ Rollback auth if database write fails
      if (user && auth.currentUser) await deleteUser(auth.currentUser); 
      toast.error(error.code === "auth/email-already-in-use" ? "Bu email band qilingan." : "Xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {t.steps[step].title}
        </h1>
        <p className="text-slate-500 mt-2 font-medium">{t.steps[step].sub}</p>
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden">
          <div className="bg-blue-600 h-full transition-all duration-500 ease-out" style={{ width: `${step * 50}%` }}></div>
        </div>
      </div>

      {step === 1 && <Step1Auth formData={formData} handleChange={handleChange} showPassword={showPassword} setShowPassword={setShowPassword} t={t} />}
      {step === 2 && <Step2Profile formData={formData} handleChange={handleChange} usernameError={usernameError} usernameAvailable={usernameAvailable} isCheckingUser={isCheckingUser} role="student" t={t} />}

      <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
        <button type="button" onClick={() => step === 1 ? onBack() : setStep(1)} className="px-6 py-3.5 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 shadow-sm flex items-center gap-2">
          <ArrowLeft size={18} /> {t.buttons.back}
        </button>
        <button type="submit" disabled={loading || isCheckingUser || usernameError !== null || usernameAvailable === false} className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-sm hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : step === 1 ? <>{t.buttons.next} <ArrowRight size={18} /></> : t.buttons.complete}
        </button>
      </div>
    </form>
  );
}