'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/lib/AuthContext';
import { auth, db, storage } from '@/lib/firebase';
import { 
  doc, getDoc, updateDoc, writeBatch, collection, query, orderBy, 
  limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData, increment 
} from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile, signOut } from 'firebase/auth';
import { 
  User as UserIcon, Mail, Trophy, Flame, Star, 
  Activity, Edit2, Check, X, LogOut, Camera, Calendar,
  GraduationCap, Loader2, Trash2, Smile,
  AtSign, RefreshCw, CheckCircle, XCircle, BookOpen, Users, UserMinus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import { useStudentLanguage } from '../layout';
import { checkUsernameUnique } from '@/services/userService'; 

// 🟢 IMPORT SOCIAL ENGINE
import { toggleFollowUser } from '@/lib/social';

// 🟢 IMAGE CROPPER
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/; 

// --- 1. TRANSLATION DICTIONARY ---
const PROFILE_TRANSLATIONS: any = {
  uz: {
    title: "Mening Profilim", edit: "Tahrirlash", save: "Saqlash", cancel: "Bekor", student: "O'quvchi",
    labels: { name: "To'liq ism", email: "Pochta", joined: "Qo'shilgan", phone: "Telefon", school: "Muassasa", notProvided: "Kiritilmagan", username: "Foydalanuvchi nomi", bio: "O'zim haqimda", birthDate: "Tug'ilgan sana", gender: "Jinsi", grade: "Sinf/Kurs", location: "Manzil" },
    sections: { personal: "Shaxsiy Ma'lumotlar", education: "Ta'lim va Manzil", stats: "Hisob Statistikasi", activity: "7 Kunlik Faollik" },
    stats: { xp: "Jami XP", streak: "Seriya", level: "Daraja" },
    status: { minChar: "Kamida 5 ta belgi", regex: "Harf bilan boshlang (a-z, 0-9, _)", taken: "Bu nom band qilingan", avail: "Bu nom bo'sh!" }, 
    genders: { male: "Erkak", female: "Ayol" },
    logout: "Tizimdan chiqish", logoutConfirm: { title: "Tizimdan chiqish", desc: "Haqiqatan ham hisobingizdan chiqmoqchimisiz?", cancel: "Yo'q, qolish", confirm: "Ha, chiqish" },
    photo: { cropTitle: "Rasmni Kesish", apply: "Saqlash", updated: "Rasm yangilandi!", deleted: "Rasm o'chirildi!" },
    success: "Profil yangilandi!", error: "Xatolik yuz berdi.",
    social: { followers: "Obunachilar", following: "Kuzatmoqda", unfollow: "Kuzatishni to'xtatish", remove: "Olib tashlash", emptyList: "Foydalanuvchilar topilmadi." }
  },
  en: {
    title: "My Profile", edit: "Edit", save: "Save", cancel: "Cancel", student: "Student",
    labels: { name: "Full Name", email: "Email", joined: "Joined", phone: "Phone", school: "Institution", notProvided: "Not provided", username: "Username", bio: "Bio", birthDate: "Birth Date", gender: "Gender", grade: "Grade", location: "Location" },
    sections: { personal: "Personal Info", education: "Education & Location", stats: "Account Stats", activity: "7-Day Activity" },
    stats: { xp: "Total XP", streak: "Streak", level: "Level" },
    status: { minChar: "Minimum 5 characters", regex: "Start with letter (a-z, 0-9, _)", taken: "Username is taken", avail: "Username is available!" },
    genders: { male: "Male", female: "Female" },
    logout: "Sign Out", logoutConfirm: { title: "Sign Out", desc: "Are you sure you want to sign out?", cancel: "No, stay", confirm: "Yes, sign out" },
    photo: { cropTitle: "Crop Photo", apply: "Apply", updated: "Photo updated!", deleted: "Photo deleted!" },
    success: "Profile updated!", error: "An error occurred.",
    social: { followers: "Followers", following: "Following", unfollow: "Unfollow", remove: "Remove", emptyList: "No users found." }
  },
  ru: {
    title: "Мой Профиль", edit: "Изменить", save: "Сохранить", cancel: "Отмена", student: "Ученик",
    labels: { name: "Имя", email: "Email", joined: "Регистрация", phone: "Телефон", school: "Учреждение", notProvided: "Не указано", username: "Никнейм", bio: "О себе", birthDate: "Дата рождения", gender: "Пол", grade: "Класс/Курс", location: "Локация" },
    sections: { personal: "Личные данные", education: "Образование", stats: "Статистика", activity: "Активность (7 Дней)" },
    stats: { xp: "Всего XP", streak: "Серия", level: "Уровень" },
    status: { minChar: "Минимум 5 символов", regex: "Начните с буквы (a-z, 0-9, _)", taken: "Имя занято", avail: "Имя доступно!" },
    genders: { male: "Мужской", female: "Женский" },
    logout: "Выйти", logoutConfirm: { title: "Выйти", desc: "Вы уверены, что хотите выйти?", cancel: "Отмена", confirm: "Да, выйти" },
    photo: { cropTitle: "Обрезать фото", apply: "Применить", updated: "Фото обновлено!", deleted: "Фото удалено!" },
    success: "Профиль обновлен!", error: "Произошла ошибка.",
    social: { followers: "Подписчики", following: "Подписки", unfollow: "Отписаться", remove: "Удалить", emptyList: "Пользователи не найдены." }
  }
};

const formatGrade = (gradeId: string, lang: string) => {
  if (!gradeId) return null;
  if (gradeId.startsWith('school_')) return `${gradeId.replace('school_', '')}${lang === 'uz' ? '-sinf' : lang === 'ru' ? ' класс' : 'th Grade'}`;
  if (gradeId.startsWith('uni_')) return `${gradeId.replace('uni_', '')}${lang === 'uz' ? '-kurs' : lang === 'ru' ? ' курс' : 'st Year'}`;
  return gradeId;
};

const calculateTrueStreak = (dailyHistory: Record<string, number> | undefined) => {
  if (!dailyHistory) return 0;
  const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const formatDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  if (!dailyHistory[formatDate(today)] && !dailyHistory[formatDate(yesterday)]) return 0;
  let streakCount = 0; let checkDate = new Date(dailyHistory[formatDate(today)] ? today : yesterday);
  while (dailyHistory[formatDate(checkDate)] && dailyHistory[formatDate(checkDate)] > 0) { streakCount++; checkDate.setDate(checkDate.getDate() - 1); }
  return streakCount;
};

const generateChartData = (dailyHistory: Record<string, number> | undefined, lang: string) => {
  const data = []; const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(today.getDate() - i);
    const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const displayDate = d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' });
    data.push({ name: displayDate.toUpperCase(), XP: dailyHistory?.[dateStr] || 0 });
  }
  return data;
};

