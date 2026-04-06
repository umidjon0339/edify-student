'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db, auth } from '@/lib/firebase';
import { 
  doc, getDoc, updateDoc, writeBatch, collection, query, 
  where, getDocs, arrayRemove, deleteDoc 
} from 'firebase/firestore';
import { 
  updateProfile, updatePassword, deleteUser, reauthenticateWithCredential, 
  EmailAuthProvider, GoogleAuthProvider, reauthenticateWithPopup 
} from 'firebase/auth';
import { checkUsernameUnique } from '@/services/userService';
import { useStudentLanguage } from '../layout';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { 
  User, Shield, Settings as SettingsIcon, AtSign, Phone, Mail, 
  Calendar, Building, RefreshCw, CheckCircle, XCircle, 
  AlertTriangle, Key, Trash2, Check, Loader2, MapPin, GraduationCap, Smile,AlertCircle,Info,Send, Github, Linkedin
} from 'lucide-react';

// --- 1. TRANSLATION DICTIONARY ---
const SETTINGS_TRANSLATIONS: any = {
  uz: {
    title: "Sozlamalar",
    tabs: { profile: "Profil", account: "Hisob", security: "Xavfsizlik",about: "Ilova" },
    labels: { fullName: "To'liq Ism", birthDate: "Tug'ilgan Sana", bio: "O'zim haqimda", region: "Viloyat", district: "Tuman", selectRegion: "Viloyatni tanlang", selectDistrict: "Tumanni tanlang", school: "Muassasa nomi", grade: "Sinf/Kurs", selectGrade: "Sinfni tanlang", gender: "Jinsi", selectGender: "Jinsni tanlang", username: "Foydalanuvchi nomi", phone: "Telefon raqami", email: "Email" },
    genders: { male: "Erkak (Male)", female: "Ayol (Female)" },
    status: { minChar: "Kamida 5 ta belgi", regex: "Harf bilan boshlang", taken: "Bu nom band", avail: "Bu nom bo'sh!" },
    security: { warn: "Parolni o'zgartirish qayta kirishni talab qiladi.", googleWarn: "Siz Google orqali kirdingiz. Parol kerak emas.", current: "Joriy Parol", new: "Yangi Parol", confirm: "Tasdiqlash", updateBtn: "Parolni Yangilash", danger: "Xavfli Hudud", deleteTitle: "Hisobni O'chirish", deleteDesc: "Hisob o'chirilgach, uni qayta tiklab bo'lmaydi.", deleteBtn: "O'chirish", sureTitle: "Ishonchingiz komilmi?", sureDesc: "Bu amal barcha yutuqlar va ma'lumotlarni butunlay o'chiradi.", passPlace: "Tasdiqlash uchun parolni kiriting", cancel: "Bekor qilish", yesDelete: "Ha, O'chirish" },
    buttons: { save: "Saqlash", saving: "Saqlanmoqda..." },
    toasts: { success: "Sozlamalar yangilandi!", errPass: "Parol noto'g'ri", errDel: "O'chirishda xatolik", passUpdate: "Parol yangilandi!", passReq: "Parolni kiriting", clean: "Tozalanmoqda...", deleted: "Hisob o'chirildi." },
    aboutContent: {
      title: "O'quvchi Portali",
      descTitle: "Biz haqimizda",
      desc: "EdifyStudent - bu o'quvchilar uchun interaktiv ta'lim platformasi. OTMga kirish uchun va Milliy sertifikatga tayyorlarish uchun yaratilgan ilova. XP yig'ing, seriyani saqlang va bilimlaringizni sinab ko'ring!",
      support: "Yordam va Aloqa",
      hotline: "Ishonch telefoni",
      dev: "Dasturchilar",
      version: "Versiya 2.0.0",
      rights: "Barcha huquqlar himoyalangan"
    }
  },
  en: {
    title: "Settings",
    tabs: { profile: "Profile", account: "Account", security: "Security", about: "About" },
    labels: { fullName: "Full Name", birthDate: "Birth Date", bio: "Bio", region: "Region", district: "District", selectRegion: "Select Region", selectDistrict: "Select District", school: "Institution Name", grade: "Grade", selectGrade: "Select Grade", gender: "Gender", selectGender: "Select Gender", username: "Username", phone: "Phone Number", email: "Email" },
    genders: { male: "Male", female: "Female" },
    status: { minChar: "Min 5 chars", regex: "Start with letter", taken: "Taken", avail: "Available!" },
    security: { warn: "Changing password requires re-login.", googleWarn: "Logged in via Google. No password needed.", current: "Current Password", new: "New Password", confirm: "Confirm Password", updateBtn: "Update Password", danger: "Danger Zone", deleteTitle: "Delete Account", deleteDesc: "Once deleted, it cannot be recovered.", deleteBtn: "Delete", sureTitle: "Are you sure?", sureDesc: "This will permanently delete all your progress and data.", passPlace: "Enter password to confirm", cancel: "Cancel", yesDelete: "Yes, Delete" },
    buttons: { save: "Save Changes", saving: "Saving..." },
    toasts: { success: "Settings updated!", errPass: "Incorrect password", errDel: "Failed to delete", passUpdate: "Password updated!", passReq: "Enter password", clean: "Cleaning up...", deleted: "Account deleted." },
    aboutContent: {
      title: "Student Portal",
      descTitle: "About Us",
      desc: "EdifyStudent is an interactive learning platform for students. Earn XP, keep your streak alive, and test your knowledge!",
      support: "Support & Contact",
      hotline: "Hotline",
      dev: "Developers",
      version: "Version 2.0.0",
      rights: "All rights reserved"
    }

  },
  ru: {
    title: "Настройки",
    tabs: { profile: "Профиль", account: "Аккаунт", security: "Безопасность", about: "О приложении" },
    labels: { fullName: "Полное Имя", birthDate: "Дата Рождения", bio: "О себе", region: "Регион", district: "Район", selectRegion: "Выберите регион", selectDistrict: "Выберите район", school: "Название учреждения", grade: "Класс/Курс", selectGrade: "Выберите класс", gender: "Пол", selectGender: "Выберите пол", username: "Имя пользователя", phone: "Телефон", email: "Email" },
    genders: { male: "Мужской (Male)", female: "Женский (Female)" },
    status: { minChar: "Мин. 5 символов", regex: "Начните с буквы", taken: "Занято", avail: "Доступно!" },
    security: { warn: "Смена пароля требует повторного входа.", googleWarn: "Вход через Google. Пароль не нужен.", current: "Текущий пароль", new: "Новый пароль", confirm: "Подтверждение", updateBtn: "Обновить пароль", danger: "Опасная Зона", deleteTitle: "Удалить Аккаунт", deleteDesc: "Удаление необратимо.", deleteBtn: "Удалить", sureTitle: "Вы уверены?", sureDesc: "Это навсегда удалит весь ваш прогресс и данные.", passPlace: "Введите пароль", cancel: "Отмена", yesDelete: "Да, Удалить" },
    buttons: { save: "Сохранить", saving: "Сохранение..." },
    toasts: { success: "Настройки обновлены!", errPass: "Неверный пароль", errDel: "Ошибка удаления", passUpdate: "Пароль обновлен!", passReq: "Введите пароль", clean: "Очистка...", deleted: "Аккаунт удален." },
    aboutContent: {
      title: "Портал Ученика",
      descTitle: "О нас",
      desc: "EdifyStudent — это интерактивная образовательная платформа. Зарабатывайте XP, держите серию и проверяйте свои знания!",
      support: "Поддержка и Контакты",
      hotline: "Горячая линия",
      dev: "Разработчики",
      version: "Версия 2.0.0",
      rights: "Все права защищены"
    }

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

const GRADES = [
  "school_1", "school_2", "school_3", "school_4", "school_5", "school_6", 
  "school_7", "school_8", "school_9", "school_10", "school_11", 
  "uni_1", "uni_2", "uni_3", "uni_4"
];

const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 0) return '+998 ';
  let formatted = '+998 ';
  const inputNumbers = numbers.startsWith('998') ? numbers.slice(3) : numbers;
  if (inputNumbers.length > 0) formatted += `(${inputNumbers.slice(0, 2)}`;
  if (inputNumbers.length >= 2) formatted += `) ${inputNumbers.slice(2, 5)}`;
  if (inputNumbers.length >= 5) formatted += `-${inputNumbers.slice(5, 7)}`;
  if (inputNumbers.length >= 7) formatted += `-${inputNumbers.slice(7, 9)}`;
  return formatted;
};

