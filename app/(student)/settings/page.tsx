'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import {
  updateProfile, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, GoogleAuthProvider, reauthenticateWithPopup
} from 'firebase/auth';
import { checkUsernameUnique } from '@/services/userService';
import { useStudentLanguage } from '../layout';
import { getOwnContact, setOwnContact } from '@/lib/directory';
import {
  Page, PageHeader, Tabs, Card,
  TextField, TextArea, Select, Button, Banner, Dialog,
  LoadingState, sToast,
} from '@/components/student-ui';

// Icons
import {
  User, Shield, Settings as SettingsIcon, AtSign, Phone, Mail,
  Calendar, Building, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Key, Trash2, Check, AlertCircle, Info, Send, Github, Linkedin, Instagram, ArrowUpRight
} from 'lucide-react';

// --- 1. TRANSLATION DICTIONARY ---
const SETTINGS_TRANSLATIONS: any = {
  uz: {
    title: "Sozlamalar",
    tabs: { profile: "Profil", account: "Hisob", security: "Xavfsizlik",about: "Ilova" },
    labels: { fullName: "To'liq Ism", birthDate: "Tug'ilgan Sana", bio: "O'zim haqimda", region: "Viloyat", district: "Tuman", selectRegion: "Viloyatni tanlang", selectDistrict: "Tumanni tanlang", school: "Muassasa nomi", grade: "Sinf/Kurs", selectGrade: "Sinfni tanlang", gender: "Jinsi", selectGender: "Jinsni tanlang", username: "Foydalanuvchi nomi", phone: "Telefon raqami", email: "Email" },
    genders: { male: "Erkak (Male)", female: "Ayol (Female)" },
    status: { minChar: "Kamida 5 ta belgi", regex: "Harf bilan boshlang", taken: "Bu nom band", avail: "Bu nom bo'sh!" },
    security: { warn: "Parolni o'zgartirish qayta kirishni talab qiladi.", googleWarn: "Siz Google orqali kirdingiz. Parol kerak emas.", centerWarn: "Hisobingiz o'quv markazi tomonidan boshqariladi. Parolni faqat markaz menejeri o'zgartira oladi.", current: "Joriy Parol", new: "Yangi Parol", confirm: "Tasdiqlash", updateBtn: "Parolni Yangilash", danger: "Xavfli Hudud", deleteTitle: "Hisobni O'chirish", deleteDesc: "Hisob o'chirilgach, uni qayta tiklab bo'lmaydi.", deleteBtn: "O'chirish", sureTitle: "Ishonchingiz komilmi?", sureDesc: "Bu amal barcha yutuqlar va ma'lumotlarni butunlay o'chiradi.", passPlace: "Tasdiqlash uchun parolni kiriting", cancel: "Bekor qilish", yesDelete: "Ha, O'chirish" },
    buttons: { save: "Saqlash", saving: "Saqlanmoqda..." },
    toasts: { success: "Sozlamalar yangilandi!", errPass: "Parol noto'g'ri", errDel: "O'chirishda xatolik", passUpdate: "Parol yangilandi!", passReq: "Parolni kiriting", clean: "Tozalanmoqda...", deleted: "Hisob o'chirildi." },
    aboutContent: {
      title: "O'quvchi Portali",
      descTitle: "Biz haqimizda",
      desc: "EdifyStudent - bu o'quvchilar uchun interaktiv ta'lim platformasi. OTMga kirish uchun va Milliy sertifikatga tayyorlarish uchun yaratilgan ilova. XP yig'ing, seriyani saqlang va bilimlaringizni sinab ko'ring!",
      support: "Yordam va Aloqa",
      hotline: "Ishonch telefoni",
      call: "Qo'ng'iroq",
      follow: "Bizni kuzating",
      channel: "Telegram kanal",
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
    security: { warn: "Changing password requires re-login.", googleWarn: "Logged in via Google. No password needed.", centerWarn: "Your account is managed by your learning center. Only the center's manager can change the password.", current: "Current Password", new: "New Password", confirm: "Confirm Password", updateBtn: "Update Password", danger: "Danger Zone", deleteTitle: "Delete Account", deleteDesc: "Once deleted, it cannot be recovered.", deleteBtn: "Delete", sureTitle: "Are you sure?", sureDesc: "This will permanently delete all your progress and data.", passPlace: "Enter password to confirm", cancel: "Cancel", yesDelete: "Yes, Delete" },
    buttons: { save: "Save Changes", saving: "Saving..." },
    toasts: { success: "Settings updated!", errPass: "Incorrect password", errDel: "Failed to delete", passUpdate: "Password updated!", passReq: "Enter password", clean: "Cleaning up...", deleted: "Account deleted." },
    aboutContent: {
      title: "Student Portal",
      descTitle: "About Us",
      desc: "EdifyStudent is an interactive learning platform for students. Earn XP, keep your streak alive, and test your knowledge!",
      support: "Support & Contact",
      hotline: "Hotline",
      call: "Call",
      follow: "Follow Edify",
      channel: "Telegram channel",
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
    security: { warn: "Смена пароля требует повторного входа.", googleWarn: "Вход через Google. Пароль не нужен.", centerWarn: "Ваш аккаунт управляется учебным центром. Пароль может изменить только менеджер центра.", current: "Текущий пароль", new: "Новый пароль", confirm: "Подтверждение", updateBtn: "Обновить пароль", danger: "Опасная Зона", deleteTitle: "Удалить Аккаунт", deleteDesc: "Удаление необратимо.", deleteBtn: "Удалить", sureTitle: "Вы уверены?", sureDesc: "Это навсегда удалит весь ваш прогресс и данные.", passPlace: "Введите пароль", cancel: "Отмена", yesDelete: "Да, Удалить" },
    buttons: { save: "Сохранить", saving: "Сохранение..." },
    toasts: { success: "Настройки обновлены!", errPass: "Неверный пароль", errDel: "Ошибка удаления", passUpdate: "Пароль обновлен!", passReq: "Введите пароль", clean: "Очистка...", deleted: "Аккаунт удален." },
    aboutContent: {
      title: "Портал Ученика",
      descTitle: "О нас",
      desc: "EdifyStudent — это интерактивная образовательная платформа. Зарабатывайте XP, держите серию и проверяйте свои знания!",
      support: "Поддержка и Контакты",
      hotline: "Горячая линия",
      call: "Позвонить",
      follow: "Подписывайтесь",
      channel: "Telegram-канал",
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
  // Manager-created accounts: the manager's stored recovery credential
  // (center_student_credentials) is the ONLY reset path for the synthetic
  // no-inbox email, so self-service password change must stay off for them
  // (docs/AUTH.md / MANAGER.md).
  const [isCenterManaged, setIsCenterManaged] = useState(false);

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
          // Contact details come from the owner-only subcollection (docs/AUTH.md).
          phone: (await getOwnContact()).phone,
        });
        setOriginalUsername(data.username || '');
        setIsCenterManaged(data.accountType === 'center-managed');
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

      // `phone` is NOT in here on purpose — contact details go to the owner-only
      // users/{uid}/private/contact subcollection (docs/AUTH.md). Writing it onto
      // this world-readable doc would re-open the leak on every profile save.
      const updates = {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender,
        grade: formData.grade,
        institution: formData.institution.trim(),
        location: { country: "Uzbekistan", region: formData.region, district: formData.district }
      };
      await setOwnContact({ phone: formData.phone });

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
      sToast.success(t.toasts.success);
    } catch (error) { sToast.error(t.toasts.errDel); } finally { setIsSaving(false); }
  };

  // 🟢 UPDATE PASSWORD
  const handlePasswordUpdate = async () => {
    if (isCenterManaged) { sToast.error(t.security.centerWarn); return; }
    if (!user || newPass !== confirmPass || !currentPass) return;
    setIsSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPass);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPass);
      sToast.success(t.toasts.passUpdate);
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (error) { sToast.error(t.toasts.errPass); } finally { setIsSaving(false); }
  };

  // 🟢 DELETE ACCOUNT
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!isGoogleUser && !deletePassword) { sToast.error(t.toasts.passReq); return; }

    setIsDeleting(true);
    const toastId = sToast.loading(t.toasts.clean);
    try {
      if (isGoogleUser) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        const credential = EmailAuthProvider.credential(user.email!, deletePassword);
        await reauthenticateWithCredential(user, credential);
      }

      // Server-side deletion (Admin SDK): the old client-side cleanup could not
      // delete the user's own `attempts` (teacher-only rule) so it ABORTED for
      // any student who had ever taken a test — and it orphaned social edges,
      // leaderboard rows, join requests, RASCH docs and center links. The API
      // removes everything (and the Auth account) under the caller's own token.
      const idToken = await user.getIdToken(true);
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('deletion failed');

      sToast.dismiss(toastId);
      sToast.success(t.toasts.deleted);
      window.location.href = '/auth/login';
    } catch (error) {
      sToast.dismiss(toastId);
      sToast.error(t.toasts.errDel);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <LoadingState rows={5} />
      </Page>
    );
  }

  const genderOptions = [
    { value: '', label: t.labels.selectGender },
    { value: 'male', label: t.genders.male },
    { value: 'female', label: t.genders.female },
  ];

  const gradeOptions = [
    { value: '', label: t.labels.selectGrade },
    ...GRADES.map(g => ({
      value: g,
      label: g.startsWith('school_')
        ? `${g.replace('school_', '')}${lang === 'uz' ? '-sinf' : lang === 'ru' ? ' класс' : 'th Grade'}`
        : `${g.replace('uni_', '')}${lang === 'uz' ? '-kurs' : lang === 'ru' ? ' курс' : 'st Year'}`,
    })),
  ];

  const regionOptions = [
    { value: '', label: t.labels.selectRegion },
    ...Object.keys(UZB_LOCATIONS).map(r => ({ value: r, label: r })),
  ];

  const districtOptions = [
    { value: '', label: t.labels.selectDistrict },
    ...(formData.region ? UZB_LOCATIONS[formData.region] ?? [] : []).map((d: string) => ({ value: d, label: d })),
  ];

  const closeDeleteDialog = () => { setShowDeleteConfirm(false); setDeletePassword(''); };

  return (
    <Page>
      <PageHeader title={t.title} />

      {/* 🟢 TABS */}
      <Tabs
        label={t.title}
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: 'profile',  label: t.tabs.profile,  icon: <User size={18} strokeWidth={2.5} /> },
          { value: 'account',  label: t.tabs.account,  icon: <SettingsIcon size={18} strokeWidth={2.5} /> },
          { value: 'security', label: t.tabs.security, icon: <Shield size={18} strokeWidth={2.5} /> },
          { value: 'about',    label: t.tabs.about,    icon: <Info size={18} strokeWidth={2.5} /> },
        ]}
        className="mb-s-gap-lg"
      />

      {/* 🟢 TAB CONTENT AREA — the form tabs share one glass card; About is
          laid straight on the canvas (its own panels would nest card-in-card). */}
      {activeTab !== 'about' && (
      <Card>

        {/* ===================================== PROFILE TAB ===================================== */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-s-gap">

            <div className="grid grid-cols-1 gap-s-gap md:grid-cols-2">
              <TextField
                label={t.labels.fullName}
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
              <TextField
                label={t.labels.birthDate}
                type="date"
                value={formData.birthDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                leading={<Calendar size={18} strokeWidth={2.5} />}
              />
            </div>

            <div className="grid grid-cols-1 gap-s-gap md:grid-cols-2">
              <Select
                label={t.labels.gender}
                options={genderOptions}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              />
              <Select
                label={t.labels.grade}
                options={gradeOptions}
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>

            {/* Bio Input with Character Counter */}
            <TextArea
              label={t.labels.bio}
              value={formData.bio}
              onChange={handleBioChange}
              maxLength={100}
              rows={3}
              hint={`${formData.bio?.length || 0}/100`}
            />

            <div className="grid grid-cols-1 gap-s-gap md:grid-cols-2">
              <Select
                label={t.labels.region}
                options={regionOptions}
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value, district: '' })}
              />
              <Select
                label={t.labels.district}
                options={districtOptions}
                value={formData.district}
                disabled={!formData.region}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              />
            </div>

            <TextField
              label={t.labels.school}
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              leading={<Building size={18} strokeWidth={2.5} />}
            />
          </div>
        )}

        {/* ===================================== ACCOUNT TAB ===================================== */}
        {activeTab === 'account' && (
          <div className="flex flex-col gap-s-gap">

            {/* Username */}
            <TextField
              label={t.labels.username}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })}
              leading={<AtSign size={18} strokeWidth={3} />}
              trailing={
                usernameStatus === 'checking' ? <RefreshCw className="animate-spin" size={18} strokeWidth={3} />
                : usernameStatus === 'valid' ? <CheckCircle className="text-success" size={18} strokeWidth={3} />
                : (usernameStatus === 'taken' || usernameStatus === 'invalid') ? <XCircle className="text-error" size={18} strokeWidth={3} />
                : null
              }
              error={usernameStatus === 'taken' || usernameStatus === 'invalid' ? usernameError : undefined}
              hint={usernameStatus === 'valid' && formData.username !== originalUsername ? t.status.avail : undefined}
            />

            {/* Phone */}
            <TextField
              label={t.labels.phone}
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
              leading={<Phone size={18} strokeWidth={2.5} />}
            />

            {/* Email (Disabled) */}
            <TextField
              label={t.labels.email}
              value={user?.email || ''}
              disabled
              leading={<Mail size={18} strokeWidth={2.5} />}
            />
          </div>
        )}

        {/* ===================================== SAVE BUTTON (For Profile & Account) ===================================== */}
        {(activeTab === 'profile' || activeTab === 'account') && (
          <div className="mt-8">
            <Button
              onClick={handleSave}
              loading={isSaving}
              disabled={usernameStatus === 'checking' || usernameStatus === 'invalid' || usernameStatus === 'taken'}
              icon={<Check size={18} strokeWidth={3} />}
              className="w-full md:w-auto"
            >
              {isSaving ? t.buttons.saving : t.buttons.save}
            </Button>
          </div>
        )}

        {/* ===================================== SECURITY TAB ===================================== */}
        {activeTab === 'security' && (
          <div className="flex flex-col gap-s-section">

            {/* Change Password Section — center-managed accounts are locked out:
                a self-change would desync the manager's stored recovery
                credential, and the synthetic email has no inbox for resets. */}
            {isCenterManaged ? (
              <Banner
                status="info"
                icon={<Building size={20} strokeWidth={3} />}
                title={t.security.centerWarn}
              />
            ) : !isGoogleUser ? (
              <div className="flex flex-col gap-s-gap">
                <Banner
                  status="warning"
                  icon={<AlertCircle size={20} strokeWidth={3} />}
                  title={t.security.warn}
                />
                <TextField
                  label={t.security.current}
                  type="password"
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  leading={<Key size={18} strokeWidth={2.5} />}
                />
                <TextField
                  label={t.security.new}
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  leading={<Key size={18} strokeWidth={2.5} />}
                />
                <TextField
                  label={t.security.confirm}
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  leading={<Key size={18} strokeWidth={2.5} />}
                />
                <Button
                  onClick={handlePasswordUpdate}
                  loading={isSaving}
                  disabled={!currentPass || !newPass || newPass !== confirmPass}
                  className="w-full md:w-auto"
                >
                  {t.security.updateBtn}
                </Button>
              </div>
            ) : (
              <Banner
                status="success"
                icon={<CheckCircle size={20} strokeWidth={3} />}
                title={t.security.googleWarn}
              />
            )}

            {/* DANGER ZONE - DELETE ACCOUNT */}
            <div className="pt-2">
              <h3 className="mb-4 flex items-center gap-2 text-[16px] font-black uppercase tracking-widest text-error">
                <AlertTriangle size={18} strokeWidth={3} /> {t.security.danger}
              </h3>

              <div className="flex flex-col items-center justify-between gap-4 rounded-m3-md bg-error-container p-5 text-on-error-container sm:flex-row">
                <div className="text-center text-[13px] font-bold sm:text-left">
                  <p className="mb-1 text-[16px] font-black">{t.security.deleteTitle}</p>
                  <p>{t.security.deleteDesc}</p>
                </div>
                <Button
                  tone="error"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full shrink-0 sm:w-auto"
                >
                  {t.security.deleteBtn}
                </Button>
              </div>
            </div>
          </div>
        )}

      </Card>
      )}

      {/* ===================================== ABOUT TAB ===================================== */}
      {activeTab === 'about' && (
        <div>

          {/* Edify hero (2026-11-01): the dashboard-card recipe (`.s-deck-card`,
              accent tone) with the logo on a white chip, the portal name and the
              about text. */}
          <div data-tone="accent" className="s-deck-card s-static mb-s-gap-lg overflow-hidden rounded-m3-xl px-6 py-8 text-center sm:py-10">
            <div className="mx-auto mb-4 grid h-16 w-40 place-items-center rounded-m3-lg bg-white px-4 shadow-elev-2">
              <Image src="/brand/edify-logo.webp" alt="Edify" width={307} height={120} unoptimized className="h-8 w-auto" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/75">{t.aboutContent.title}</p>
            <h2 className="s-display mt-2 text-[22px] font-bold tracking-tight sm:text-[26px]">{t.aboutContent.descTitle}</h2>
            <p className="mx-auto mt-2 max-w-xl text-[14px] font-semibold leading-relaxed text-white/85">{t.aboutContent.desc}</p>
          </div>

          {/* SUPPORT — one card per developer with a split Telegram | Call pill
              (Edify, 2026-11-01). The people live in SUPPORT_PEOPLE below. */}
          <section className="mb-s-gap">
            <h3 className="mb-3 px-1 text-[12px] font-black uppercase tracking-[0.1em] text-on-surface-variant">{t.aboutContent.support}</h3>
            <div className="grid grid-cols-1 gap-s-gap sm:grid-cols-2">
              {SUPPORT_PEOPLE.map((p) => (
                <SupportCard key={p.telegram} person={p} callLabel={t.aboutContent.call} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-s-gap md:grid-cols-2">

            {/* FOLLOW EDIFY — Instagram + the Telegram channel. */}
            <section>
              <h3 className="mb-3 px-1 text-[12px] font-black uppercase tracking-[0.1em] text-on-surface-variant">{t.aboutContent.follow}</h3>
              <div className="grid grid-cols-1 gap-2.5">
                <SocialLink
                  href="https://www.instagram.com/edify_math"
                  brand="instagram"
                  icon={<Instagram size={20} strokeWidth={2.4} />}
                  title="@edify_math"
                  subtitle="Instagram"
                />
                <SocialLink
                  href="https://t.me/edify_math_ahliyor"
                  brand="telegram"
                  icon={<Send size={19} strokeWidth={2.4} />}
                  title="@edify_math_ahliyor"
                  subtitle={t.aboutContent.channel}
                />
              </div>
            </section>

            {/* DEVELOPERS — same link cards as Follow Edify. */}
            <section>
              <h3 className="mb-3 px-1 text-[12px] font-black uppercase tracking-[0.1em] text-on-surface-variant">{t.aboutContent.dev}</h3>
              <div className="grid grid-cols-1 gap-2.5">
                <SocialLink
                  href="https://github.com/Wasp-2-AI"
                  brand="github"
                  icon={<Github size={20} strokeWidth={2.4} />}
                  title="Wasp-2-AI"
                  subtitle="GitHub"
                />
                <SocialLink
                  href="https://www.linkedin.com/company/wasp-2-ai"
                  brand="linkedin"
                  icon={<Linkedin size={19} strokeWidth={2.4} />}
                  title="WASP-2 AI Solutions"
                  subtitle="LinkedIn"
                />
              </div>
            </section>
          </div>

          <div className="mt-10 text-center">
            <p className="text-[13px] font-black text-on-surface-variant">{t.aboutContent.version}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-outline">
              © 2026 WASP-2 AI Solutions. {t.aboutContent.rights}
            </p>
          </div>
        </div>
      )}


      {/* Deletion is irreversible and server-side (POST /api/account/delete) —
          it always goes through this confirmation + reauthentication. */}
      <Dialog
        open={showDeleteConfirm}
        onClose={closeDeleteDialog}
        title={t.security.sureTitle}
        icon={
          <div className="grid h-14 w-14 place-items-center rounded-full bg-error-container text-on-error-container">
            <AlertTriangle size={26} strokeWidth={2.5} />
          </div>
        }
        actions={
          <>
            <Button variant="text" onClick={closeDeleteDialog} disabled={isDeleting}>
              {t.security.cancel}
            </Button>
            <Button
              tone="error"
              onClick={handleDeleteAccount}
              loading={isDeleting}
              disabled={!isGoogleUser && !deletePassword}
              icon={<Trash2 size={18} strokeWidth={2.5} />}
            >
              {t.security.yesDelete}
            </Button>
          </>
        }
      >
        <p>{t.security.sureDesc}</p>
        {!isGoogleUser && (
          <TextField
            label={t.security.passPlace}
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            containerClassName="mt-5 text-left"
          />
        )}
      </Dialog>
    </Page>
  );
}

// ─── Support & social (About tab) ────────────────────────────────────────────

/** The people a student can reach. Order is display order. */
const SUPPORT_PEOPLE = [
  { name: 'Umidjon', telegram: 'Umidjon0339', phone: '+998338602006', phoneLabel: '+998 33 860 20 06' },
  { name: 'Ahliyor', telegram: 'A_tojiboyev', phone: '+998912063140', phoneLabel: '+998 91 206 31 40' },
] as const;

type SupportPerson = (typeof SUPPORT_PEOPLE)[number];

/** A developer's card: initial avatar, name, handle + number, and a split
 *  Telegram | Call pill — each half is its own link. */
function SupportCard({ person, callLabel }: { person: SupportPerson; callLabel: string }) {
  return (
    <div className="s-panel rounded-m3-xl p-4 sm:p-5">
      <div className="flex items-center gap-3.5">
        <span className="rounded-full bg-[linear-gradient(140deg,var(--s-accent,var(--m3-primary)),var(--m3-tertiary))] p-[2.5px]">
          <span className="s-chip s-display grid h-12 w-12 place-items-center rounded-full border-[3px] border-[var(--m3-surface-container-lowest)] text-[20px] font-bold">
            {person.name.charAt(0)}
          </span>
        </span>
        <div className="min-w-0">
          <p className="s-display truncate text-[17px] font-bold leading-tight">{person.name}</p>
          <p className="s-num mt-0.5 truncate text-[12.5px] font-bold text-on-surface-variant">
            @{person.telegram} · {person.phoneLabel}
          </p>
        </div>
      </div>

      <div className="s-pill mt-4 flex h-12 items-stretch overflow-hidden rounded-full p-1">
        <a
          href={`https://t.me/${person.telegram}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Telegram @${person.telegram}`}
          className="s-contact-half group flex flex-1 items-center justify-center gap-2 rounded-full text-[13.5px] font-black text-on-surface s-press"
          data-kind="telegram"
        >
          <Send size={17} strokeWidth={2.5} className="transition-transform duration-m3-fast group-hover:-rotate-12" />
          Telegram
        </a>
        <span aria-hidden className="my-2 w-px bg-outline-variant" />
        <a
          href={`tel:${person.phone}`}
          aria-label={`${callLabel} ${person.phoneLabel}`}
          className="s-contact-half group flex flex-1 items-center justify-center gap-2 rounded-full text-[13.5px] font-black text-on-surface s-press"
          data-kind="call"
        >
          <Phone size={16} strokeWidth={2.5} className="transition-transform duration-m3-fast group-hover:rotate-12" />
          {callLabel}
        </a>
      </div>
    </div>
  );
}

/** One external link card (Follow Edify, Developers) — a brand-coloured icon
 *  chip, handle, network, ↗. */
function SocialLink({ href, brand, icon, title, subtitle }: {
  href: string;
  brand: 'instagram' | 'telegram' | 'github' | 'linkedin';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="s-panel group flex items-center gap-3.5 rounded-m3-xl p-3 pr-4 s-press"
    >
      <span className={`s-brand-${brand} grid h-11 w-11 shrink-0 place-items-center rounded-m3-md text-white`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-black">{title}</span>
        <span className="block truncate text-[12px] font-bold text-on-surface-variant">{subtitle}</span>
      </span>
      <ArrowUpRight size={18} strokeWidth={2.5} className="shrink-0 text-on-surface-variant transition-transform duration-m3-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  );
}
