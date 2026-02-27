'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  updateProfile, 
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup 
} from 'firebase/auth';
import { useAuth } from '@/lib/AuthContext';
import { 
  User, MapPin, Briefcase, Phone, Calendar, Save, 
  Lock, Loader2, Trash2, CheckCircle, XCircle, Layout, BookOpen,
  Eye, EyeOff, AlertTriangle, AtSign, Shield, Info, Globe, Github, Linkedin, Send
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout'; // 🟢 Import Hook

// --- 1. TRANSLATION DICTIONARY ---
const SETTINGS_TRANSLATIONS = {
  uz: {
    title: "Hisob Sozlamalari",
    tabs: {
      profile: "Mening Profilim",
      security: "Xavfsizlik",
      about: "Dastur haqida"
    },
    profile: {
      title: "Shaxsiy Ma'lumotlar",
      subtitle: "Shaxsingiz va aloqa ma'lumotlarini boshqaring.",
      fullName: "To'liq Ism",
      username: "Foydalanuvchi nomi",
      usernameTaken: "Band qilingan",
      usernameAvail: "Mavjud!",
      bio: "Men haqimda",
      bioPlace: "O'quvchilaringizga o'zingiz haqingizda gapirib bering...",
      email: "Email",
      phone: "Telefon Raqami",
      phonePlace: "+998 (90) 123-45-67",
      institution: "Muassasa",
      dob: "Tug'ilgan Sana",
      year: "Yil",
      month: "Oy",
      day: "Kun",
      location: "Joylashuv",
      region: "Viloyatni tanlang",
      district: "Tumanni tanlang",
      save: "O'zgarishlarni Saqlash",
      saving: "Saqlanmoqda..."
    },
    security: {
      manageClasses: "Sinflarni Boshqarish",
      manageSub: "Faol sinflarni ko'ring yoki o'chiring.",
      noClasses: "Siz hali sinf yaratmagansiz.",
      students: "O'quvchi",
      passwordTitle: "Parol Xavfsizligi",
      passwordSub: "Kirish ma'lumotlarini yangilang.",
      currentPass: "Joriy Parol",
      currentPlace: "Tasdiqlash uchun joriy parolni kiriting",
      newPass: "Yangi Parol",
      newPlace: "Kamida 6 ta belgi",
      confirmPass: "Parolni Tasdiqlash",
      confirmPlace: "Yangi parolni qayta kiriting",
      updateBtn: "Parolni Yangilash",
      updating: "Yangilanmoqda...",
      dangerTitle: "Xavfli Hudud",
      dangerSub: "Qaytarib bo'lmaydigan amallar.",
      deleteAccount: "Hisobni O'chirish",
      deleteWarning: "Bu sizning barcha sinflaringiz, testlaringiz va profil ma'lumotlaringizni o'chirib yuboradi.",
      confirmDelete: "O'chirishni Tasdiqlash",
      googleConfirm: "O'chirishni tasdiqlash uchun Google hisobingiz bilan kiring.",
      passConfirm: "O'chirishni tasdiqlash uchun parolingizni kiriting.",
      cancel: "Bekor qilish",
      yesDelete: "Ha, Barchasini O'chirish"
    },
    about: {
      title: "Platforma Ma'lumotlari",
      descTitle: "AI bilan Ta'limni Kuchaytirish",
      desc: "Edify o'qituvchilarga o'quv materiallarini yaratish, boshqarish va tarqatishda yordam beradigan yangi avlod vositasidir.",
      support: "Yordam va Aloqa",
      hotline: "Qaynoq liniya",
      dev: "Ishlab chiquvchi",
      version: "EdifyTeacher v1.0.0",
      rights: "Barcha huquqlar himoyalangan."
    },
    toasts: {
      saved: "Profil saqlandi!",
      failSave: "Saqlashda xatolik",
      passChanged: "Parol o'zgartirildi!",
      wrongPass: "Joriy parol noto'g'ri",
      classDeleted: "Sinf o'chirildi",
      deleted: "Hisob o'chirildi",
      reqPass: "Parol talab qilinadi"
    },
    deleteModal: {
      title: "Sinfni O'chirish?",
      desc: "Haqiqatan ham \"{title}\"ni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi."
    }
  },
  en: {
    title: "Account Settings",
    tabs: {
      profile: "My Profile",
      security: "Security",
      about: "About & Support"
    },
    profile: {
      title: "Personal Information",
      subtitle: "Manage your identity and contact details.",
      fullName: "Full Name",
      username: "Username",
      usernameTaken: "Username is taken",
      usernameAvail: "Username is available!",
      bio: "Bio / About Me",
      bioPlace: "Tell your students a bit about yourself...",
      email: "Email",
      phone: "Phone Number",
      phonePlace: "+998 (90) 123-45-67",
      institution: "Institution",
      dob: "Date of Birth",
      year: "Year",
      month: "Month",
      day: "Day",
      location: "Location",
      region: "Select Region",
      district: "Select District",
      save: "Save Changes",
      saving: "Saving..."
    },
    security: {
      manageClasses: "Manage Classes",
      manageSub: "Review active classes or delete them individually.",
      noClasses: "You haven't created any classes yet.",
      students: "Students",
      passwordTitle: "Password Security",
      passwordSub: "Update your login credentials.",
      currentPass: "Current Password",
      currentPlace: "Enter current password to verify",
      newPass: "New Password",
      newPlace: "Min 6 characters",
      confirmPass: "Confirm New Password",
      confirmPlace: "Retype new password",
      updateBtn: "Update Password",
      updating: "Updating...",
      dangerTitle: "Danger Zone",
      dangerSub: "Irreversible actions.",
      deleteAccount: "Delete Teacher Account",
      deleteWarning: "This will delete all your Classes, Tests, and profile data.",
      confirmDelete: "Final Confirmation",
      googleConfirm: "Please confirm with your Google account to delete.",
      passConfirm: "Please type your password to confirm deletion.",
      cancel: "Cancel",
      yesDelete: "Yes, Delete Everything"
    },
    about: {
      title: "Platform Information",
      descTitle: "Empowering Education with AI",
      desc: "Edify is a next-generation educational tool designed to help teachers create, manage, and distribute learning materials seamlessly.",
      support: "Support & Contact",
      hotline: "Support Hotline",
      dev: "Developed By",
      version: "EdifyTeacher v1.0.0",
      rights: "All rights reserved."
    },
    toasts: {
      saved: "Profile saved successfully!",
      failSave: "Failed to save profile.",
      passChanged: "Password changed!",
      wrongPass: "Incorrect current password",
      classDeleted: "Class deleted",
      deleted: "Account deleted.",
      reqPass: "Password required"
    },
    deleteModal: {
      title: "Delete Class?",
      desc: "Are you sure you want to delete \"{title}\"? This action cannot be undone."
    }
  },
  ru: {
    title: "Настройки Аккаунта",
    tabs: {
      profile: "Мой Профиль",
      security: "Безопасность",
      about: "О Программе"
    },
    profile: {
      title: "Личная Информация",
      subtitle: "Управление личными данными и контактами.",
      fullName: "Полное Имя",
      username: "Имя пользователя",
      usernameTaken: "Имя занято",
      usernameAvail: "Имя доступно!",
      bio: "Обо мне",
      bioPlace: "Расскажите ученикам немного о себе...",
      email: "Email",
      phone: "Номер телефона",
      phonePlace: "+998 (90) 123-45-67",
      institution: "Учреждение",
      dob: "Дата Рождения",
      year: "Год",
      month: "Месяц",
      day: "День",
      location: "Местоположение",
      region: "Выберите регион",
      district: "Выберите район",
      save: "Сохранить Изменения",
      saving: "Сохранение..."
    },
    security: {
      manageClasses: "Управление Классами",
      manageSub: "Просмотр и удаление активных классов.",
      noClasses: "Вы еще не создали ни одного класса.",
      students: "Учеников",
      passwordTitle: "Безопасность Пароля",
      passwordSub: "Обновите данные для входа.",
      currentPass: "Текущий Пароль",
      currentPlace: "Введите текущий пароль",
      newPass: "Новый Пароль",
      newPlace: "Мин. 6 символов",
      confirmPass: "Подтвердите Пароль",
      confirmPlace: "Повторите новый пароль",
      updateBtn: "Обновить Пароль",
      updating: "Обновление...",
      dangerTitle: "Опасная Зона",
      dangerSub: "Необратимые действия.",
      deleteAccount: "Удалить Аккаунт",
      deleteWarning: "Это удалит все ваши Классы, Тесты и данные профиля.",
      confirmDelete: "Подтверждение Удаления",
      googleConfirm: "Подтвердите через Google для удаления.",
      passConfirm: "Введите пароль для подтверждения удаления.",
      cancel: "Отмена",
      yesDelete: "Да, Удалить Всё"
    },
    about: {
      title: "Информация о Платформе",
      descTitle: "Образование с ИИ",
      desc: "Edify — это инструмент нового поколения, помогающий учителям создавать и распространять учебные материалы.",
      support: "Поддержка и Контакты",
      hotline: "Горячая линия",
      dev: "Разработано",
      version: "EdifyTeacher v1.0.0",
      rights: "Все права защищены."
    },
    toasts: {
      saved: "Профиль сохранен!",
      failSave: "Ошибка сохранения",
      passChanged: "Пароль изменен!",
      wrongPass: "Неверный текущий пароль",
      classDeleted: "Класс удален",
      deleted: "Аккаунт удален.",
      reqPass: "Требуется пароль"
    },
    deleteModal: {
      title: "Удалить Класс?",
      desc: "Вы уверены, что хотите удалить \"{title}\"? Это действие нельзя отменить."
    }
  }
};

// --- CONSTANTS ---
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
  
  // 🟢 Use Language Hook
  const { lang } = useTeacherLanguage();
  const t = SETTINGS_TRANSLATIONS[lang];
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'about'>('profile');

  // --- EXISTING LOGIC STATE ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classList, setClassList] = useState<any[]>([]);
  const [classToDelete, setClassToDelete] = useState<{ id: string, title: string } | null>(null);

  // Profile Form
  const [formData, setFormData] = useState({
    displayName: '',
    username: '', 
    originalUsername: '',
    email: '',
    phone: '',
    birthDate: '',
    institution: '',
    bio: '', 
    location: { country: 'Uzbekistan', region: '', district: '' }
  });

  // Username Logic
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'valid' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');

  // Password Form
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

  const isGoogleUser = user?.providerData.some((p) => p.providerId === 'google.com');

  // --- 1. FETCH DATA ---
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            displayName: data.displayName || '',
            username: data.username || '',
            originalUsername: data.username || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            birthDate: data.birthDate || '',
            institution: data.institution || '',
            bio: data.bio || '',
            location: {
              country: data.location?.country || 'Uzbekistan',
              region: data.location?.region || '',
              district: data.location?.district || ''
            }
          });
        }

        const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
        const classSnap = await getDocs(q);
        setClassList(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (e) {
        console.error(e);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // --- LOGIC FUNCTIONS ---
  
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!isGoogleUser && !deletePassword) return toast.error(t.toasts.reqPass);

    setIsDeleting(true);
    const toastId = toast.loading("Processing deletion...");

    try {
      if (isGoogleUser) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else {
        const credential = EmailAuthProvider.credential(user.email!, deletePassword);
        await reauthenticateWithCredential(user, credential);
      }

      const classesQ = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
      const classesSnap = await getDocs(classesQ);
      const deleteClasses = classesSnap.docs.map(d => deleteDoc(d.ref));

      const testsQ = query(collection(db, 'custom_tests'), where('teacherId', '==', user.uid));
      const testsSnap = await getDocs(testsQ);
      const deleteTests = testsSnap.docs.map(d => deleteDoc(d.ref));

      await Promise.all([...deleteClasses, ...deleteTests]);

      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid));
      
      if (formData.originalUsername) {
        batch.delete(doc(db, 'usernames', formData.originalUsername));
      }

      await batch.commit();
      await deleteUser(user);

      toast.success(t.toasts.deleted, { id: toastId });
      router.push('/auth/login');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/wrong-password') {
        toast.error(t.toasts.wrongPass, { id: toastId });
      } else {
        toast.error("Deletion failed.", { id: toastId });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const input = formData.username.trim().toLowerCase();
    const original = formData.originalUsername?.toLowerCase();

    if (!input) { setUsernameStatus('idle'); return; }

    if (input.length < 5) { setUsernameStatus('invalid'); setUsernameError('Minimum 5 characters'); return; }
    if (!USERNAME_REGEX.test(input)) { setUsernameStatus('invalid'); setUsernameError('Must start with a letter, use a-z, 0-9, _'); return; }
    if (input === original) { setUsernameStatus('valid'); setUsernameError(''); return; }

    const checkDb = async () => {
      setUsernameStatus('checking');
      try {
        const ref = doc(db, 'usernames', input);
        const snap = await getDoc(ref);
        if (snap.exists()) { setUsernameStatus('taken'); setUsernameError('Username is taken'); } 
        else { setUsernameStatus('valid'); setUsernameError(''); }
      } catch (e) { setUsernameStatus('idle'); }
    };

    const timer = setTimeout(checkDb, 500); 
    return () => clearTimeout(timer);
  }, [formData.username, formData.originalUsername]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!formData.displayName.trim()) return toast.error("Full Name is required.");
    if (usernameStatus !== 'valid') return toast.error("Please enter a valid username.");
    if (!formData.institution.trim()) return toast.error("Institution is required.");
    if (!formData.location.region) return toast.error("Please select a Region.");

    setSaving(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);

      batch.update(userRef, {
        displayName: formData.displayName,
        username: formData.username.toLowerCase(),
        phone: formData.phone,
        birthDate: formData.birthDate,
        institution: formData.institution,
        bio: formData.bio,
        location: formData.location
      });

      if (formData.username.toLowerCase() !== formData.originalUsername.toLowerCase()) {
        if (formData.originalUsername) {
            batch.delete(doc(db, 'usernames', formData.originalUsername.toLowerCase()));
        }
        batch.set(doc(db, 'usernames', formData.username.toLowerCase()), { uid: user.uid });
      }

      await batch.commit();
      await updateProfile(user, { displayName: formData.displayName });

      setFormData(prev => ({ ...prev, originalUsername: prev.username }));
      toast.success(t.toasts.saved);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      toast.error(t.toasts.failSave);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    if (!passwords.current) return toast.error("Enter current password");
    if (passwords.new !== passwords.confirm) return toast.error("New passwords do not match");
    if (passwords.new.length < 6) return toast.error("Password too short");

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwords.new);
      toast.success(t.toasts.passChanged);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast.error(error.code === 'auth/invalid-credential' ? t.toasts.wrongPass : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      await deleteDoc(doc(db, 'classes', classToDelete.id));
      setClassList(prev => prev.filter(c => c.id !== classToDelete.id));
      toast.success(t.toasts.classDeleted);
      setClassToDelete(null);
    } catch (error) {
      toast.error("Failed to delete class");
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '+998 ';
    
    let formatted = '+998 ';
    const inputNumbers = numbers.startsWith('998') ? numbers.slice(3) : numbers;
  
    if (inputNumbers.length > 0) {
      formatted += `(${inputNumbers.slice(0, 2)}`;
    }
    if (inputNumbers.length >= 2) {
      formatted += `) ${inputNumbers.slice(2, 5)}`;
    }
    if (inputNumbers.length >= 5) {
      formatted += `-${inputNumbers.slice(5, 7)}`;
    }
    if (inputNumbers.length >= 7) {
      formatted += `-${inputNumbers.slice(7, 9)}`;
    }
    
    return formatted;
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-indigo-500"><Loader2 className="animate-spin" size={32}/></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-black text-slate-900">{t.title}</h1>
        
        {/* --- TABS --- */}
        <div className="flex p-1.5 bg-slate-200/60 rounded-2xl overflow-x-auto hide-scrollbar border border-slate-200">
          {[
            { id: 'profile', label: t.tabs.profile, icon: User, activeClass: 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' },
            { id: 'security', label: t.tabs.security, icon: Shield, activeClass: 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5' },
            { id: 'about', label: t.tabs.about, icon: Info, activeClass: 'bg-white text-slate-700 shadow-sm ring-1 ring-black/5' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center
                ${activeTab === tab.id ? tab.activeClass : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
              `}
            >
              <tab.icon size={18} strokeWidth={2.5} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ======================= TAB 1: PROFILE ======================= */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300 border-t-4 border-t-indigo-500">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <User size={20} className="text-indigo-600"/> {t.profile.title}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t.profile.subtitle}</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Display Name */}
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.profile.fullName}</label>
                <input type="text" value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none"/>
              </div>

              {/* Username */}
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.profile.username}</label>
                <div className="relative group">
                  <AtSign className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                  <input 
                    type="text" 
                    value={formData.username} 
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().trim()})} 
                    className={`w-full pl-10 pr-10 py-3 border rounded-xl font-bold text-sm outline-none transition-all ${
                      usernameStatus === 'valid' ? 'border-green-500 bg-green-50 text-green-700' : 
                      usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-500 bg-red-50 text-red-700' : 
                      'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  <div className="absolute right-3 top-3.5">
                    {usernameStatus === 'checking' && <Loader2 className="animate-spin text-slate-400" size={16}/>}
                    {usernameStatus === 'valid' && <CheckCircle className="text-green-500" size={16}/>}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="text-red-500" size={16}/>}
                  </div>
                </div>
                {usernameStatus === 'invalid' && <p className="text-[10px] text-red-500 mt-1 font-bold ml-1">{usernameError}</p>}
                {usernameStatus === 'taken' && <p className="text-[10px] text-red-500 mt-1 font-bold ml-1">{t.profile.usernameTaken}</p>}
                {usernameStatus === 'valid' && formData.username !== formData.originalUsername && <p className="text-[10px] text-green-600 mt-1 font-bold ml-1">{t.profile.usernameAvail}</p>}
              </div>

              {/* Bio */}
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.profile.bio}</label>
                  <span className={`text-[10px] font-bold ${formData.bio.length >= 100 ? 'text-red-500' : 'text-slate-400'}`}>
                    {formData.bio.length}/100
                  </span>
                </div>
                <textarea 
                  rows={3} 
                  maxLength={100} 
                  value={formData.bio} 
                  onChange={(e) => setFormData({...formData, bio: e.target.value})} 
                  placeholder={t.profile.bioPlace}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.profile.email}</label>
                <div className="p-3 bg-slate-50 rounded-xl text-slate-500 font-mono text-sm border border-slate-200 cursor-not-allowed">{formData.email}</div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.profile.phone}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input 
                    type="tel" 
                    value={formData.phone} 
                    maxLength={19} 
                    onChange={(e) => setFormData({
                      ...formData, 
                      phone: formatPhoneNumber(e.target.value)
                    })} 
                    placeholder={t.profile.phonePlace}
                    className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Institution */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.profile.institution}</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input type="text" value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-500 outline-none"/>
                </div>
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.profile.dob}</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="relative">
                    <select
                      value={formData.birthDate ? formData.birthDate.split('-')[0] : ''}
                      onChange={(e) => {
                        const newYear = e.target.value;
                        const [_, m, d] = (formData.birthDate || `0000-01-01`).split('-');
                        setFormData({ ...formData, birthDate: `${newYear}-${m || '01'}-${d || '01'}` });
                      }}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none appearance-none bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <option value="" disabled>{t.profile.year}</option>
                      {Array.from({ length: 100 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>
                  <div className="relative">
                    <select
                      value={formData.birthDate ? formData.birthDate.split('-')[1] : ''}
                      disabled={!formData.birthDate?.split('-')[0]} 
                      onChange={(e) => {
                        const [y, _, d] = formData.birthDate.split('-');
                        setFormData({ ...formData, birthDate: `${y}-${e.target.value}-${d}` });
                      }}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none appearance-none bg-white cursor-pointer hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>{t.profile.month}</option>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => {
                        const currentYear = new Date().getFullYear();
                        const selectedYear = parseInt(formData.birthDate?.split('-')[0] || '0');
                        const currentMonth = new Date().getMonth() + 1;
                        const monthNum = i + 1;
                        const val = monthNum.toString().padStart(2, '0');
                        if (selectedYear === currentYear && monthNum > currentMonth) return null;
                        return <option key={val} value={val}>{month}</option>;
                      })}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                  </div>
                  <div className="relative">
                    <select
                      value={formData.birthDate ? formData.birthDate.split('-')[2] : ''}
                      disabled={!formData.birthDate?.split('-')[1]} 
                      onChange={(e) => {
                        const [y, m, _] = formData.birthDate.split('-');
                        setFormData({ ...formData, birthDate: `${y}-${m}-${e.target.value}` });
                      }}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none appearance-none bg-white cursor-pointer hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>{t.profile.day}</option>
                      {(() => {
                        const [y, m] = (formData.birthDate || '').split('-');
                        if (!y || !m) return null;
                        const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
                        const currentYear = new Date().getFullYear();
                        const currentMonth = new Date().getMonth() + 1;
                        const currentDay = new Date().getDate();
                        const selYear = parseInt(y);
                        const selMonth = parseInt(m);
                        return Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const dayStr = day.toString().padStart(2, '0');
                          if (selYear === currentYear && selMonth === currentMonth && day > currentDay) return null;
                          return <option key={dayStr} value={dayStr}>{day}</option>;
                        });
                      })()}
                    </select>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                <label className="block text-xs font-bold text-indigo-600 uppercase mb-3 flex items-center gap-2"><MapPin size={14}/> {t.profile.location}</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <select 
                      value={formData.location.region} 
                      onChange={(e) => setFormData({...formData, location: { ...formData.location, region: e.target.value, district: '' }})} 
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none appearance-none bg-white font-medium"
                    >
                      <option value="">{t.profile.region}</option>
                      {Object.keys(UZB_LOCATIONS).map((region) => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                  </div>

                  <div className="relative">
                    <select 
                      value={formData.location.district} 
                      onChange={(e) => setFormData({...formData, location: { ...formData.location, district: e.target.value }})} 
                      disabled={!formData.location.region}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none appearance-none bg-white font-medium disabled:opacity-50 disabled:bg-slate-50"
                    >
                      <option value="">{t.profile.district}</option>
                      {formData.location.region && UZB_LOCATIONS[formData.location.region]?.map((district) => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button 
                onClick={handleSaveProfile} 
                disabled={saving || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'} 
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} {t.profile.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 2: SECURITY & DATA ======================= */}
      {activeTab === 'security' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* 1. CLASS MANAGEMENT */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm border-t-4 border-t-blue-500">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layout size={20} className="text-blue-600"/> {t.security.manageClasses}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{t.security.manageSub}</p>
            </div>

            <div className="p-6">
                {classList.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">{t.security.noClasses}</div>
                ) : (
                    <div className="space-y-3">
                        {classList.map((cls) => (
                            <div key={cls.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                                        <BookOpen size={18}/>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm">{cls.title}</h3>
                                        <p className="text-xs text-slate-500">{cls.studentIds?.length || 0} {t.security.students}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setClassToDelete({ id: cls.id, title: cls.title })} 
                                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>

          {/* 2. PASSWORD SECURITY */}
          {!isGoogleUser && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm border-t-4 border-t-orange-500">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Lock size={20} className="text-orange-500"/> {t.security.passwordTitle}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{t.security.passwordSub}</p>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.security.currentPass}</label>
                    <div className="relative">
                      <input 
                        type={showPass.current ? "text" : "password"} 
                        value={passwords.current}
                        onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                        className="w-full p-3 pr-10 border border-slate-200 rounded-xl text-sm focus:border-orange-500 outline-none"
                        placeholder={t.security.currentPlace}
                      />
                      <button onClick={() => setShowPass({...showPass, current: !showPass.current})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass.current ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.security.newPass}</label>
                    <div className="relative">
                      <input 
                        type={showPass.new ? "text" : "password"} 
                        value={passwords.new}
                        onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                        className="w-full p-3 pr-10 border border-slate-200 rounded-xl text-sm focus:border-orange-500 outline-none"
                        placeholder={t.security.newPlace}
                      />
                      <button onClick={() => setShowPass({...showPass, new: !showPass.new})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass.new ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.security.confirmPass}</label>
                    <div className="relative">
                      <input 
                        type={showPass.confirm ? "text" : "password"} 
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                        className={`w-full p-3 pr-10 border rounded-xl text-sm outline-none ${
                          passwords.confirm && passwords.new !== passwords.confirm 
                            ? 'border-red-300 bg-red-50 focus:border-red-500' 
                            : 'border-slate-200 focus:border-orange-500'
                        }`}
                        placeholder={t.security.confirmPlace}
                      />
                      <button onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass.confirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2 pt-2">
                    <button 
                      onClick={handleChangePassword}
                      disabled={saving || !passwords.current || !passwords.new || (passwords.new !== passwords.confirm)}
                      className="w-full p-3 bg-orange-50 text-orange-600 font-bold rounded-xl hover:bg-orange-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? t.security.updating : t.security.updateBtn}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. DANGER ZONE */}
          <div className="bg-red-50/50 border border-red-100 rounded-2xl overflow-hidden shadow-sm border-t-4 border-t-red-500">
            <div className="p-6 border-b border-red-100 bg-red-50">
              <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600"/> {t.security.dangerTitle}
              </h2>
              <p className="text-sm text-red-500 mt-1">{t.security.dangerSub}</p>
            </div>

            <div className="p-8">
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-700">{t.security.deleteAccount}</h3>
                    <p className="text-sm text-slate-500">
                      {t.security.deleteWarning}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-2.5 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
                  >
                    {t.security.deleteAccount}
                  </button>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border-2 border-red-100 animate-in zoom-in-95">
                  <h3 className="text-lg font-black text-slate-800 mb-2">{t.security.confirmDelete}</h3>
                  
                  {isGoogleUser ? (
                    <p className="text-sm text-slate-500 mb-4">{t.security.googleConfirm}</p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500 mb-4">{t.security.passConfirm}</p>
                      <input 
                        type="password" 
                        placeholder={t.security.currentPlace}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-500 mb-4"
                      />
                    </>
                  )}

                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                    >
                      {t.security.cancel}
                    </button>
                    <button 
                      onClick={handleDeleteAccount}
                      disabled={(!isGoogleUser && !deletePassword) || isDeleting}
                      className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18}/>} 
                      {t.security.yesDelete}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 3: ABOUT ======================= */}
      {activeTab === 'about' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300 border-t-4 border-t-slate-900">
            <div className="relative h-48 bg-slate-900 overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-3">
                    <span className="text-3xl font-black text-indigo-600">E</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Edify<span className="text-indigo-400">Teacher</span></h2>
                <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">{t.about.title}</p>
              </div>
            </div>

            <div className="p-8">
              <div className="mb-10 text-center max-w-2xl mx-auto">
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{t.about.descTitle}</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">
                    {t.about.desc}
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <span className="w-1 h-4 bg-indigo-500 rounded-full"></span> {t.about.support}
                    </h3>
                    
                    <a href="https://t.me/Umidjon0339" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-200 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br from-blue-400 to-blue-600 group-hover:scale-110 transition-transform duration-300">
                          <Send size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telegram</p>
                          <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">@Umidjon0339</p>
                        </div>
                    </a>

                    <div className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-green-500/10 hover:border-green-200 transition-all duration-300 cursor-default">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br from-green-400 to-green-600 group-hover:scale-110 transition-transform duration-300">
                          <Phone size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.about.hotline}</p>
                          <p className="text-sm font-bold text-slate-800 group-hover:text-green-600 transition-colors">+998 33 860 20 06</p>
                        </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-500 rounded-full"></span> {t.about.dev}
                    </h3>

                    <a href="https://github.com/Wasp-2-AI" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-500/10 hover:border-slate-300 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br from-slate-700 to-slate-900 group-hover:scale-110 transition-transform duration-300">
                          <Github size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GitHub Organization</p>
                          <p className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">github.com/Wasp-2-AI</p>
                        </div>
                    </a>

                    <a href="https://www.linkedin.com/company/wasp-2-ai" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-blue-700/10 hover:border-blue-300 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br from-[#0077b5] to-[#005582] group-hover:scale-110 transition-transform duration-300">
                          <Linkedin size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LinkedIn</p>
                          <p className="text-sm font-bold text-slate-800 group-hover:text-[#0077b5] transition-colors">WASP-2 AI Solutions</p>
                        </div>
                    </a>
                  </div>
              </div>

              <div className="mt-8 text-center pt-6 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">{t.about.version}</p>
                  <p className="text-[10px] text-slate-300 mt-1">© 2026 WASP-2 AI Solutions. {t.about.rights}</p>
              </div>
            </div>
        </div>
      )}

      {/* DELETE CLASS MODAL */}
      {classToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setClassToDelete(null)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
             <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
               <AlertTriangle size={24} />
             </div>
             <h3 className="text-lg font-black text-slate-800 text-center mb-2">{t.deleteModal.title}</h3>
             <p className="text-sm text-slate-500 text-center mb-6">
               {t.deleteModal.desc.replace("{title}", classToDelete.title)}
             </p>
             <div className="flex gap-3">
               <button onClick={() => setClassToDelete(null)} className="flex-1 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t.security.cancel}</button>
               <button onClick={confirmDeleteClass} className="flex-1 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-all">{t.security.yesDelete}</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}