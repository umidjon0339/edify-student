"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, deleteUser, GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from "firebase/auth";
import { doc, writeBatch, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { checkUsernameUnique } from "@/services/userService";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Step1Credentials, Step2Personal, Step3Location, Step4WorkEdu, Step10Google } from "./FormSteps";

const formatPhoneNumber = (v: string) => { const n = v.replace(/\D/g, ""); if (!n) return "+998 "; let f = "+998 "; const i = n.startsWith("998") ? n.slice(3) : n; if (i.length > 0) f += ` (${i.slice(0, 2)}`; if (i.length >= 2) f += `) ${i.slice(2, 5)}`; if (i.length >= 5) f += `-${i.slice(5, 7)}`; if (i.length >= 7) f += `-${i.slice(7, 9)}`; return f; };
const validatePassword = (pwd: string) => { if (pwd.length < 8) return "Password must be at least 8 characters."; if (!/[a-zA-Z]/.test(pwd)) return "Password must contain at least one letter."; return null; };
const validateUsernameFormat = (u: string) => { if (!u) return null; if (u.length < 5) return "Min 5 characters."; if (!/^[a-zA-Z]/.test(u)) return "Must start with a letter."; if (!/^[a-zA-Z0-9_]+$/.test(u)) return "Only a-z, 0-9, _ allowed."; return null; };

export default function StudentSignupFlow({ onBack, t, locations }: any) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);

  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const cache = useRef(new Map<string, boolean>());

  const [formData, setFormData] = useState({
    email: "", username: "", password: "", confirmPassword: "", fullName: "", birthDate: "", gender: "", 
    phone: "+998 ", country: "Uzbekistan", region: "", district: "", institutionName: "", gradeLevel: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    if (name === "phone") value = value.length < 5 ? "+998 " : formatPhoneNumber(value);
    setFormData({ ...formData, [name]: value });
  };

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
      }
    } catch (error: any) {
      toast.error("Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFinalize = async () => {
    if (!googleUser || !formData.username) return toast.error(t.validation.fillAll);
    if (usernameError || usernameAvailable === false) return toast.error(t.validation.userTaken);
    if (!formData.gender) return toast.error(t.validation.fillAll);

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const lowerUsername = formData.username.toLowerCase();

      const newProfile = {
        uid: googleUser.uid, email: googleUser.email, username: lowerUsername,
        displayName: googleUser.displayName || "User", photoURL: googleUser.photoURL || null,
        phone: null, birthDate: null, gender: formData.gender, role: "student", institution: null,
        location: { country: "Uzbekistan", region: null, district: null },
        grade: null, totalXP: 0, currentStreak: 0, level: 1, dailyHistory: {},
        progress: { completedTopicIndex: 0, completedChapterIndex: 0, completedSubtopicIndex: 0 },
        createdAt: new Date().toISOString(),
      };

      batch.set(doc(db, "users", googleUser.uid), newProfile);
      batch.set(doc(db, "usernames", lowerUsername), { uid: googleUser.uid });

      await batch.commit();
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (error) { toast.error("Failed to complete registration"); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.email || !formData.username || !formData.password) return toast.error(t.validation.fillAll);
      if (usernameError || usernameAvailable === false) return toast.error(t.validation.userTaken);
      const pwdError = validatePassword(formData.password);
      if (pwdError) return toast.error(pwdError);
      if (formData.password !== formData.confirmPassword) return toast.error(t.validation.passMatch);
    }
    if (step === 2) {
      if (!formData.fullName || !formData.birthDate || !formData.phone || !formData.gender) return toast.error(t.validation.fillAll);
      if (formData.phone.length < 17) return toast.error(t.validation.phoneInvalid);
    }
    if (step === 3) {
      if (!formData.region || !formData.district) return toast.error(t.validation.location);
    }
    if (step === 4) {
      if (!formData.institutionName || !formData.gradeLevel) return toast.error(t.validation.fillAll);
      await handleSignup();
      return;
    }
    if (step === 10) {
      await handleGoogleFinalize();
      return;
    }
    setStep(s => s + 1);
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

      // 🚀 STUDENT PAYLOAD
      batch.set(doc(db, "users", user.uid), {
        uid: user.uid, email: formData.email, username: lowerUsername,
        displayName: formData.fullName, phone: formData.phone, birthDate: formData.birthDate,
        gender: formData.gender, role: "student", institution: formData.institutionName,
        location: { country: formData.country, region: formData.region, district: formData.district },
        grade: formData.gradeLevel, totalXP: 0, currentStreak: 0, level: 1, dailyHistory: {},
        progress: { completedTopicIndex: 0, completedChapterIndex: 0, completedSubtopicIndex: 0 },
        createdAt: new Date().toISOString(),
      });

      batch.set(doc(db, "usernames", lowerUsername), { uid: user.uid });
      await batch.commit();

      toast.success(t.validation.welcome.replace("{role}", "Student"));
      router.push("/dashboard");
    } catch (error: any) {
      if (user && auth.currentUser) await deleteUser(auth.currentUser); 
      toast.error(error.code === "auth/email-already-in-use" ? "Email already in use." : "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{step === 10 ? t.steps[10].title : t.steps[step].title}</h1>
        <p className="text-slate-500 mt-2 font-medium">{step === 10 ? t.steps[10].sub : t.steps[step].sub}</p>
        {step > 0 && step < 10 && (
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden">
            <div className="bg-blue-600 h-full transition-all duration-500 ease-out" style={{ width: `${step * 25}%` }}></div>
          </div>
        )}
      </div>

      {step === 1 && <Step1Credentials formData={formData} handleChange={handleChange} usernameError={usernameError} usernameAvailable={usernameAvailable} isCheckingUser={isCheckingUser} showPassword={showPassword} setShowPassword={setShowPassword} t={t} />}
      {step === 2 && <Step2Personal formData={formData} handleChange={handleChange} t={t} />}
      {step === 3 && <Step3Location formData={formData} setFormData={setFormData} handleChange={handleChange} locations={locations} t={t} />}
      {step === 4 && <Step4WorkEdu formData={formData} handleChange={handleChange} role="student" t={t} />}
      {step === 10 && <Step10Google formData={formData} handleChange={handleChange} googleUser={googleUser} role="student" usernameError={usernameError} usernameAvailable={usernameAvailable} isCheckingUser={isCheckingUser} t={t} />}

      {/* {step === 1 && (
        <div className="mt-4">
          <button type="button" onClick={handleGoogleSignIn} className="w-full py-3.5 bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition shadow-sm">
            {t.buttons.google}
          </button>
        </div>
      )} */}

      <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
        {step !== 10 && (
          <button type="button" onClick={() => step === 1 ? onBack() : setStep(s => s - 1)} className="px-6 py-3.5 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 shadow-sm flex items-center gap-2">
            <ArrowLeft size={18} /> Back
          </button>
        )}
        <button type="submit" disabled={loading || isCheckingUser || usernameError !== null || usernameAvailable === false} className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-sm hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : step < 4 ? <>{t.buttons.next} <ArrowRight size={18} /></> : t.buttons.complete}
        </button>
      </div>
    </form>
  );
}