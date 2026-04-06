"use client";

import { Loader2, CheckCircle, XCircle, GraduationCap, School, User, Mail, Lock, MapPin, Building2, Eye, EyeOff,ArrowRight } from "lucide-react";
import Link from "next/link";

export const Step0Role = ({ setRole, t }: any) => (
  <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    {/* 🟢 TEACHER CARD - MOVED TO TOP */}
    <button 
      type="button" 
      onClick={() => setRole("teacher")} 
      className="group relative p-5 md:p-6 rounded-[1.5rem] bg-white border-2 border-slate-100 hover:border-indigo-500 hover:shadow-[0_12px_40px_-15px_rgba(99,102,241,0.2)] transition-all duration-300 text-left flex items-center justify-between active:scale-[0.98] overflow-hidden"
    >
      {/* Premium Hover Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-center gap-5 z-10">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
          <School size={28} strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-[17px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
            {t.roles.teacher.title}
          </h3>
          <p className="text-[14px] font-medium text-slate-500 mt-0.5 leading-relaxed pr-4">
            {t.roles.teacher.desc}
          </p>
        </div>
      </div>

      {/* Action Arrow Indicator */}
      <div className="relative z-10 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shrink-0 transform group-hover:translate-x-1 border border-slate-200 group-hover:border-indigo-600 shadow-sm">
        <ArrowRight size={16} strokeWidth={2.5} />
      </div>
    </button>

    {/* 🟢 STUDENT CARD - MOVED TO BOTTOM */}
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
          <h3 className="text-[17px] font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
            {t.roles.student.title}
          </h3>
          <p className="text-[14px] font-medium text-slate-500 mt-0.5 leading-relaxed pr-4">
            {t.roles.student.desc}
          </p>
        </div>
      </div>

      <div className="relative z-10 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shrink-0 transform group-hover:translate-x-1 border border-slate-200 group-hover:border-emerald-600 shadow-sm">
        <ArrowRight size={16} strokeWidth={2.5} />
      </div>
    </button>

    {/* Enhanced Login Link */}
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

export const Step1Credentials = ({ formData, handleChange, usernameError, usernameAvailable, isCheckingUser, showPassword, setShowPassword, t }: any) => (
  <div className="space-y-4 animate-in fade-in slide-in-from-right">
    <div className="relative group">
      <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
      <input name="email" type="email" placeholder={t.inputs.email} required value={formData.email} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition font-semibold text-[15px]" />
    </div>
    <div className="relative group">
      <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
      <input name="username" type="text" placeholder={t.inputs.username} required value={formData.username} onChange={handleChange} className={`w-full pl-12 pr-10 py-3.5 rounded-xl border outline-none font-semibold text-[15px] transition text-slate-900 bg-slate-50 placeholder:text-slate-400 focus:bg-white focus:ring-4 ${usernameError ? "border-red-300 focus:border-red-500" : usernameAvailable === true ? "border-green-300 focus:border-green-500" : usernameAvailable === false ? "border-amber-300 focus:border-amber-500" : "border-slate-200 focus:border-blue-500"}`} />
      <div className="absolute right-4 top-3.5">
        {isCheckingUser ? <Loader2 className="animate-spin text-slate-400" size={20} /> : usernameError ? <XCircle className="text-red-500" size={20} /> : usernameAvailable === true ? <CheckCircle className="text-green-500" size={20} /> : usernameAvailable === false ? <XCircle className="text-amber-500" size={20} /> : null}
      </div>
      {usernameError && <p className="text-[11px] text-red-500 font-bold mt-1.5 ml-1">{usernameError}</p>}
      {usernameAvailable === false && <p className="text-[11px] text-amber-500 font-bold mt-1.5 ml-1">{t.validation.userTaken}</p>}
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="relative group">
        <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input name="password" type={showPassword ? "text" : "password"} placeholder={t.inputs.password} required value={formData.password} onChange={handleChange} className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold transition text-[15px]" />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
      <div className="relative group">
        <input name="confirmPassword" type={showPassword ? "text" : "password"} placeholder={t.inputs.confirm} required value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold transition text-[15px]" />
      </div>
    </div>
  </div>
);

export const Step2Personal = ({ formData, handleChange, t }: any) => (
  <div className="space-y-4 animate-in fade-in slide-in-from-right">
    <div className="group">
      <input name="fullName" type="text" placeholder={t.inputs.fullname} required value={formData.fullName} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold transition text-[15px]" />
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1.5 block">{t.inputs.birth}</label>
        <input name="birthDate" type="date" required max={new Date().toISOString().split("T")[0]} value={formData.birthDate} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold transition text-[15px]" />
      </div>
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1.5 block">{t.selects.gender}</label>
        <select name="gender" required value={formData.gender} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold text-[15px] transition">
          <option value="">Tanlang...</option>
          <option value="male">Erkak (Male)</option>
          <option value="female">Ayol (Female)</option>
        </select>
      </div>
    </div>
    <div>
      <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1.5 block">{t.inputs.phone}</label>
      <input name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="+998" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold transition text-[15px]" />
    </div>
  </div>
);

export const Step3Location = ({ formData, setFormData, handleChange, locations, t }: any) => (
  <div className="space-y-4 animate-in fade-in slide-in-from-right">
    <div className="relative">
      <MapPin className="absolute left-4 top-3.5 text-slate-400" size={20} />
      <input name="country" type="text" value="Uzbekistan" disabled className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-bold cursor-not-allowed text-[15px]" />
    </div>
    <select name="region" value={formData.region} required onChange={(e) => setFormData({ ...formData, region: e.target.value, district: "" })} className={`w-full px-4 py-3.5 rounded-xl border bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold text-[15px] transition`}>
      <option value="">{t.selects.region}</option>
      {Object.keys(locations).map((r) => <option key={r} value={r}>{r}</option>)}
    </select>
    <select name="district" value={formData.district} required onChange={handleChange} disabled={!formData.region} className={`w-full px-4 py-3.5 rounded-xl border bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold text-[15px] transition disabled:opacity-50 disabled:bg-slate-100`}>
      <option value="">{t.selects.district}</option>
      {formData.region && locations[formData.region]?.map((d: string) => <option key={d} value={d}>{d}</option>)}
    </select>
  </div>
);



export const Step4WorkEdu = ({ formData, handleChange, role, t }: any) => (
  <div className="space-y-4 animate-in fade-in slide-in-from-right">
    <div className="relative group">
      <Building2 className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
      <input 
        name="institutionName" 
        type="text" 
        placeholder={role === "student" ? t.inputs.institution : t.inputs.institutionOrg} 
        required 
        value={formData.institutionName} 
        onChange={handleChange} 
        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-semibold transition text-[15px]" 
      />
    </div>
    
    {role === "student" ? (
      <select 
        name="gradeLevel" 
        value={formData.gradeLevel} 
        onChange={handleChange} 
        required 
        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold text-[15px] transition"
      >
        <option value="">{t.selects.grade}</option>
        {/* Added Grades 1-6 */}
        <option value="school_1">1st Grade</option>
        <option value="school_2">2nd Grade</option>
        <option value="school_3">3rd Grade</option>
        <option value="school_4">4th Grade</option>
        <option value="school_5">5th Grade</option>
        <option value="school_6">6th Grade</option>
        {/* Existing Grades */}
        <option value="school_7">7th Grade</option>
        <option value="school_8">8th Grade</option>
        <option value="school_9">9th Grade</option>
        <option value="school_10">10th Grade</option>
        <option value="school_11">11th Grade</option>
        <option value="uni_1">University - 1st Year</option>
        <option value="uni_2">University - 2nd Year</option>
        <option value="uni_3">University - 3rd Year</option>
        <option value="uni_4">University - 4th Year</option>
      </select>
    ) : (
      <select 
        name="schoolSubject" 
        required 
        value={formData.schoolSubject} 
        onChange={handleChange} 
        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold text-[15px] transition"
      >
        <option value="">{t.selects.subject}</option>
        <option value="matematika">Matematika</option>
        <option value="fizika">Fizika</option>
        <option value="kimyo">Kimyo</option>
        <option value="biologiya">Biologiya</option>
        <option value="informatika">Informatika</option>
        <option value="ona_tili">Ona tili va Adabiyot</option>
        <option value="tarix">Tarix</option>
        <option value="ingliz_tili">Ingliz tili</option>
        <option value="rus_tili">Rus tili</option>
        <option value="geografiya">Geografiya</option>
        <option value="other">Boshqa</option>
      </select>
    )}
    
    <div className="flex items-start gap-3 mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-slate-700">
      <input 
        type="checkbox" 
        required 
        className="mt-1 w-4 h-4 rounded cursor-pointer accent-blue-600 border-slate-300" 
      />
      <p className="text-[13px] font-medium leading-relaxed">{t.terms}</p>
    </div>
  </div>
);

export const Step10Google = ({ formData, handleChange, googleUser, role, usernameError, usernameAvailable, isCheckingUser, t }: any) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right">
    <div className="flex justify-center mb-6">
      {googleUser?.photoURL ? (
        <img src={googleUser.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center text-slate-400"><User size={40}/></div>
      )}
    </div>
    
    <div className="relative group">
      <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500" size={20} />
      <input name="username" type="text" placeholder={t.placeholders.username} required value={formData.username} onChange={handleChange} className={`w-full pl-12 pr-10 py-3.5 rounded-xl border outline-none font-semibold text-[15px] transition text-slate-900 bg-slate-50 focus:bg-white focus:ring-4 ${usernameError ? "border-red-300 focus:border-red-500" : usernameAvailable === true ? "border-green-300 focus:border-green-500" : usernameAvailable === false ? "border-amber-300 focus:border-amber-500" : "border-slate-200 focus:border-blue-500"}`} />
      <div className="absolute right-4 top-3.5">
        {isCheckingUser ? <Loader2 className="animate-spin text-slate-400" size={20} /> : usernameError ? <XCircle className="text-red-500" size={20} /> : usernameAvailable === true ? <CheckCircle className="text-green-500" size={20} /> : usernameAvailable === false ? <XCircle className="text-amber-500" size={20} /> : null}
      </div>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <select name="gender" required value={formData.gender} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold text-[15px] transition">
        <option value="">{t.selects.gender}</option>
        <option value="male">Erkak (Male)</option>
        <option value="female">Ayol (Female)</option>
      </select>
      {role === 'teacher' && (
        <select name="schoolSubject" required value={formData.schoolSubject} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white outline-none font-semibold text-[15px] transition">
          <option value="">{t.selects.subject}</option>
          <option value="matematika">Matematika</option>
          <option value="fizika">Fizika</option>
          <option value="kimyo">Kimyo</option>
          <option value="biologiya">Biologiya</option>
          <option value="informatika">Informatika</option>
          <option value="ona_tili">Ona tili va Adabiyot</option>
          <option value="tarix">Tarix</option>
          <option value="ingliz_tili">Ingliz tili</option>
          <option value="rus_tili">Rus tili</option>
          <option value="geografiya">Geografiya</option>
          <option value="other">Boshqa</option>
        </select>
      )}
    </div>
  </div>
);