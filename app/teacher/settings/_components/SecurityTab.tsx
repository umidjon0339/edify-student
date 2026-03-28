'use client';

import { Lock, Trash2, Eye, EyeOff, AlertTriangle, Layout, BookOpen, Loader2 } from 'lucide-react';

export default function SecurityTab({ 
  classList, setClassToDelete, isGoogleUser, passwords, setPasswords, showPass, setShowPass, 
  handleChangePassword, saving, showDeleteConfirm, setShowDeleteConfirm, deletePassword, 
  setDeletePassword, handleDeleteAccount, isDeleting, t 
}: any) {
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. CLASS MANAGEMENT */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Layout size={20}/></div>
          <div>
            <h2 className="text-[16px] font-black text-slate-800">{t.security.manageClasses}</h2>
            <p className="text-[12px] font-medium text-slate-500">{t.security.manageSub}</p>
          </div>
        </div>
        <div className="p-6 md:p-8">
            {classList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-[13px] font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">{t.security.noClasses}</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {classList.map((cls: any) => (
                        <div key={cls.id} className="flex items-center justify-between p-4 border border-slate-200/80 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-slate-200 text-blue-600 rounded-xl flex items-center justify-center font-bold shadow-sm"><BookOpen size={16}/></div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-[14px] line-clamp-1">{cls.title}</h3>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{cls.studentIds?.length || 0} {t.security.students}</p>
                                </div>
                            </div>
                            <button onClick={() => setClassToDelete({ id: cls.id, title: cls.title })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* 2. PASSWORD SECURITY */}
      {!isGoogleUser && (
        <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="p-6 md:p-8 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500"><Lock size={20}/></div>
            <div>
              <h2 className="text-[16px] font-black text-slate-800">{t.security.passwordTitle}</h2>
              <p className="text-[12px] font-medium text-slate-500">{t.security.passwordSub}</p>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.security.currentPass}</label>
                <div className="relative">
                  <input type={showPass.current ? "text" : "password"} value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 focus:bg-white focus:border-orange-400 outline-none transition-all bg-slate-50" placeholder={t.security.currentPlace} />
                  <button onClick={() => setShowPass({...showPass, current: !showPass.current})} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPass.current ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.security.newPass}</label>
                <div className="relative">
                  <input type={showPass.new ? "text" : "password"} value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 focus:bg-white focus:border-orange-400 outline-none transition-all bg-slate-50" placeholder={t.security.newPlace} />
                  <button onClick={() => setShowPass({...showPass, new: !showPass.new})} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPass.new ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.security.confirmPass}</label>
                <div className="relative">
                  <input type={showPass.confirm ? "text" : "password"} value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} className={`w-full px-4 py-3 border rounded-xl text-[14px] font-bold text-slate-800 outline-none transition-all ${passwords.confirm && passwords.new !== passwords.confirm ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-400'}`} placeholder={t.security.confirmPlace} />
                  <button onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPass.confirm ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                </div>
              </div>
              <div className="md:col-span-2 pt-2 flex justify-end">
                <button onClick={handleChangePassword} disabled={saving || !passwords.current || !passwords.new || (passwords.new !== passwords.confirm)} className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-[13px]">
                  {saving ? <Loader2 size={16} className="animate-spin inline mr-2"/> : null}
                  {saving ? t.security.updating : t.security.updateBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DANGER ZONE */}
      <div className="bg-red-50/30 border border-red-100 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 md:p-8 border-b border-red-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600"><AlertTriangle size={20}/></div>
          <div>
            <h2 className="text-[16px] font-black text-red-700">{t.security.dangerTitle}</h2>
            <p className="text-[12px] font-medium text-red-500">{t.security.dangerSub}</p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {!showDeleteConfirm ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-[14px]">{t.security.deleteAccount}</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1">{t.security.deleteWarning}</p>
              </div>
              <button onClick={() => setShowDeleteConfirm(true)} className="px-6 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-all shadow-sm text-[13px] whitespace-nowrap">
                {t.security.deleteAccount}
              </button>
            </div>
          ) : (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-red-200 shadow-sm animate-in zoom-in-95">
              <h3 className="text-[16px] font-black text-slate-800 mb-2">{t.security.confirmDelete}</h3>
              {isGoogleUser ? (
                <p className="text-[13px] font-medium text-slate-500 mb-6">{t.security.googleConfirm}</p>
              ) : (
                <>
                  <p className="text-[13px] font-medium text-slate-500 mb-4">{t.security.passConfirm}</p>
                  <input type="password" placeholder={t.security.currentPlace} value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 outline-none focus:border-red-500 mb-6 bg-slate-50 focus:bg-white" />
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-[13px]">
                  {t.security.cancel}
                </button>
                <button onClick={handleDeleteAccount} disabled={(!isGoogleUser && !deletePassword) || isDeleting} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-[13px] shadow-md shadow-red-600/20">
                  {isDeleting ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>} 
                  {t.security.yesDelete}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}