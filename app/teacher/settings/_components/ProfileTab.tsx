'use client';

import { AtSign, Phone, Briefcase, MapPin, Loader2, CheckCircle, XCircle, Save } from 'lucide-react';

export default function ProfileTab({ 
  formData, setFormData, saving, usernameStatus, usernameError, handleSaveProfile, t, UZB_LOCATIONS, formatPhoneNumber 
}: any) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-black text-slate-900 tracking-tight">{t.profile.title}</h2>
          <p className="text-[13px] font-medium text-slate-500 mt-1">{t.profile.subtitle}</p>
        </div>
        <button 
          onClick={handleSaveProfile} 
          disabled={saving || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'} 
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-[13px]"
        >
          {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
          <span className="hidden sm:inline">{t.profile.save}</span>
        </button>
      </div>
      
      <div className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Display Name */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.profile.fullName}</label>
            <input type="text" value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"/>
          </div>

          {/* Username */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.profile.username}</label>
            <div className="relative group">
              <AtSign className="absolute left-4 top-3.5 text-slate-400" size={16}/>
              <input 
                type="text" value={formData.username} 
                onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().trim()})} 
                className={`w-full pl-11 pr-10 py-3 border rounded-xl font-bold text-[14px] outline-none transition-all ${
                  usernameStatus === 'valid' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 
                  usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-500 bg-red-50 text-red-800' : 
                  'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 text-slate-900'
                }`}
              />
              <div className="absolute right-4 top-3.5">
                {usernameStatus === 'checking' && <Loader2 className="animate-spin text-slate-400" size={16}/>}
                {usernameStatus === 'valid' && <CheckCircle className="text-emerald-500" size={16}/>}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="text-red-500" size={16}/>}
              </div>
            </div>
            {usernameStatus === 'taken' && <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mt-1.5 ml-1">{t.profile.usernameTaken}</p>}
            {usernameStatus === 'valid' && formData.username !== formData.originalUsername && <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1.5 ml-1">{t.profile.usernameAvail}</p>}
          </div>

          {/* Bio */}
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.profile.bio}</label>
              <span className={`text-[10px] font-black tracking-widest ${formData.bio?.length >= 100 ? 'text-red-500' : 'text-slate-400'}`}>
                {formData.bio?.length || 0}/100
              </span>
            </div>
            <textarea 
              rows={3} maxLength={100} value={formData.bio || ''} onChange={(e) => setFormData({...formData, bio: e.target.value})} placeholder={t.profile.bioPlace}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 focus:bg-white focus:border-indigo-400 outline-none resize-none transition-all"
            />
          </div>

          {/* 🟢 NEW SECTION: Professional Info */}
          <div className="col-span-2 border-t border-slate-100 pt-6 mt-2">
            <label className="block text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-3">Professional Info</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Gender */}
              <div>
                <select value={formData.gender || ''} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all">
                  <option value="">{t.profile.gender || "Jinsi (Gender)"}</option>
                  <option value="male">Erkak (Male)</option>
                  <option value="female">Ayol (Female)</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <select value={formData.subject || ''} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all">
                  <option value="">{t.profile.subject || "Fani"}</option>
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
              </div>

              {/* Experience (Saved as Integer) */}
              <div>
                <input 
                  type="number" min="0" max="60"
                  value={formData.experience === 0 && !formData.experience ? '' : formData.experience} 
                  onChange={(e) => setFormData({...formData, experience: parseInt(e.target.value) || 0})} 
                  placeholder={t.profile.experience || "Tajriba (Yil)"}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                />
              </div>

            </div>
          </div>

          {/* Email */}
          <div className="mt-4">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.profile.email}</label>
            <div className="px-4 py-3 bg-slate-100 rounded-xl text-slate-500 font-mono text-[13px] font-bold border border-slate-200 cursor-not-allowed truncate">{formData.email}</div>
          </div>

          {/* Phone (Using your exact Signup Formatter) */}
          <div className="mt-4">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.profile.phone}</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input 
                type="tel" value={formData.phone} maxLength={19} 
                onChange={(e) => setFormData({...formData, phone: formatPhoneNumber(e.target.value)})} 
                placeholder={t.profile.phonePlace || "+998"}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Birth Date (Restored to <input type="date">) */}
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.profile.dob}</label>
            <input 
              type="date" 
              max={new Date().toISOString().split("T")[0]} 
              value={formData.birthDate || ''} 
              onChange={(e) => setFormData({...formData, birthDate: e.target.value})} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all"
            />
          </div>

          {/* Institution */}
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.profile.institution}</label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input type="text" value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"/>
            </div>
          </div>

          {/* Location */}
          <div className="col-span-2 border-t border-slate-100 pt-6 mt-2">
            <label className="block text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><MapPin size={14}/> {t.profile.location}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select value={formData.location?.region || ''} onChange={(e) => setFormData({...formData, location: { ...formData.location, region: e.target.value, district: '' }})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all">
                <option value="">{t.profile.region || "Viloyatni tanlang"}</option>
                {Object.keys(UZB_LOCATIONS).map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
              <select value={formData.location?.district || ''} onChange={(e) => setFormData({...formData, location: { ...formData.location, district: e.target.value }})} disabled={!formData.location?.region} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all disabled:opacity-50 disabled:bg-slate-100">
                <option value="">{t.profile.district || "Tumanni tanlang"}</option>
                {formData.location?.region && UZB_LOCATIONS[formData.location.region]?.map((district: string) => <option key={district} value={district}>{district}</option>)}
              </select>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}