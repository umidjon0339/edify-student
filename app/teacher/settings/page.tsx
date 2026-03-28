'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile, deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { useAuth } from '@/lib/AuthContext';
import { User, Shield, Info, Loader2, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout'; 

import ProfileTab from './_components/ProfileTab';
import SecurityTab from './_components/SecurityTab';
import AboutTab from './_components/AboutTab';

// --- TRANSLATION DICTIONARY ---
const SETTINGS_TRANSLATIONS = {
  uz: {
    title: "Hisob Sozlamalari", tabs: { profile: "Profil", security: "Xavfsizlik", about: "Dastur haqida" },
    profile: { title: "Shaxsiy Ma'lumotlar", subtitle: "Shaxsingiz va aloqa ma'lumotlarini boshqaring.", fullName: "To'liq Ism", username: "Username", usernameTaken: "Band qilingan", usernameAvail: "Mavjud!", bio: "Men haqimda", bioPlace: "O'zingiz haqingizda...", email: "Email", phone: "Telefon", phonePlace: "+998 (90) 123-45-67", institution: "Muassasa", dob: "Tug'ilgan Sana", year: "Yil", month: "Oy", day: "Kun", location: "Joylashuv", region: "Viloyat", district: "Tuman", save: "Saqlash", saving: "Saqlanmoqda..." },
    security: { manageClasses: "Sinflarni Boshqarish", manageSub: "Faol sinflarni ko'ring yoki o'chiring.", noClasses: "Sinf yo'q.", students: "O'quvchi", passwordTitle: "Parol", passwordSub: "Kirish ma'lumotlari.", currentPass: "Joriy Parol", currentPlace: "Joriy parolni kiriting", newPass: "Yangi Parol", newPlace: "Kamida 6 belgi", confirmPass: "Tasdiqlash", confirmPlace: "Qayta kiriting", updateBtn: "Yangilash", updating: "Yangilanmoqda...", dangerTitle: "Xavfli Hudud", dangerSub: "Qaytarib bo'lmaydigan amallar.", deleteAccount: "Hisobni O'chirish", deleteWarning: "Bu sizning barcha ma'lumotlaringizni o'chiradi.", confirmDelete: "Tasdiqlash", googleConfirm: "Google orqali tasdiqlang.", passConfirm: "Parol orqali tasdiqlang.", cancel: "Bekor qilish", yesDelete: "O'chirish" },
    about: { title: "Platforma Info", descTitle: "AI bilan Ta'lim", desc: "Edify o'qituvchilarga o'quv materiallarini yaratishda yordam beradigan vositadir.", support: "Yordam", hotline: "Qaynoq liniya", dev: "Ishlab chiquvchi", version: "v1.0.0", rights: "Barcha huquqlar himoyalangan." },
    toasts: { saved: "Profil saqlandi!", failSave: "Xatolik", passChanged: "Parol o'zgartirildi!", wrongPass: "Joriy parol noto'g'ri", classDeleted: "Sinf o'chirildi", deleted: "Hisob o'chirildi", reqPass: "Parol talab qilinadi" },
    deleteModal: { title: "Sinfni O'chirish?", desc: "\"{title}\"ni o'chirmoqchimisiz? Qaytarib bo'lmaydi." }
  },
  en: {
    title: "Account Settings", tabs: { profile: "Profile", security: "Security", about: "About" },
    profile: { title: "Personal Info", subtitle: "Manage your identity.", fullName: "Full Name", username: "Username", usernameTaken: "Taken", usernameAvail: "Available!", bio: "Bio", bioPlace: "About me...", email: "Email", phone: "Phone", phonePlace: "+998 (90) 123-45-67", institution: "Institution", dob: "Date of Birth", year: "Year", month: "Month", day: "Day", location: "Location", region: "Region", district: "District", save: "Save", saving: "Saving..." },
    security: { manageClasses: "Manage Classes", manageSub: "Review or delete classes.", noClasses: "No classes yet.", students: "Students", passwordTitle: "Password", passwordSub: "Update credentials.", currentPass: "Current Password", currentPlace: "Current password", newPass: "New Password", newPlace: "Min 6 chars", confirmPass: "Confirm", confirmPlace: "Retype new", updateBtn: "Update", updating: "Updating...", dangerTitle: "Danger Zone", dangerSub: "Irreversible actions.", deleteAccount: "Delete Account", deleteWarning: "This deletes everything.", confirmDelete: "Confirm", googleConfirm: "Confirm with Google.", passConfirm: "Confirm with password.", cancel: "Cancel", yesDelete: "Delete" },
    about: { title: "Platform Info", descTitle: "Education with AI", desc: "Edify is a next-generation educational tool for teachers.", support: "Support", hotline: "Hotline", dev: "Developed By", version: "v1.0.0", rights: "All rights reserved." },
    toasts: { saved: "Saved!", failSave: "Failed to save", passChanged: "Password changed!", wrongPass: "Incorrect current password", classDeleted: "Class deleted", deleted: "Account deleted", reqPass: "Password required" },
    deleteModal: { title: "Delete Class?", desc: "Delete \"{title}\"? Cannot be undone." }
  },
  ru: {
    title: "Настройки Аккаунта", tabs: { profile: "Профиль", security: "Безопасность", about: "О Программе" },
    profile: { title: "Личная Информация", subtitle: "Управление данными.", fullName: "Имя", username: "Имя пользователя", usernameTaken: "Занято", usernameAvail: "Доступно!", bio: "Обо мне", bioPlace: "О себе...", email: "Email", phone: "Телефон", phonePlace: "+998 (90) 123-45-67", institution: "Учреждение", dob: "Дата Рождения", year: "Год", month: "Месяц", day: "День", location: "Локация", region: "Регион", district: "Район", save: "Сохранить", saving: "Сохранение..." },
    security: { manageClasses: "Классы", manageSub: "Управление классами.", noClasses: "Нет классов.", students: "Учеников", passwordTitle: "Пароль", passwordSub: "Обновление входа.", currentPass: "Текущий Пароль", currentPlace: "Текущий пароль", newPass: "Новый", newPlace: "Мин. 6 симв.", confirmPass: "Подтвердить", confirmPlace: "Повторите", updateBtn: "Обновить", updating: "Обновление...", dangerTitle: "Опасная Зона", dangerSub: "Необратимо.", deleteAccount: "Удалить Аккаунт", deleteWarning: "Удалит все данные.", confirmDelete: "Подтверждение", googleConfirm: "Подтвердите Google.", passConfirm: "Подтвердите паролем.", cancel: "Отмена", yesDelete: "Удалить Всё" },
    about: { title: "Инфо", descTitle: "Образование с ИИ", desc: "Edify — инструмент для создания учебных материалов.", support: "Поддержка", hotline: "Горячая линия", dev: "Разработано", version: "v1.0.0", rights: "Все права защищены." },
    toasts: { saved: "Сохранено!", failSave: "Ошибка", passChanged: "Пароль изменен!", wrongPass: "Неверный текущий", classDeleted: "Класс удален", deleted: "Аккаунт удален.", reqPass: "Нужен пароль" },
    deleteModal: { title: "Удалить Класс?", desc: "Удалить \"{title}\"? Это нельзя отменить." }
  }
};

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

const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = SETTINGS_TRANSLATIONS[lang] || SETTINGS_TRANSLATIONS['en'];
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'about'>('profile');

  // State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classList, setClassList] = useState<any[]>([]);
  const [classToDelete, setClassToDelete] = useState<{ id: string, title: string } | null>(null);

  const [formData, setFormData] = useState({ displayName: '', username: '', originalUsername: '', email: '', phone: '', birthDate: '', institution: '', bio: '', location: { country: 'Uzbekistan', region: '', district: '' } });
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'valid' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

  const isGoogleUser = user?.providerData.some((p) => p.providerId === 'google.com');

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setFormData({ displayName: data.displayName || '', username: data.username || '', originalUsername: data.username || '', email: data.email || user.email || '', phone: data.phone || '', birthDate: data.birthDate || '', institution: data.institution || '', bio: data.bio || '', location: { country: data.location?.country || 'Uzbekistan', region: data.location?.region || '', district: data.location?.district || '' } });
        }
        const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
        const classSnap = await getDocs(q);
        setClassList(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { toast.error("Failed to load"); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!isGoogleUser && !deletePassword) return toast.error(t.toasts.reqPass);
    setIsDeleting(true); const toastId = toast.loading("Processing...");
    try {
      if (isGoogleUser) { await reauthenticateWithPopup(user, new GoogleAuthProvider()); } 
      else { await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email!, deletePassword)); }
      const classesSnap = await getDocs(query(collection(db, 'classes'), where('teacherId', '==', user.uid)));
      const testsSnap = await getDocs(query(collection(db, 'custom_tests'), where('teacherId', '==', user.uid)));
      await Promise.all([...classesSnap.docs.map(d => deleteDoc(d.ref)), ...testsSnap.docs.map(d => deleteDoc(d.ref))]);
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid));
      if (formData.originalUsername) batch.delete(doc(db, 'usernames', formData.originalUsername));
      await batch.commit(); await deleteUser(user);
      toast.success(t.toasts.deleted, { id: toastId }); router.push('/auth/login');
    } catch (error: any) { toast.error(error.code === 'auth/wrong-password' ? t.toasts.wrongPass : "Deletion failed.", { id: toastId }); } 
    finally { setIsDeleting(false); }
  };

  useEffect(() => {
    const input = formData.username.trim().toLowerCase();
    const original = formData.originalUsername?.toLowerCase();
    if (!input) { setUsernameStatus('idle'); return; }
    if (input.length < 5) { setUsernameStatus('invalid'); setUsernameError('Min 5 chars'); return; }
    if (!USERNAME_REGEX.test(input)) { setUsernameStatus('invalid'); setUsernameError('Letters, numbers, _'); return; }
    if (input === original) { setUsernameStatus('valid'); setUsernameError(''); return; }
    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      try { const snap = await getDoc(doc(db, 'usernames', input)); if (snap.exists()) { setUsernameStatus('taken'); } else { setUsernameStatus('valid'); } } catch (e) { setUsernameStatus('idle'); }
    }, 500); 
    return () => clearTimeout(timer);
  }, [formData.username, formData.originalUsername]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!formData.displayName.trim() || usernameStatus !== 'valid' || !formData.institution.trim() || !formData.location.region) return toast.error("Please fill all required fields correctly.");
    setSaving(true);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', user.uid), { displayName: formData.displayName, username: formData.username.toLowerCase(), phone: formData.phone, birthDate: formData.birthDate, institution: formData.institution, bio: formData.bio, location: formData.location });
      if (formData.username.toLowerCase() !== formData.originalUsername.toLowerCase()) {
        if (formData.originalUsername) batch.delete(doc(db, 'usernames', formData.originalUsername.toLowerCase()));
        batch.set(doc(db, 'usernames', formData.username.toLowerCase()), { uid: user.uid });
      }
      await batch.commit(); await updateProfile(user, { displayName: formData.displayName });
      setFormData(prev => ({ ...prev, originalUsername: prev.username })); toast.success(t.toasts.saved); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { toast.error(t.toasts.failSave); } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    setSaving(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, passwords.current));
      await updatePassword(user, passwords.new);
      toast.success(t.toasts.passChanged); setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) { toast.error(error.code === 'auth/invalid-credential' ? t.toasts.wrongPass : "Failed to change"); } 
    finally { setSaving(false); }
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    try { await deleteDoc(doc(db, 'classes', classToDelete.id)); setClassList(prev => prev.filter(c => c.id !== classToDelete.id)); toast.success(t.toasts.classDeleted); setClassToDelete(null); } catch (error) {}
  };

  const formatPhoneNumber = (v: string) => { const n = v.replace(/\D/g, ''); if (!n) return '+998 '; let f = '+998 '; const i = n.startsWith('998') ? n.slice(3) : n; if (i.length > 0) f += `(${i.slice(0, 2)}`; if (i.length >= 2) f += `) ${i.slice(2, 5)}`; if (i.length >= 5) f += `-${i.slice(5, 7)}`; if (i.length >= 7) f += `-${i.slice(7, 9)}`; return f; };

  if (loading) return <div className="min-h-[100dvh] bg-[#FAFAFA] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-10 space-y-6">
        
        {/* HEADER & TABS */}
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50"><SettingsIcon size={20} /></div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{t.title}</h1>
          </div>
          
          <div className="flex p-1.5 bg-slate-200/50 rounded-[1.2rem] overflow-x-auto hide-scrollbar border border-slate-200/60 shadow-inner">
            {[
              { id: 'profile', label: t.tabs.profile, icon: User, activeClass: 'bg-white text-indigo-600 shadow-[0_2px_10px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/50' },
              { id: 'security', label: t.tabs.security, icon: Shield, activeClass: 'bg-white text-orange-600 shadow-[0_2px_10px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/50' },
              { id: 'about', label: t.tabs.about, icon: Info, activeClass: 'bg-white text-slate-700 shadow-[0_2px_10px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/50' },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap flex-1 ${activeTab === tab.id ? tab.activeClass : 'text-slate-500 hover:text-slate-800'}`}>
                <tab.icon size={16} strokeWidth={2.5} /> <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT RENDERER */}
        <div className="pt-2">
          {activeTab === 'profile' && <ProfileTab formData={formData} setFormData={setFormData} saving={saving} usernameStatus={usernameStatus} usernameError={usernameError} handleSaveProfile={handleSaveProfile} t={t} UZB_LOCATIONS={UZB_LOCATIONS} formatPhoneNumber={formatPhoneNumber}/>}
          {activeTab === 'security' && <SecurityTab classList={classList} setClassToDelete={setClassToDelete} isGoogleUser={isGoogleUser} passwords={passwords} setPasswords={setPasswords} showPass={showPass} setShowPass={setShowPass} handleChangePassword={handleChangePassword} saving={saving} showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm} deletePassword={deletePassword} setDeletePassword={setDeletePassword} handleDeleteAccount={handleDeleteAccount} isDeleting={isDeleting} t={t}/>}
          {activeTab === 'about' && <AboutTab t={t}/>}
        </div>

        {/* DELETE CLASS MODAL */}
        {classToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setClassToDelete(null)}></div>
            <div className="relative bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border border-slate-100 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-5 mx-auto"><AlertTriangle size={28} /></div>
              <h3 className="text-[18px] font-black text-slate-900 mb-2">{t.deleteModal.title}</h3>
              <p className="text-[13px] text-slate-500 font-medium mb-8">{t.deleteModal.desc.replace("{title}", classToDelete.title)}</p>
              <div className="flex gap-3">
                <button onClick={() => setClassToDelete(null)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors text-[13px]">{t.security.cancel}</button>
                <button onClick={confirmDeleteClass} className="flex-1 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 transition-all text-[13px]">{t.security.yesDelete}</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}