export default function StudentProfilePage() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const router = useRouter();
  const t = PROFILE_TRANSLATIONS[lang] || PROFILE_TRANSLATIONS['en'];

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editUsername, setEditUsername] = useState(''); 
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [imgError, setImgError] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'valid' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');

  // 🟢 PAGINATED MODAL STATES
  const [socialListType, setSocialListType] = useState<'followers' | 'following' | null>(null);
  const [socialUsers, setSocialUsers] = useState<any[]>([]);
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);
  const [lastSocialDoc, setLastSocialDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreSocial, setHasMoreSocial] = useState(false);

  // Cropper States
  const [isUploading, setIsUploading] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setProfile({
            ...data,
            displayName: data.displayName || user.displayName || 'Student',
            photoURL: data.photoURL || data.photoUrl || user.photoURL || null,
            totalXP: data.totalXP ?? data.xp ?? 0,
            currentStreak: calculateTrueStreak(data.dailyHistory),
            dailyHistory: data.dailyHistory || {},
            followersCount: data.followersCount || 0, // 🟢 Ensure numbers exist
            followingCount: data.followingCount || 0 
          });
          setEditName(data.displayName || user.displayName || '');
          setEditBio(data.bio || '');
          setEditUsername(data.username || ''); 
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    }
    loadProfile();
  }, [user]);

  // 🟢 FETCH PAGINATED USERS WHEN MODAL OPENS
  useEffect(() => {
    if (!socialListType || !user) {
      setSocialUsers([]); setLastSocialDoc(null); setHasMoreSocial(false); return;
    }

    const loadInitialSocialUsers = async () => {
      setIsLoadingSocial(true);
      try {
        const q = query(collection(db, 'users', user.uid, socialListType), orderBy('followedAt', 'desc'), limit(10));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setLastSocialDoc(snap.docs[snap.docs.length - 1]);
          setHasMoreSocial(snap.docs.length === 10);
          
          const profiles = await Promise.all(
            snap.docs.map(async (d) => {
              const userSnap = await getDoc(doc(db, 'users', d.id));
              return userSnap.exists() ? { id: d.id, ...userSnap.data() } : null;
            })
          );
          setSocialUsers(profiles.filter(Boolean));
        } else {
          setHasMoreSocial(false);
        }
      } catch (error) { console.error("Error", error); } finally { setIsLoadingSocial(false); }
    };
    loadInitialSocialUsers();
  }, [socialListType, user]);

  // 🟢 LOAD MORE PAGINATION
  const handleLoadMoreSocialUsers = async () => {
    if (!lastSocialDoc || !socialListType || !user) return;
    setIsLoadingSocial(true);
    try {
      const q = query(collection(db, 'users', user.uid, socialListType), orderBy('followedAt', 'desc'), startAfter(lastSocialDoc), limit(10));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setLastSocialDoc(snap.docs[snap.docs.length - 1]);
        setHasMoreSocial(snap.docs.length === 10);
        
        const profiles = await Promise.all(
          snap.docs.map(async (d) => {
            const userSnap = await getDoc(doc(db, 'users', d.id));
            return userSnap.exists() ? { id: d.id, ...userSnap.data() } : null;
          })
        );
        setSocialUsers(prev => [...prev, ...profiles.filter(Boolean)]);
      } else { setHasMoreSocial(false); }
    } catch (error) { console.error(error); } finally { setIsLoadingSocial(false); }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMoreSocial && !isLoadingSocial) {
      handleLoadMoreSocialUsers();
    }
  };

  // ============================================================================
  // 🟢 SOCIAL ACTION HANDLERS
  // ============================================================================
  const handleUnfollow = async (targetId: string) => {
    if (!user) return;
    // 🟢 FIX: Added (prev: any[]) and (prev: any)
    setSocialUsers((prev: any[]) => prev.filter(u => u.id !== targetId));
    setProfile((prev: any) => ({...prev, followingCount: Math.max(0, prev.followingCount - 1)}));
    try {
      await toggleFollowUser(user.uid, targetId, true); 
    } catch (e) { console.error(e); }
  };

  const handleRemoveFollower = async (followerId: string) => {
    if (!user) return;
    // 🟢 FIX: Added (prev: any[]) and (prev: any)
    setSocialUsers((prev: any[]) => prev.filter(u => u.id !== followerId));
    setProfile((prev: any) => ({...prev, followersCount: Math.max(0, prev.followersCount - 1)}));
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid, 'followers', followerId));
      batch.delete(doc(db, 'users', followerId, 'following', user.uid));
      batch.update(doc(db, 'users', user.uid), { followersCount: increment(-1) });
      batch.update(doc(db, 'users', followerId), { followingCount: increment(-1) });
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  // --- REST OF EXISTING LOGIC (Unchanged) ---
  useEffect(() => {
    if (!isEditing) return; 
    const input = editUsername.trim().toLowerCase();
    const original = profile?.username?.toLowerCase() || '';

    if (!input) { setUsernameStatus('idle'); setUsernameError(''); return; }
    if (input.length < 5) { setUsernameStatus('invalid'); setUsernameError(t.status.minChar); return; }
    if (!USERNAME_REGEX.test(input)) { setUsernameStatus('invalid'); setUsernameError(t.status.regex); return; }
    if (input === original) { setUsernameStatus('valid'); setUsernameError(''); return; }

    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const isUnique = await checkUsernameUnique(input);
        if (isUnique) { setUsernameStatus('valid'); setUsernameError(''); }
        else { setUsernameStatus('taken'); setUsernameError(t.status.taken); }
      } catch (error) { setUsernameStatus('idle'); }
    }, 500);
    return () => clearTimeout(timer);
  }, [editUsername, profile?.username, isEditing, t]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type }); setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= 100) setEditBio(e.target.value);
  };

  const handleSaveProfile = async () => {
    if (!user || !editName.trim()) return;
    if (usernameStatus === 'checking' || usernameStatus === 'invalid' || usernameStatus === 'taken') return;

    setIsSaving(true);
    try {
      const newUsername = editUsername.trim().toLowerCase();
      const oldUsername = profile?.username?.toLowerCase();

      await updateProfile(user, { displayName: editName.trim() });

      if (newUsername !== oldUsername && newUsername) {
        const batch = writeBatch(db);
        if (oldUsername) batch.delete(doc(db, 'usernames', oldUsername));
        batch.set(doc(db, 'usernames', newUsername), { uid: user.uid });
        batch.update(doc(db, 'users', user.uid), { displayName: editName.trim(), bio: editBio.trim(), username: newUsername });
        await batch.commit();
      } else {
        await updateDoc(doc(db, 'users', user.uid), { displayName: editName.trim(), bio: editBio.trim() });
      }

      setProfile((prev: any) => ({ ...prev, displayName: editName.trim(), bio: editBio.trim(), username: newUsername }));
      showToast(t.success, 'success');
      setIsEditing(false);
    } catch (error) { showToast(t.error, 'error'); } finally { setIsSaving(false); }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerCrop(makeAspectCrop({ unit: 'px', width: Math.min(width, height) * 0.9 }, 1, width, height), width, height));
  };

  const handleUploadCroppedImage = async () => {
    if (!completedCrop || !imgRef.current || !user || !selectedFile) return;
    setIsUploading(true);
    try {
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      let cropW = completedCrop.width * scaleX, cropH = completedCrop.height * scaleY;
      const originalKb = selectedFile.size / 1024;
      let outputQuality = originalKb > 1024 ? 0.75 : originalKb > 200 ? 0.85 : 1.0;
      if (originalKb > 1024 && cropW > 800) { cropH *= 800 / cropW; cropW = 800; }
      else if (originalKb > 200 && cropW > 1024) { cropH *= 1024 / cropW; cropW = 1024; }

      canvas.width = cropW; canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');
      ctx.drawImage(imgRef.current, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, canvas.width, canvas.height);

      const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('Empty')); }, 'image/jpeg', outputQuality));
      const storageRef = ref(storage, `profile_images/${user.uid}.jpg`);
      await uploadBytes(storageRef, blob);
      const finalUrl = `${await getDownloadURL(storageRef)}&t=${Date.now()}`;

      await updateDoc(doc(db, 'users', user.uid), { photoURL: finalUrl });
      await updateProfile(user, { photoURL: finalUrl });
      setProfile((prev: any) => ({ ...prev, photoURL: finalUrl }));
      showToast(t.photo.updated, 'success');
      setImgSrc(''); setSelectedFile(null); setImgError(false);
    } catch (error) { showToast(t.photo.errUpload, 'error'); } finally { 
      setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleDeletePhoto = async () => {
    if (!user) return;
    setIsUploading(true);
    try {
      try { await deleteObject(ref(storage, `profile_images/${user.uid}.jpg`)); } catch (e) {}
      await updateDoc(doc(db, 'users', user.uid), { photoURL: null });
      await updateProfile(user, { photoURL: "" });
      setProfile((prev: any) => ({ ...prev, photoURL: null }));
      setShowPhotoViewer(false); showToast(t.photo.deleted, 'success');
    } catch (error) { showToast(t.photo.errDelete, 'error'); } finally { setIsUploading(false); }
  };

  const chartData = useMemo(() => generateChartData(profile?.dailyHistory, lang), [profile, lang]);
  const currentLevel = Math.floor((profile?.totalXP || 0) / 1000) + 1;
  const avatarUrl = !imgError && profile?.photoURL ? profile.photoURL : null;

  if (loading) return <div className="w-full min-h-[60vh] flex items-center justify-center"><div className="w-12 h-12 border-4 border-zinc-200 border-t-violet-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-12">
      
      <input type="file" accept="image/jpeg, image/png, image/webp" ref={fileInputRef} className="hidden" onChange={onSelectFile} />

      {/* --- CROPPER MODAL --- */}
      <AnimatePresence>
        {imgSrc && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm" onClick={() => !isUploading && setImgSrc('')} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-white rounded-[2rem] border-2 border-zinc-200 p-6 max-w-md w-full shadow-2xl z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-zinc-900 tracking-tight">{t.photo.cropTitle}</h3>
                <button onClick={() => setImgSrc('')} disabled={isUploading} className="text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors"><X size={18} strokeWidth={3}/></button>
              </div>
              <div className="w-full max-h-[50vh] overflow-hidden bg-zinc-100 border-2 border-zinc-200 rounded-2xl flex items-center justify-center mb-6">
                <ReactCrop crop={crop} onChange={(_, p) => setCrop(p)} onComplete={(c) => setCompletedCrop(c)} aspect={1} circularCrop className="max-h-full">
                  <img ref={imgRef} src={imgSrc} alt="Crop preview" onLoad={onImageLoad} className="max-h-[50vh] object-contain" />
                </ReactCrop>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setImgSrc('')} disabled={isUploading} className="flex-1 py-3 bg-white text-zinc-600 font-black text-[15px] rounded-2xl border-2 border-zinc-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all disabled:opacity-50">{t.cancel}</button>
                <button onClick={handleUploadCroppedImage} disabled={isUploading} className="flex-1 py-3 bg-violet-500 text-white font-black text-[15px] rounded-2xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2">
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />} {t.photo.apply}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight mb-6">{t.title}</h1>

      <div className="space-y-5 md:space-y-6">
        
        {/* ========================================= */}
        {/* 1. PREMIUM HEADER IDENTITY CARD */}
        {/* ========================================= */}
        <div className="bg-white border-2 border-zinc-200 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          
          {!isEditing && (
            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
              <button onClick={() => setIsEditing(true)} className="inline-flex items-center justify-center gap-2 p-3 md:px-5 md:py-2.5 bg-white text-zinc-700 font-black text-[14px] rounded-xl md:rounded-2xl border-2 border-zinc-200 border-b-4 hover:bg-zinc-50 active:border-b-2 active:translate-y-[2px] transition-all">
                <Edit2 size={18} strokeWidth={2.5}/> <span className="hidden md:inline">{t.edit}</span>
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 mt-4 md:mt-0">
            <div className="relative shrink-0 group">
              <div onClick={() => avatarUrl && !isUploading ? setShowPhotoViewer(true) : null} className={`w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-violet-500 border-2 border-zinc-200 border-b-4 flex items-center justify-center text-white text-5xl font-black shadow-sm overflow-hidden z-10 relative transition-transform ${avatarUrl ? 'cursor-pointer active:translate-y-[2px] active:border-b-2' : ''}`}>
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => setImgError(true)} /> : profile?.displayName?.charAt(0).toUpperCase() || 'S'}
                {isUploading && <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center"><Loader2 className="animate-spin text-white" size={28} /></div>}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="absolute -bottom-2 -right-2 w-11 h-11 bg-white rounded-xl flex items-center justify-center text-zinc-600 border-2 border-zinc-200 border-b-4 active:border-b-2 active:translate-y-[2px] z-20 transition-all hover:text-violet-600 disabled:opacity-50">
                <Camera size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="flex-1 w-full text-center md:text-left relative z-10">
              
              {isEditing ? (
                <div className="space-y-4 w-full max-w-md mx-auto md:mx-0 animate-in fade-in">
                  <div>
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t.labels.name}</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full mt-1 px-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-black text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t.labels.username}</label>
                    <div className="relative mt-1">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} strokeWidth={3} />
                      <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} className={`w-full pl-10 pr-12 py-3.5 bg-zinc-50 border-2 rounded-2xl font-black text-zinc-900 focus:outline-none focus:bg-white transition-colors ${usernameStatus === 'valid' ? 'border-emerald-500 focus:border-emerald-500 bg-emerald-50/30' : (usernameStatus === 'taken' || usernameStatus === 'invalid') ? 'border-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-zinc-200 focus:border-violet-500'}`} />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {usernameStatus === 'checking' && <RefreshCw className="animate-spin text-zinc-400" size={18} strokeWidth={3}/>}
                        {usernameStatus === 'valid' && <CheckCircle className="text-emerald-500" size={18} strokeWidth={3}/>}
                        {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="text-rose-500" size={18} strokeWidth={3}/>}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t.labels.bio}</label>
                      <span className={`text-[10px] font-bold mr-1 transition-colors ${editBio.length === 100 ? 'text-rose-500' : 'text-zinc-400'}`}>{editBio.length}/100</span>
                    </div>
                    <textarea value={editBio} onChange={handleBioChange} maxLength={100} rows={3} className="w-full px-4 py-3.5 bg-zinc-50 border-2 border-zinc-200 rounded-2xl font-bold text-[14px] text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors resize-none custom-scrollbar" placeholder={t.labels.notProvided} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSaveProfile} disabled={isSaving || usernameStatus === 'checking' || usernameStatus === 'invalid' || usernameStatus === 'taken'} className="flex-1 py-3.5 bg-violet-500 text-white font-black text-[15px] rounded-2xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2">
                      {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Check size={18} strokeWidth={3}/>} {t.save}
                    </button>
                    <button onClick={() => { setIsEditing(false); setEditName(profile?.displayName || ''); setEditBio(profile?.bio || ''); setEditUsername(profile?.username || ''); setUsernameStatus('idle'); }} className="flex-1 py-3.5 bg-white text-zinc-600 font-black text-[15px] rounded-2xl border-2 border-zinc-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all">{t.cancel}</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col xl:flex-row gap-6 xl:items-end justify-between mt-2 md:mt-3 animate-in fade-in h-full">
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight mb-1">{profile?.displayName}</h2>
                    {profile?.username && <p className="text-[15px] font-bold text-zinc-500 mb-4">@{profile.username}</p>}
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 border-2 border-violet-100 rounded-xl font-black text-[11px] uppercase tracking-widest"><GraduationCap size={16} strokeWidth={3} /> {t.student}</span>
                      {profile?.gender && <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 ${profile.gender === 'male' ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>{profile.gender === 'male' ? <UserIcon size={16} strokeWidth={3}/> : <Smile size={16} strokeWidth={3}/>}</span>}
                    </div>

                    {profile?.bio ? (
                      <div className="bg-zinc-50 border-2 border-zinc-200/60 rounded-2xl p-5 text-[14px] font-bold text-zinc-600 max-w-lg mx-auto md:mx-0 text-center md:text-left relative inline-block">
                        <span className="absolute -top-4 -left-2 text-5xl font-serif text-zinc-200 select-none">"</span>
                        <span className="relative z-10 leading-relaxed block px-2 break-words">{profile.bio}</span>
                        <span className="absolute -bottom-6 -right-2 text-5xl font-serif text-zinc-200 select-none">"</span>
                      </div>
                    ) : <div className="text-[13px] font-bold text-zinc-400 italic">{t.labels.notProvided} {t.labels.bio.toLowerCase()}</div>}
                  </div>

                  {/* 🟢 CLICKABLE SOCIAL STATS BOX */}
                  <div className="bg-indigo-50 border-2 border-indigo-100 border-b-[6px] rounded-[1.5rem] p-5 shadow-sm flex items-center justify-around shrink-0 xl:w-72 mt-4 xl:mt-0">
                    <div onClick={() => setSocialListType('following')} className="text-center w-1/2 cursor-pointer group hover:bg-indigo-100/50 p-2 rounded-xl transition-colors">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">{t.social.following}</p>
                      <p className="text-3xl md:text-4xl font-black text-indigo-600 tracking-tight">{profile?.followingCount || 0}</p>
                    </div>
                    <div className="w-1 h-12 bg-indigo-200/50 rounded-full shrink-0"></div>
                    <div onClick={() => setSocialListType('followers')} className="text-center w-1/2 cursor-pointer group hover:bg-indigo-100/50 p-2 rounded-xl transition-colors">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">{t.social.followers}</p>
                      <p className="text-3xl md:text-4xl font-black text-indigo-600 tracking-tight">{profile?.followersCount || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-zinc-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 border-2 border-blue-100"><Mail size={20} strokeWidth={2.5}/></div><h3 className="font-black text-zinc-900 text-[16px] tracking-tight">{t.sections.personal}</h3></div>
            <div className="space-y-4">
              <div className="flex justify-between items-center"><span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{t.labels.email}</span><span className="text-zinc-900 font-black text-[14px] truncate max-w-[200px]">{user?.email}</span></div>
              <div className="h-0.5 w-full bg-zinc-100"></div>
              <div className="flex justify-between items-center"><span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{t.labels.phone}</span><span className="text-zinc-900 font-black text-[14px]">{profile?.phone || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}</span></div>
              <div className="h-0.5 w-full bg-zinc-100"></div>
              <div className="flex justify-between items-center"><span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{t.labels.birthDate}</span><span className="text-zinc-900 font-black text-[14px]">{profile?.birthDate || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}</span></div>
            </div>
          </div>
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-zinc-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 border-2 border-emerald-100"><BookOpen size={20} strokeWidth={2.5}/></div><h3 className="font-black text-zinc-900 text-[16px] tracking-tight">{t.sections.education}</h3></div>
            <div className="space-y-4">
              <div className="flex justify-between items-center"><span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{t.labels.school}</span><span className="text-zinc-900 font-black text-[14px] truncate max-w-[150px] text-right">{profile?.institution || profile?.institutionName || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}</span></div>
              <div className="h-0.5 w-full bg-zinc-100"></div>
              <div className="flex justify-between items-center"><span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{t.labels.grade}</span><span className="text-zinc-900 font-black text-[14px]">{formatGrade(profile?.grade, lang) || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}</span></div>
              <div className="h-0.5 w-full bg-zinc-100"></div>
              <div className="flex justify-between items-center"><span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{t.labels.location}</span><span className="text-zinc-900 font-black text-[14px] text-right truncate max-w-[180px]">{[profile?.location?.district, profile?.location?.region].filter(Boolean).join(', ') || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}</span></div>
            </div>
          </div>
        </div>

        {/* 3. TACTILE STATS GRID */}
        <div>
          <h3 className="text-[18px] font-black text-zinc-900 tracking-tight mb-4 ml-2">{t.sections.stats}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl border-2 border-zinc-200 p-5 flex flex-col items-center text-center"><div className="w-12 h-12 rounded-[1rem] bg-amber-100 flex items-center justify-center text-amber-500 border-2 border-amber-200 mb-3"><Trophy size={24} strokeWidth={2.5}/></div><p className="text-3xl font-black text-zinc-900 tracking-tight">{(profile?.totalXP || 0).toLocaleString()}</p><span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t.stats.xp}</span></div>
            <div className="bg-white rounded-3xl border-2 border-zinc-200 p-5 flex flex-col items-center text-center"><div className="w-12 h-12 rounded-[1rem] bg-orange-100 flex items-center justify-center text-orange-500 border-2 border-orange-200 mb-3"><Flame size={24} strokeWidth={2.5}/></div><p className={`text-3xl font-black tracking-tight ${profile?.currentStreak > 0 ? 'text-orange-500' : 'text-zinc-900'}`}>{profile?.currentStreak}</p><span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t.stats.streak}</span></div>
            <div className="bg-white rounded-3xl border-2 border-zinc-200 p-5 flex flex-col items-center text-center col-span-2 md:col-span-1"><div className="w-12 h-12 rounded-[1rem] bg-emerald-100 flex items-center justify-center text-emerald-500 border-2 border-emerald-200 mb-3"><Star size={24} strokeWidth={2.5}/></div><p className="text-3xl font-black text-zinc-900 tracking-tight">{currentLevel}</p><span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t.stats.level}</span></div>
          </div>
        </div>

        {/* 4. RECHARTS ACTIVITY GRAPH */}
        <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 md:p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6"><h3 className="font-black text-zinc-900 flex items-center gap-2 text-[16px] tracking-tight"><Activity size={20} strokeWidth={3} className="text-violet-500" /> {t.sections.activity}</h3></div>
          <div className="w-full h-[220px] mt-2 relative" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs><linearGradient id="colorXPProfile" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#A1A1AA', fontWeight: 900 }} dy={10} />
                <YAxis hide={true} domain={[0, 'dataMax + 50']} />
                <Tooltip contentStyle={{ backgroundColor: '#18181B', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: '900', fontSize: '14px', padding: '10px 16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }} itemStyle={{ color: '#8B5CF6' }} cursor={{ stroke: '#E4E4E7', strokeWidth: 2, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="XP" stroke="#8B5CF6" strokeWidth={4} fillOpacity={1} fill="url(#colorXPProfile)" activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. DANGER ZONE */}
        <div className="pt-2">
          <button onClick={() => setShowLogoutModal(true)} className="w-full py-4 bg-white text-rose-600 font-black text-[15px] rounded-2xl border-2 border-zinc-200 border-b-4 hover:border-rose-200 hover:bg-rose-50 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2">
            <LogOut size={20} strokeWidth={2.5}/> {t.logout}
          </button>
        </div>

      </div>

      {/* 🟢 THE INFINITE SCROLL SOCIAL MODAL */}
      <AnimatePresence>
        {socialListType && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" 
              onClick={() => setSocialListType(null)} 
            />
            
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full sm:max-w-md h-[80vh] sm:h-[650px] bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col shadow-2xl z-10 overflow-hidden"
            >
              <div className="px-6 py-5 border-b-2 border-zinc-100 flex justify-between items-center bg-white z-10 shrink-0">
                <h3 className="text-xl font-black text-zinc-900 tracking-tight capitalize">
                  {socialListType === 'followers' ? t.social.followers : t.social.following}
                </h3>
                <button onClick={() => setSocialListType(null)} className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 active:scale-95 transition-all">
                  <X size={20} strokeWidth={3}/>
                </button>
              </div>

              <div onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-zinc-50/50">
                {socialUsers.length === 0 && !isLoadingSocial ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                    <Users size={48} strokeWidth={2} className="mb-4 opacity-40"/>
                    <p className="font-bold text-[15px]">{t.social.emptyList}</p>
                  </div>
                ) : (
                  socialUsers.map((user) => (
                    <div 
                      key={user.id}
                      className="bg-white p-5 rounded-[1.5rem] border-2 border-zinc-100 flex items-center gap-4 hover:border-violet-200 hover:shadow-md transition-all group"
                    >
                      {/* Navigate on Avatar/Name Click */}
                      <div 
                        className="flex items-center gap-4 flex-1 cursor-pointer min-w-0"
                        onClick={() => {
                          setSocialListType(null);
                          router.push(`/profile/${user.id}`);
                        }}
                      >
                        <div className="w-14 h-14 rounded-[1.2rem] bg-zinc-100 flex items-center justify-center overflow-hidden border-2 border-zinc-50 shrink-0 shadow-sm">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-black text-xl text-zinc-400">{user.displayName?.charAt(0).toUpperCase() || 'S'}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-zinc-900 text-[16px] leading-tight truncate group-hover:text-violet-600 transition-colors">
                            {user.displayName || 'Student'}
                          </p>
                          {user.username && <p className="text-[14px] font-bold text-zinc-400 truncate mt-0.5">@{user.username}</p>}
                        </div>
                      </div>

                      {/* 🟢 ACTION BUTTONS (Unfollow / Remove) */}
                      {socialListType === 'following' ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleUnfollow(user.id); }}
                          className="shrink-0 px-4 py-2 bg-zinc-100 text-zinc-600 font-bold text-[12px] uppercase tracking-widest rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors border-2 border-transparent hover:border-rose-200"
                        >
                          {t.social.unfollow}
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRemoveFollower(user.id); }}
                          className="shrink-0 px-3 py-2 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors border-2 border-transparent hover:border-rose-200"
                          title={t.social.remove}
                        >
                          <UserMinus size={18} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  ))
                )}

                {isLoadingSocial && (
                  <div className="flex justify-center py-6">
                    <Loader2 size={28} className="text-violet-500 animate-spin" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN PHOTO VIEWER MODAL */}
      {showPhotoViewer && avatarUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm" onClick={() => setShowPhotoViewer(false)}></div>
          <div className="relative w-full max-w-sm aspect-square rounded-[2.5rem] bg-zinc-100 overflow-hidden shadow-2xl border-4 border-white animate-in zoom-in-95 z-10">
            <img src={avatarUrl} alt="Full Profile" className="w-full h-full object-cover" />
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-zinc-900/60 to-transparent">
              <button onClick={() => setShowPhotoViewer(false)} className="w-10 h-10 rounded-full bg-zinc-900/40 text-white flex items-center justify-center hover:bg-zinc-900/60 backdrop-blur-md transition-colors"><X size={20} strokeWidth={3}/></button>
              <button onClick={handleDeletePhoto} disabled={isUploading} className="w-10 h-10 rounded-full bg-zinc-900/40 text-rose-400 hover:text-white hover:bg-rose-500 flex items-center justify-center backdrop-blur-md transition-colors disabled:opacity-50">
                {isUploading ? <Loader2 size={18} className="animate-spin text-white"/> : <Trash2 size={18} strokeWidth={2.5}/>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}