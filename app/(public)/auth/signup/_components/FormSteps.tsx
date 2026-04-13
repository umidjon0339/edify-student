"use client";

import { Loader2, CheckCircle, XCircle, GraduationCap, School, User, Mail, Lock, Eye, EyeOff, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

// 🟢 STEP 0: ROLE SELECTION
export const Step0Role = ({ setRole, t }: any) => (
  <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <button 
      type="button" 
      onClick={() => setRole("teacher")} 
      className="group relative p-5 md:p-6 rounded-[1.5rem] bg-white border-2 border-slate-100 hover:border-indigo-500 hover:shadow-[0_12px_40px_-15px_rgba(99,102,241,0.2)] transition-all duration-300 text-left flex items-center justify-between active:scale-[0.98] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-center gap-5 z-10">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
          <School size={28} strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-[17px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{t.roles.teacher.title}</h3>
          <p className="text-[14px] font-medium text-slate-500 mt-0.5 leading-relaxed pr-4">{t.roles.teacher.desc}</p>
        </div>
      </div>
      <div className="relative z-10 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shrink-0 transform group-hover:translate-x-1 border border-slate-200 group-hover:border-indigo-600 shadow-sm">
        <ArrowRight size={16} strokeWidth={2.5} />
      </div>
    </button>

    <button 
      type="button" 
      onClick={() => setRole("student")} 
      className="group relative p-5 md:p-6 rounded-[1.5rem] bg-white border-2 border-slate-100 hover:border-emerald-500 hover:shadow-[0_12px_40px_-15px_rgba(16,185,129,0.2)] transition-all duration-300 text-left flex items-center justify-between active:scale-[0.98] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/0 to-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-center gap-5 z-10">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
          <GraduationCap size={28} strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-[17px] font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{t.roles.student.title}</h3>
          <p className="text-[14px] font-medium text-slate-500 mt-0.5 leading-relaxed pr-4">{t.roles.student.desc}</p>
        </div>
      </div>
      <div className="relative z-10 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shrink-0 transform group-hover:translate-x-1 border border-slate-200 group-hover:border-emerald-600 shadow-sm">
        <ArrowRight size={16} strokeWidth={2.5} />
      </div>
    </button>

    <div className="mt-6 text-center">
      <p className="text-[14px] font-medium text-slate-500">
        {t.buttons.loginLink.split('?')[0]}? 
        <Link href="/auth/login" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline underline-offset-4 ml-1.5 transition-colors">
          {t.buttons.loginLink.split('?')[1]}
        </Link>
      </p>
    </div>
  </div>
);

// 🟢 STEP 1: FAST AUTH (Email & Password)
export const Step1Auth = ({ formData, handleChange, showPassword, setShowPassword, t }: any) => (
  <div className="space-y-4 animate-in fade-in slide-in-from-right">
    <div className="relative group">
      <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
      <input name="email" type="email" placeholder={t.inputs.email} required value={formData.email} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition font-semibold text-[15px]" autoFocus />
    </div>
    
    <div className="relative group">
      <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
      <input name="password" type={showPassword ? "text" : "password"} placeholder={t.inputs.password} required value={formData.password} onChange={handleChange} className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold transition text-[15px]" />
      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
    <p className="text-xs text-slate-400 font-medium px-1 text-center mt-2">Parol kamida 8 ta belgidan iborat bo'lishi kerak.</p>
  </div>
);

// 🟢 STEP 2: FAST PROFILE (Name, Username, Context)
export const Step2Profile = ({ formData, handleChange, usernameError, usernameAvailable, isCheckingUser, role, t }: any) => (
  <div className="space-y-4 animate-in fade-in slide-in-from-right">
    
    <div className="group relative">
      <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
      <input name="fullName" type="text" placeholder={t.inputs.fullname} required value={formData.fullName} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold transition text-[15px]" autoFocus />
    </div>

    <div className="relative group">
      <span className="absolute left-4 top-3.5 text-slate-400 font-bold group-focus-within:text-blue-500 transition-colors">@</span>
      <input name="username" type="text" placeholder={t.inputs.username} required value={formData.username} onChange={handleChange} className={`w-full pl-10 pr-10 py-3.5 rounded-xl border outline-none font-semibold text-[15px] transition text-slate-900 bg-slate-50 placeholder:text-slate-400 focus:bg-white focus:ring-4 ${usernameError ? "border-red-300 focus:border-red-500" : usernameAvailable === true ? "border-green-300 focus:border-green-500" : usernameAvailable === false ? "border-amber-300 focus:border-amber-500" : "border-slate-200 focus:border-blue-500"}`} />
      <div className="absolute right-4 top-3.5">
        {isCheckingUser ? <Loader2 className="animate-spin text-slate-400" size={20} /> : usernameError ? <XCircle className="text-red-500" size={20} /> : usernameAvailable === true ? <CheckCircle className="text-green-500" size={20} /> : usernameAvailable === false ? <XCircle className="text-amber-500" size={20} /> : null}
      </div>
      {usernameError && <p className="text-[11px] text-red-500 font-bold mt-1.5 ml-1">{usernameError}</p>}
      {usernameAvailable === false && <p className="text-[11px] text-amber-500 font-bold mt-1.5 ml-1">{t.validation.userTaken}</p>}
    </div>
    
    <div className="relative group">
      <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
        {role === "student" ? <GraduationCap size={20} /> : <BookOpen size={20} />}
      </div>
      
      {role === "student" ? (
        <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} required className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold text-[15px] transition">
          <option value="">Sinf / Kursni tanlang</option>
          <option value="school_1">1 - Sinf</option>
          <option value="school_2">2 - Sinf</option>
          <option value="school_3">3 - Sinf</option>
          <option value="school_4">4 - Sinf</option>
          <option value="school_5">5 - Sinf</option>
          <option value="school_6">6 - Sinf</option>
          <option value="school_7">7 - Sinf</option>
          <option value="school_8">8 - Sinf</option>
          <option value="school_9">9 - Sinf</option>
          <option value="school_10">10 - Sinf</option>
          <option value="school_11">11 - Sinf</option>
          <option value="uni">Universitet / Boshqa</option>
        </select>
      ) : (
        <select name="schoolSubject" required value={formData.schoolSubject} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold text-[15px] transition">
          <option value="">Asosiy faningizni tanlang</option>
          <option value="matematika">Matematika</option>
          <option value="fizika">Fizika</option>
          <option value="kimyo">Kimyo</option>
          <option value="biologiya">Biologiya</option>
          <option value="ona_tili">Ona tili va Adabiyot</option>
          <option value="tarix">Tarix</option>
          <option value="ingliz_tili">Ingliz tili</option>
          <option value="rus_tili">Rus tili</option>
          <option value="informatika">Informatika</option>
          <option value="other">Boshqa fan</option>
        </select>
      )}
    </div>

    <div className="flex items-start gap-3 mt-4 text-slate-500 px-1">
      <input type="checkbox" required className="mt-1 w-4 h-4 rounded cursor-pointer accent-blue-600" />
      <p className="text-[12px] font-medium leading-relaxed">{t.terms}</p>
    </div>
  </div>
);