const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export default function SettingsPage() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = SETTINGS_TRANSLATIONS[lang] || SETTINGS_TRANSLATIONS['en'];

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'security' | 'about'>('profile');
  const [formData, setFormData] = useState<any>({});
  const [originalUsername, setOriginalUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Security
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Username Logic
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'valid' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');

  const isGoogleUser = auth.currentUser?.providerData.some(p => p.providerId === 'google.com');

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setFormData({
          displayName: data.displayName || user.displayName || '',
          birthDate: data.birthDate || '',
          bio: data.bio || '',
          gender: data.gender || '',
          grade: data.grade || data.gradeLevel || '',
          region: data.location?.region || '',
          district: data.location?.district || '',
          institution: data.institution || data.institutionName || '',
          username: data.username || '',
          phone: data.phone || '',
        });
        setOriginalUsername(data.username || '');
      }
      setLoading(false);
    }
    loadData();
  }, [user]);

  // 🟢 LIVE USERNAME CHECKER
  useEffect(() => {
    const input = formData.username?.trim().toLowerCase() || '';
    if (!input) { setUsernameStatus('idle'); setUsernameError(''); return; }
    if (input.length < 5) { setUsernameStatus('invalid'); setUsernameError(t.status.minChar); return; }
    if (!USERNAME_REGEX.test(input)) { setUsernameStatus('invalid'); setUsernameError(t.status.regex); return; }
    if (input === originalUsername.toLowerCase()) { setUsernameStatus('valid'); setUsernameError(''); return; }

    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const isUnique = await checkUsernameUnique(input);
        if (isUnique) { setUsernameStatus('valid'); setUsernameError(''); }
        else { setUsernameStatus('taken'); setUsernameError(t.status.taken); }
      } catch (error) { setUsernameStatus('idle'); }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, originalUsername, t]);

  // 🟢 BIO CHARACTER LIMIT HANDLER (Max 100 characters)
  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= 100) {
      setFormData({ ...formData, bio: text });
    }
  };

  // 🟢 SAVE PROFILE & ACCOUNT DATA
  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const newUsername = formData.username?.trim().toLowerCase() || '';
      await updateProfile(user, { displayName: formData.displayName.trim() });

      const updates = {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender,
        grade: formData.grade,
        phone: formData.phone,
        institution: formData.institution.trim(),
        location: { country: "Uzbekistan", region: formData.region, district: formData.district }
      };

      if (newUsername !== originalUsername.toLowerCase() && newUsername) {
        const batch = writeBatch(db);
        if (originalUsername) batch.delete(doc(db, 'usernames', originalUsername.toLowerCase()));
        batch.set(doc(db, 'usernames', newUsername), { uid: user.uid });
        batch.update(doc(db, 'users', user.uid), { ...updates, username: newUsername });
        await batch.commit();
        setOriginalUsername(newUsername);
      } else {
        await updateDoc(doc(db, 'users', user.uid), updates);
      }
      toast.success(t.toasts.success);
    } catch (error) { toast.error(t.toasts.errDel); } finally { setIsSaving(false); }
  };

  // 🟢 UPDATE PASSWORD
  const handlePasswordUpdate = async () => {
    if (!user || newPass !== confirmPass || !currentPass) return;
    setIsSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPass);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPass);
      toast.success(t.toasts.passUpdate);
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (error) { toast.error(t.toasts.errPass); } finally { setIsSaving(false); }
  };

  // 🟢 DELETE ACCOUNT
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!isGoogleUser && !deletePassword) { toast.error(t.toasts.passReq); return; }

    setIsDeleting(true);
    const toastId = toast.loading(t.toasts.clean);
    try {
      if (isGoogleUser) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        const credential = EmailAuthProvider.credential(user.email!, deletePassword);
        await reauthenticateWithCredential(user, credential);
      }

      // Cleanup
      const queries = [
        getDocs(query(collection(db, 'attempts'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'notifications'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'classes'), where('studentIds', 'array-contains', user.uid)))
      ];
      const [attemptsSnap, notifSnap, classesSnap] = await Promise.all(queries);
      
      const deletions = attemptsSnap.docs.map(d => deleteDoc(d.ref)).concat(notifSnap.docs.map(d => deleteDoc(d.ref)));
      const classUpdates = classesSnap.docs.map(d => updateDoc(d.ref, { studentIds: arrayRemove(user.uid) }));
      await Promise.all([...deletions, ...classUpdates]);

      // Delete User Docs
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid));
      if (originalUsername) batch.delete(doc(db, 'usernames', originalUsername.toLowerCase()));
      await batch.commit();

      await deleteUser(user);
      toast.success(t.toasts.deleted, { id: toastId });
      window.location.href = '/auth/login';
    } catch (error) {
      toast.error(t.toasts.errDel, { id: toastId });
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="w-full min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-violet-500" size={32}/></div>;
  }

  return (
    <div className="w-full max-w-[800px] mx-auto px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-12">
      <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight mb-8">{t.title}</h1>

      {/* 🟢 CHUNKY PILL TABS (Mobile Optimized) */}
      <div className="flex gap-1.5 sm:gap-2 p-1.5 bg-zinc-200/50 rounded-[1.25rem] mb-6">
        {[
          { id: 'profile', icon: User, label: t.tabs.profile },
          { id: 'account', icon: SettingsIcon, label: t.tabs.account },
          { id: 'security', icon: Shield, label: t.tabs.security },
          { id: 'about', icon: Info, label: t.tabs.about }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            title={tab.label} // Tooltip for accessibility
            className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-3 px-2 sm:px-4 rounded-xl font-black text-[14px] transition-all duration-200 ${
              activeTab === tab.id 
                ? 'bg-white text-zinc-900 shadow-sm border-2 border-zinc-200/50' 
                : 'text-zinc-500 hover:bg-zinc-200/50 border-2 border-transparent'
            }`}
          >
            {/* Icon is slightly larger on mobile since text is hidden */}
            <tab.icon 
              size={20} 
              strokeWidth={activeTab === tab.id ? 3 : 2.5} 
              className={activeTab === tab.id ? 'text-violet-500' : ''} 
            />
            {/* Text is hidden on mobile, visible on sm and up */}
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 🟢 TAB CONTENT AREA */}
      <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 md:p-8 shadow-sm">
        
        {/* ===================================== PROFILE TAB ===================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">{t.labels.fullName}</label>
                <input type="text" value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} className="w-full px-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">{t.labels.birthDate}</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                  <input type="date" value={formData.birthDate} max={new Date().toISOString().split("T")[0]} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">{t.labels.gender}</label>
                <div className="relative">
                  <Smile className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                  <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors appearance-none">
                    <option value="">{t.labels.selectGender}</option>
                    <option value="male">{t.genders.male}</option>
                    <option value="female">{t.genders.female}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">{t.labels.grade}</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                  <select value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors appearance-none">
                    <option value="">{t.labels.selectGrade}</option>
                    {GRADES.map(g => (
                      <option key={g} value={g}>
                        {g.startsWith('school_') ? `${g.replace('school_', '')}${lang === 'uz' ? '-sinf' : lang === 'ru' ? ' класс' : 'th Grade'}` : `${g.replace('uni_', '')}${lang === 'uz' ? '-kurs' : lang === 'ru' ? ' курс' : 'st Year'}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bio Input with Character Counter */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 block">
                  {t.labels.bio}
                </label>
                <span className={`text-[10px] font-bold mr-2 ${formData.bio?.length === 100 ? 'text-rose-500' : 'text-zinc-400'}`}>
                  {formData.bio?.length || 0}/100
                </span>
              </div>
              <textarea 
                value={formData.bio} 
                onChange={handleBioChange} 
                maxLength={100}
                rows={3} 
                className="w-full px-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-bold text-[14px] text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors resize-none custom-scrollbar" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">{t.labels.region}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                  <select value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value, district: ''})} className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors appearance-none">
                    <option value="">{t.labels.selectRegion}</option>
                    {Object.keys(UZB_LOCATIONS).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">{t.labels.district}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                  <select value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} disabled={!formData.region} className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors disabled:opacity-50 appearance-none">
                    <option value="">{t.labels.selectDistrict}</option>
                    {formData.region && UZB_LOCATIONS[formData.region]?.map((d: string) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">{t.labels.school}</label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                <input type="text" value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors" />
              </div>
            </div>
          </div>
        )}

        {/* ===================================== ACCOUNT TAB ===================================== */}
        {activeTab === 'account' && (
          <div className="space-y-6 animate-in fade-in">
            
            {/* Username */}
            <div>
              <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">{t.labels.username}</label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={3} />
                <input 
                  type="text" value={formData.username} 
                  onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')})}
                  className={`w-full pl-11 pr-12 py-3.5 bg-zinc-50 border-2 rounded-2xl font-black text-zinc-900 focus:outline-none focus:bg-white transition-colors ${
                    usernameStatus === 'valid' ? 'border-emerald-500 focus:border-emerald-500 bg-emerald-50/30' :
                    (usernameStatus === 'taken' || usernameStatus === 'invalid') ? 'border-rose-500 focus:border-rose-500 bg-rose-50/30' :
                    'border-zinc-200 focus:border-violet-500'
                  }`} 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && <RefreshCw className="animate-spin text-zinc-400" size={18} strokeWidth={3}/>}
                  {usernameStatus === 'valid' && <CheckCircle className="text-emerald-500" size={18} strokeWidth={3}/>}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="text-rose-500" size={18} strokeWidth={3}/>}
                </div>
              </div>
              {usernameStatus === 'invalid' && <p className="text-[12px] font-bold text-rose-500 mt-1.5 ml-2">{usernameError}</p>}
              {usernameStatus === 'taken' && <p className="text-[12px] font-bold text-rose-500 mt-1.5 ml-2">{usernameError}</p>}
              {usernameStatus === 'valid' && formData.username !== originalUsername && <p className="text-[12px] font-bold text-emerald-600 mt-1.5 ml-2">{t.status.avail}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">{t.labels.phone}</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: formatPhoneNumber(e.target.value)})}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
            
            {/* Email (Disabled) */}
            <div>
              <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">{t.labels.email}</label>
              <div className="relative opacity-60">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                <input type="text" value={user?.email || ''} disabled className="w-full pl-11 pr-4 py-3.5 bg-zinc-100 border-2 border-zinc-200 rounded-2xl font-black text-zinc-500 cursor-not-allowed" />
              </div>
            </div>
          </div>
        )}

        {/* ===================================== SAVE BUTTON (For Profile & Account) ===================================== */}
        {(activeTab === 'profile' || activeTab === 'account') && (
          <div className="mt-8 pt-6 border-t-2 border-zinc-100">
            <button 
              onClick={handleSave} 
              disabled={isSaving || usernameStatus === 'checking' || usernameStatus === 'invalid' || usernameStatus === 'taken'}
              className="w-full md:w-auto px-8 py-3.5 bg-violet-500 text-white font-black text-[15px] rounded-2xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Check size={18} strokeWidth={3}/>} {isSaving ? t.buttons.saving : t.buttons.save}
            </button>
          </div>
        )}

        {/* ===================================== SECURITY TAB ===================================== */}
        {activeTab === 'security' && (
          <div className="space-y-8 animate-in fade-in">
            
            {/* Change Password Section */}
            {!isGoogleUser ? (
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex gap-3 text-orange-600 text-[14px] font-bold">
                  <AlertCircle size={20} strokeWidth={3} className="shrink-0" />
                  <p>{t.security.warn}</p>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                    <input type="password" placeholder={t.security.current} value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors"/>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                    <input type="password" placeholder={t.security.new} value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors"/>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={2.5}/>
                    <input type="password" placeholder={t.security.confirm} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors"/>
                  </div>
                  <button 
                    onClick={handlePasswordUpdate} 
                    disabled={!currentPass || !newPass || newPass !== confirmPass || isSaving}
                    className="w-full md:w-auto mt-2 px-8 py-3.5 bg-zinc-800 text-white font-black text-[15px] rounded-2xl border-b-4 border-zinc-950 active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-50"
                  >
                    {t.security.updateBtn}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex gap-3 text-emerald-600 text-[14px] font-bold">
                <CheckCircle size={20} strokeWidth={3} className="shrink-0" />
                <p>{t.security.googleWarn}</p>
              </div>
            )}

            {/* DANGER ZONE - DELETE ACCOUNT */}
            <div className="pt-8 border-t-2 border-zinc-100">
              <h3 className="text-rose-500 font-black text-[16px] mb-4 flex items-center gap-2 uppercase tracking-widest">
                <AlertTriangle size={18} strokeWidth={3}/> {t.security.danger}
              </h3>
              
              {!showDeleteConfirm ? (
                <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-2 border-rose-200 bg-rose-50 rounded-2xl gap-4">
                  <div className="text-[13px] font-bold text-rose-600/80 text-center sm:text-left">
                    <p className="font-black text-[16px] text-rose-600 mb-1">{t.security.deleteTitle}</p>
                    <p>{t.security.deleteDesc}</p>
                  </div>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full sm:w-auto px-6 py-3 bg-white text-rose-600 font-black text-[14px] rounded-xl border-2 border-rose-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all shrink-0"
                  >
                    {t.security.deleteBtn}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-5 border-2 border-rose-500 bg-rose-50 rounded-2xl animate-in fade-in zoom-in-95">
                  <p className="text-[16px] font-black text-rose-600">{t.security.sureTitle}</p>
                  <p className="text-[13px] font-bold text-rose-600/80">
                    {t.security.sureDesc}
                  </p>
                  
                  {!isGoogleUser && (
                    <input 
                      type="password" 
                      placeholder={t.security.passPlace}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full p-3.5 rounded-xl border-2 border-rose-300 bg-white font-black text-zinc-900 outline-none focus:border-rose-500"
                    />
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button 
                      onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                      className="flex-1 py-3.5 bg-white text-zinc-600 font-black rounded-xl border-2 border-zinc-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all"
                    >
                      {t.security.cancel}
                    </button>
                    <button 
                      onClick={handleDeleteAccount}
                      disabled={(!isGoogleUser && !deletePassword) || isDeleting}
                      className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl border-b-4 border-rose-700 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} strokeWidth={2.5}/>}
                      {t.security.yesDelete}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================== ABOUT TAB ===================================== */}
        {activeTab === 'about' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 🟢 PREMIUM HERO HEADER */}
            <div className="relative h-48 md:h-56 bg-zinc-900 rounded-[1.5rem] overflow-hidden shrink-0 flex items-center justify-center mb-8 border-4 border-zinc-950">
              <div className="absolute top-0 right-0 w-72 h-72 bg-violet-500 rounded-full mix-blend-screen filter blur-[64px] opacity-40 -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-[64px] opacity-40 translate-y-1/3 -translate-x-1/3"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center shadow-2xl shadow-violet-500/20 mb-4 rotate-3 hover:rotate-0 transition-transform">
                    <span className="text-3xl font-black bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">E</span>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">Edify<span className="text-violet-400">Student</span></h2>
                <p className="text-zinc-400 text-[10px] font-black mt-1.5 uppercase tracking-widest">{t.aboutContent.title}</p>
              </div>
            </div>

            <div className="mb-10 text-center max-w-2xl mx-auto">
                <h3 className="text-[18px] font-black text-zinc-900 tracking-tight mb-3">{t.aboutContent.descTitle}</h3>
                <p className="text-zinc-500 font-bold text-[14px] leading-relaxed">{t.aboutContent.desc}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* SUPPORT CONTACTS */}
                <div className="bg-zinc-50 border-2 border-zinc-200 rounded-3xl p-6">
                  <h3 className="text-[12px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span> {t.aboutContent.support}
                  </h3>
                  
                  <div className="space-y-3">
                    <a href="https://t.me/Umidjon0339" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl bg-white border-2 border-zinc-200 hover:border-blue-300 hover:shadow-sm active:translate-y-[2px] transition-all">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-blue-500 group-hover:bg-blue-600 transition-colors shrink-0">
                          <Send size={20} strokeWidth={2.5}/>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Telegram</p>
                          <p className="text-[15px] font-black text-zinc-900 group-hover:text-blue-600 transition-colors">@Umidjon0339</p>
                        </div>
                    </a>

                    <div className="group flex items-center gap-4 p-4 rounded-2xl bg-white border-2 border-zinc-200 hover:border-emerald-300 transition-all cursor-default">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-emerald-500 transition-colors shrink-0">
                          <Phone size={20} strokeWidth={2.5}/>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">{t.aboutContent.hotline}</p>
                          <p className="text-[15px] font-black text-zinc-900">+998 33 860 20 06</p>
                        </div>
                    </div>
                  </div>
                </div>

                {/* DEVELOPER LINKS */}
                <div className="bg-zinc-50 border-2 border-zinc-200 rounded-3xl p-6">
                  <h3 className="text-[12px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span> {t.aboutContent.dev}
                  </h3>

                  <div className="space-y-3">
                    <a href="https://github.com/Wasp-2-AI" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl bg-white border-2 border-zinc-200 hover:border-zinc-400 hover:shadow-sm active:translate-y-[2px] transition-all">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-zinc-900 group-hover:bg-black transition-colors shrink-0">
                          <Github size={20} strokeWidth={2.5}/>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">GitHub</p>
                          <p className="text-[15px] font-black text-zinc-900 group-hover:text-black transition-colors">Wasp-2-AI</p>
                        </div>
                    </a>

                    <a href="https://www.linkedin.com/company/wasp-2-ai" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl bg-white border-2 border-zinc-200 hover:border-[#0077b5] hover:shadow-sm active:translate-y-[2px] transition-all">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-[#0077b5] group-hover:bg-[#005e93] transition-colors shrink-0">
                          <Linkedin size={20} strokeWidth={2.5}/>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">LinkedIn</p>
                          <p className="text-[15px] font-black text-zinc-900 group-hover:text-[#0077b5] transition-colors">WASP-2 AI Solutions</p>
                        </div>
                    </a>
                  </div>
                </div>
            </div>

            <div className="mt-8 text-center pt-6 border-t-2 border-zinc-100">
                <p className="text-[13px] font-black text-zinc-500">{t.aboutContent.version}</p>
                <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">© 2026 WASP-2 AI Solutions. {t.aboutContent.rights}</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}