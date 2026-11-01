'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/lib/AuthContext';
import { auth, db, storage } from '@/lib/firebase';
import {
  doc, getDoc, updateDoc, writeBatch, collection, query, orderBy,
  limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile, signOut, linkWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { googlePhotoURL } from '@/lib/googlePhoto';
import {
  User as UserIcon, Mail, Activity, Edit2, Check, X, LogOut, Camera,
  GraduationCap, Trash2, Smile,
  AtSign, RefreshCw, CheckCircle, XCircle, BookOpen, Users, UserMinus, Building2, ImageUp
} from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, Tooltip, YAxis } from 'recharts';
import ChartFrame from '@/components/ChartFrame';
import { calculateStreak, last7Days, xpDayKey } from '@/lib/xpDays';
import { useStudentLanguage } from '../layout';
import { checkUsernameUnique } from '@/services/userService';
import { fetchMyCenters, type MyCenter } from '@/services/studentCenterService';

// 🟢 IMPORT SOCIAL ENGINE
import { toggleFollowUser, removeFollower } from '@/lib/social';

// 🟢 IMAGE CROPPER
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import {
  Page, Stack, PageHeader, Card, Chip, Avatar, Button, IconButton,
  TextField, TextArea, ListGroup, ListRow, Dialog, ConfirmDialog,
  EmptyState, LoadingState, Spinner, StatBand, XpProgress, StreakDisplay,
  sToast, cn,
} from '@/components/student-ui';

const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

const DAY_MS = 86_400_000;

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
    photo: { cropTitle: "Rasmni Kesish", apply: "Saqlash", updated: "Rasm yangilandi!", deleted: "Rasm o'chirildi!", errUpload: "Rasm yuklashda xatolik", errDelete: "Rasmni o'chirishda xatolik", menu: "Rasmni o'zgartirish", upload: "Qurilmadan yuklash", google: "Google rasmini qo'yish", googleInUse: "Bu Google hisobi boshqa Edify profiliga ulangan", noGoogle: "Google hisobingizda rasm yo'q" },
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
    photo: { cropTitle: "Crop Photo", apply: "Apply", updated: "Photo updated!", deleted: "Photo deleted!", errUpload: "Failed to upload photo", errDelete: "Failed to delete photo", menu: "Change photo", upload: "Upload from device", google: "Use Google photo", googleInUse: "That Google account belongs to another Edify profile", noGoogle: "Your Google account has no photo" },
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
    photo: { cropTitle: "Обрезать фото", apply: "Применить", updated: "Фото обновлено!", deleted: "Фото удалено!", errUpload: "Ошибка загрузки фото", errDelete: "Ошибка удаления фото", menu: "Сменить фото", upload: "Загрузить с устройства", google: "Фото из Google", googleInUse: "Этот Google-аккаунт привязан к другому профилю Edify", noGoogle: "В вашем Google-аккаунте нет фото" },
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

/** Right-aligned value of a label/value row, with an italic "not provided" fallback. */
function InfoValue({ value, fallback }: { value?: React.ReactNode; fallback: string }) {
  return (
    <span className="max-w-[55%] truncate text-right text-[13.5px] font-black text-on-surface">
      {value || <span className="font-bold italic text-on-surface-variant">{fallback}</span>}
    </span>
  );
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const router = useRouter();
  const t = PROFILE_TRANSLATIONS[lang] || PROFILE_TRANSLATIONS['en'];

  const [profile, setProfile] = useState<any>(null);
  const [myCenters, setMyCenters] = useState<MyCenter[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editUsername, setEditUsername] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);

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
            // Last resort: the Google (Gmail) photo of a Google-linked account.
            photoURL: data.photoURL || data.photoUrl || user.photoURL || googlePhotoURL(user) || null,
            totalXP: data.totalXP ?? data.xp ?? 0,
            currentStreak: calculateStreak(data.dailyHistory),
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
    // Center chip — membership via center_students, shown even with zero groups.
    if (user) fetchMyCenters(user.uid).then(setMyCenters).catch(() => {});
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
      // Transactional (existence-checked, clamped counters) — lib/social.ts.
      await removeFollower(user.uid, followerId);
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
    if (type === 'success') sToast.success(text); else sToast.error(text);
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

  /**
   * "Use Google photo": the Gmail profile picture becomes the avatar. An account
   * that is not Google-linked yet links Google first (`linkWithPopup`) — that
   * is the only way to read its photo, and as a side effect the student can
   * then also sign in with Google. The URL is Google's (lh3), not a copy in
   * Storage, so a previously uploaded photo file is removed.
   */
  const handleUseGooglePhoto = async () => {
    if (!user) return;
    setPhotoMenu(false);
    setIsUploading(true);
    try {
      let url = googlePhotoURL(user);
      if (!url) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const res = await linkWithPopup(user, provider);
        url = googlePhotoURL(res.user);
      }
      if (!url) { showToast(t.photo.noGoogle, 'error'); return; }

      try { await deleteObject(ref(storage, `profile_images/${user.uid}.jpg`)); } catch { /* none uploaded */ }
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      await updateProfile(user, { photoURL: url });
      setProfile((prev: typeof profile) => ({ ...prev, photoURL: url }));
      setImgError(false);
      showToast(t.photo.updated, 'success');
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
        showToast(t.photo.googleInUse, 'error');
      } else {
        showToast(t.photo.errUpload, 'error');
      }
    } finally { setIsUploading(false); }
  };

  const chartData = useMemo(() => last7Days(profile?.dailyHistory, lang), [profile, lang]);
  // The same 7 UTC days the chart shows, as dailyHistory keys — lib/xpDays.ts
  // owns the convention; never re-derive a day key from device-local time.
  const weekKeys = useMemo(
    () => Array.from({ length: 7 }, (_, i) => xpDayKey(new Date(Date.now() - (6 - i) * DAY_MS))),
    [],
  );
  const activeDays = useMemo(
    () => weekKeys.filter((k) => (profile?.dailyHistory?.[k] ?? 0) > 0),
    [weekKeys, profile],
  );
  const currentLevel = Math.floor((profile?.totalXP || 0) / 1000) + 1;
  const xpIntoLevel = (profile?.totalXP || 0) % 1000;
  const avatarUrl = !imgError && profile?.photoURL ? profile.photoURL : null;

  if (loading) return <Page><LoadingState rows={5} /></Page>;

  return (
    <Page>

      <input type="file" accept="image/jpeg, image/png, image/webp" ref={fileInputRef} className="hidden" onChange={onSelectFile} />

      <PageHeader
        title={t.title}
        actions={!isEditing && (
          <Button icon={<Edit2 size={17} strokeWidth={2.6} />} onClick={() => setIsEditing(true)}>
            {t.edit}
          </Button>
        )}
      />

      <Stack>

        {/* ========================================= */}
        {/* 1. HEADER IDENTITY CARD */}
        {/* ========================================= */}
        <Card>
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-8">
            <div className="relative shrink-0">
              {/* Edify avatar: accent-gradient ring with a surface gap and a soft
                  accent glow; the initials fallback is the accent chip. */}
              <div className="rounded-full bg-[linear-gradient(140deg,var(--s-accent,var(--m3-primary)),var(--m3-tertiary))] p-[3px] shadow-[0_14px_32px_-14px_var(--s-accent,var(--m3-primary))]">
                <button
                  type="button"
                  onClick={() => { if (avatarUrl && !isUploading) setShowPhotoViewer(true); }}
                  disabled={!avatarUrl || isUploading}
                  aria-label={profile?.displayName || t.student}
                  className={cn(
                    'relative grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-[var(--m3-surface-container-lowest)] md:h-36 md:w-36',
                    'text-[44px] font-black md:text-[54px]',
                    !avatarUrl && 's-chip',
                    avatarUrl && !isUploading ? 's-press' : 'cursor-default',
                  )}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setImgError(true)} />
                    : <span aria-hidden className="s-display">{profile?.displayName?.charAt(0).toUpperCase() || 'S'}</span>}
                  {isUploading && (
                    <span className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--m3-scrim)_45%,transparent)]">
                      <Spinner size={26} />
                    </span>
                  )}
                </button>
              </div>

              {/* Photo menu: upload from the device, or use the Google photo. */}
              <button
                type="button"
                aria-label={t.photo.menu}
                aria-haspopup="menu"
                aria-expanded={photoMenu}
                title={t.photo.menu}
                onClick={() => setPhotoMenu((o) => !o)}
                disabled={isUploading}
                className="s-chip s-press absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-full border-[3px] border-[var(--m3-surface-container-lowest)] disabled:opacity-60"
              >
                <Camera size={17} strokeWidth={2.6} />
              </button>
              {photoMenu && (
                <>
                  <button
                    type="button"
                    aria-hidden
                    tabIndex={-1}
                    data-no-glint
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setPhotoMenu(false)}
                  />
                  <div
                    role="menu"
                    aria-label={t.photo.menu}
                    onKeyDown={(e) => { if (e.key === 'Escape') setPhotoMenu(false); }}
                    className="s-menu absolute left-1/2 top-full z-40 mt-2 w-60 -translate-x-1/2 rounded-m3-lg p-1.5 md:left-0 md:translate-x-0"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      autoFocus
                      onClick={() => { setPhotoMenu(false); fileInputRef.current?.click(); }}
                      className="flex w-full items-center gap-3 rounded-m3-md px-3 py-2.5 text-left text-[13.5px] font-bold text-on-surface hover:bg-state-hover"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-state-hover text-on-surface-variant">
                        <ImageUp size={16} strokeWidth={2.4} />
                      </span>
                      {t.photo.upload}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleUseGooglePhoto}
                      className="flex w-full items-center gap-3 rounded-m3-md px-3 py-2.5 text-left text-[13.5px] font-bold text-on-surface hover:bg-state-hover"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--m3-surface-container-lowest)] shadow-elev-1">
                        <GoogleMark />
                      </span>
                      {t.photo.google}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center md:text-left">

              {isEditing ? (
                <div className="mx-auto grid w-full max-w-2xl gap-3 text-left sm:grid-cols-2 md:mx-0">
                  <TextField
                    label={t.labels.name}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <TextField
                    label={t.labels.username}
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                    leading={<AtSign size={17} strokeWidth={2.8} />}
                    error={usernameError || undefined}
                    className={usernameStatus === 'valid' ? 'border-success focus:border-success' : undefined}
                    trailing={
                      usernameStatus === 'checking' ? <RefreshCw size={17} strokeWidth={2.8} className="s-spin" />
                      : usernameStatus === 'valid' ? <CheckCircle size={17} strokeWidth={2.8} className="text-success" />
                      : (usernameStatus === 'taken' || usernameStatus === 'invalid') ? <XCircle size={17} strokeWidth={2.8} className="text-error" />
                      : undefined
                    }
                  />
                  <div className="sm:col-span-2">
                  <TextArea
                    label={t.labels.bio}
                    value={editBio}
                    onChange={handleBioChange}
                    maxLength={100}
                    rows={3}
                    placeholder={t.labels.notProvided}
                    hint={`${editBio.length}/100`}
                    className="resize-none"
                  />
                  </div>
                  <div className="flex flex-col-reverse gap-2 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outlined"
                      className="s-panel border-transparent"
                      onClick={() => { setIsEditing(false); setEditName(profile?.displayName || ''); setEditBio(profile?.bio || ''); setEditUsername(profile?.username || ''); setUsernameStatus('idle'); }}
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      className="s-chip"
                      icon={<Check size={17} strokeWidth={3} />}
                      loading={isSaving}
                      disabled={usernameStatus === 'checking' || usernameStatus === 'invalid' || usernameStatus === 'taken'}
                      onClick={handleSaveProfile}
                    >
                      {t.save}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="s-display text-[clamp(21px,3vw,28px)] font-bold leading-tight">{profile?.displayName}</h2>
                    {profile?.username && <p className="mt-1 text-[14.5px] font-bold text-on-surface-variant">@{profile.username}</p>}

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                      <Chip status="primary" icon={<GraduationCap size={14} strokeWidth={3} />}>{t.student}</Chip>
                      {myCenters.map((c) => (
                        <Link key={c.centerId} href="/center">
                          <Chip status="info" icon={<Building2 size={14} strokeWidth={3} />} className="transition-opacity hover:opacity-80">{c.name || t.student}</Chip>
                        </Link>
                      ))}
                      {profile?.gender && (
                        <Chip
                          status={profile.gender === 'male' ? 'info' : 'error'}
                          title={profile.gender === 'male' ? t.genders.male : t.genders.female}
                          aria-label={profile.gender === 'male' ? t.genders.male : t.genders.female}
                        >
                          {profile.gender === 'male' ? <UserIcon size={14} strokeWidth={3} /> : <Smile size={14} strokeWidth={3} />}
                        </Chip>
                      )}
                    </div>

                    {profile?.bio ? (
                      <p className="mx-auto mt-4 max-w-lg break-words rounded-m3-md bg-state-hover px-5 py-4 text-[14px] font-bold leading-relaxed text-on-surface-variant md:mx-0">
                        {profile.bio}
                      </p>
                    ) : (
                      <p className="mt-4 text-[13px] font-bold italic text-on-surface-variant">{t.labels.notProvided} {t.labels.bio.toLowerCase()}</p>
                    )}
                  </div>

                  {/* 🟢 CLICKABLE SOCIAL STATS */}
                  <div className="grid shrink-0 grid-cols-2 gap-2 xl:w-64">
                    {([
                      { key: 'following' as const, label: t.social.following, value: profile?.followingCount || 0 },
                      { key: 'followers' as const, label: t.social.followers, value: profile?.followersCount || 0 },
                    ]).map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSocialListType(s.key)}
                        className="s-press rounded-m3-md bg-state-hover px-4 py-3 text-center hover:bg-state-press"
                      >
                        <span className="s-display s-num block text-[26px] font-bold leading-none">{s.value}</span>
                        <span className="mt-1.5 block text-[10.5px] font-black uppercase tracking-[0.09em] text-on-surface-variant">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 2. DETAILS GRID */}
        <div className="grid gap-s-gap md:grid-cols-2">
          <ListGroup header={<span className="inline-flex items-center gap-2"><Mail size={14} strokeWidth={3} /> {t.sections.personal}</span>}>
            <ListRow title={t.labels.email} trailing={<InfoValue value={user?.email} fallback={t.labels.notProvided} />} />
            <ListRow title={t.labels.phone} trailing={<InfoValue value={profile?.phone} fallback={t.labels.notProvided} />} />
            <ListRow title={t.labels.birthDate} trailing={<InfoValue value={profile?.birthDate} fallback={t.labels.notProvided} />} />
          </ListGroup>
          <ListGroup header={<span className="inline-flex items-center gap-2"><BookOpen size={14} strokeWidth={3} /> {t.sections.education}</span>}>
            <ListRow title={t.labels.school} trailing={<InfoValue value={profile?.institution || profile?.institutionName} fallback={t.labels.notProvided} />} />
            <ListRow title={t.labels.grade} trailing={<InfoValue value={formatGrade(profile?.grade, lang)} fallback={t.labels.notProvided} />} />
            <ListRow title={t.labels.location} trailing={<InfoValue value={[profile?.location?.district, profile?.location?.region].filter(Boolean).join(', ')} fallback={t.labels.notProvided} />} />
          </ListGroup>
        </div>

        {/* 3. GAMIFICATION STATS */}
        <section>
          <h3 className="mb-3 px-1 text-[12px] font-black uppercase tracking-[0.1em] text-on-surface-variant">{t.sections.stats}</h3>
          <StatBand
            stats={[
              { label: t.stats.xp, value: profile?.totalXP || 0 },
              { label: t.stats.streak, value: profile?.currentStreak || 0 },
              { label: t.stats.level, value: currentLevel },
            ]}
          />
          <div className="mt-s-gap grid gap-s-gap md:grid-cols-2">
            {/* Level is derived — floor(totalXP/1000)+1 — so the bar shows the XP inside it. */}
            <Card className="flex items-center">
              <XpProgress level={currentLevel} current={xpIntoLevel} target={1000} levelLabel={t.stats.level} />
            </Card>
            <Card>
              <StreakDisplay
                days={profile?.currentStreak || 0}
                activeDays={activeDays}
                dayKeys={weekKeys}
                dayLabels={chartData.map((d) => d.name.slice(0, 2))}
                todayKey={xpDayKey()}
                label={t.stats.streak}
              />
            </Card>
          </div>
        </section>

        {/* 4. RECHARTS ACTIVITY GRAPH */}
        <Card>
          <div className="mb-5 flex items-center gap-2">
            <Activity size={19} strokeWidth={3} className="text-primary" />
            <h3 className="s-display text-[16px] font-bold">{t.sections.activity}</h3>
          </div>
          {/* Chart colors are the live theme tokens, so the graph follows the
              palette and the light/dark mode with no JS. */}
          <ChartFrame className="relative mt-2 h-[220px] w-full">
            {({ width, height }) => (
              <AreaChart width={width} height={height} data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs><linearGradient id="colorXPProfile" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--m3-primary)" stopOpacity={0.4}/><stop offset="95%" stopColor="var(--m3-primary)" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--m3-on-surface-variant)', fontWeight: 900 }} dy={10} />
                <YAxis hide={true} domain={[0, 'dataMax + 50']} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--m3-inverse-surface)', borderRadius: 'var(--m3-shape-sm)', border: 'none', color: 'var(--m3-inverse-on-surface)', fontWeight: '900', fontSize: '14px', padding: '10px 16px' }} itemStyle={{ color: 'var(--m3-inverse-on-surface)' }} cursor={{ stroke: 'var(--m3-outline-variant)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="XP" stroke="var(--m3-primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorXPProfile)" activeDot={{ r: 6, fill: 'var(--m3-primary)', stroke: 'var(--m3-surface)', strokeWidth: 3 }} />
              </AreaChart>
            )}
          </ChartFrame>
        </Card>

        {/* 5. DANGER ZONE */}
        <Button
          fullWidth
          variant="outlined"
          tone="error"
          size="lg"
          icon={<LogOut size={19} strokeWidth={2.6} />}
          onClick={() => setShowLogoutModal(true)}
        >
          {t.logout}
        </Button>

      </Stack>

      {/* --- CROPPER DIALOG --- */}
      <Dialog
        open={!!imgSrc}
        onClose={() => { if (!isUploading) setImgSrc(''); }}
        title={t.photo.cropTitle}
        actions={
          <>
            <Button variant="text" onClick={() => setImgSrc('')} disabled={isUploading}>{t.cancel}</Button>
            <Button icon={<Check size={17} strokeWidth={3} />} loading={isUploading} onClick={handleUploadCroppedImage}>{t.photo.apply}</Button>
          </>
        }
      >
        <div className="flex max-h-[50vh] items-center justify-center overflow-hidden rounded-m3-sm bg-surface-container-highest">
          <ReactCrop crop={crop} onChange={(_, p) => setCrop(p)} onComplete={(c) => setCompletedCrop(c)} aspect={1} circularCrop className="max-h-full">
            <img ref={imgRef} src={imgSrc} alt="Crop preview" onLoad={onImageLoad} className="max-h-[50vh] object-contain" />
          </ReactCrop>
        </div>
      </Dialog>

      {/* 🟢 THE INFINITE SCROLL SOCIAL DIALOG */}
      <Dialog
        open={socialListType !== null}
        onClose={() => setSocialListType(null)}
        sheetOnMobile
        className="max-w-md"
        title={socialListType === 'followers' ? t.social.followers : t.social.following}
      >
        <div onScroll={handleScroll} className="max-h-[58vh] min-h-[220px] overflow-y-auto">
          {socialUsers.length === 0 && !isLoadingSocial ? (
            <EmptyState icon={<Users size={26} strokeWidth={2.4} />} title={t.social.emptyList} />
          ) : (
            <ListGroup>
              {socialUsers.map((u) => (
                <ListRow
                  key={u.id}
                  clickable
                  onClick={() => { setSocialListType(null); router.push(`/profile/${u.id}`); }}
                  leading={<Avatar src={u.photoURL} name={u.displayName || 'Student'} size="lg" />}
                  title={u.displayName || 'Student'}
                  subtitle={u.username ? `@${u.username}` : undefined}
                  trailing={
                    socialListType === 'following' ? (
                      <Button
                        size="sm"
                        variant="text"
                        tone="error"
                        className="shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleUnfollow(u.id); }}
                      >
                        {t.social.unfollow}
                      </Button>
                    ) : (
                      <IconButton
                        aria-label={t.social.remove}
                        title={t.social.remove}
                        tone="error"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFollower(u.id); }}
                      >
                        <UserMinus size={18} strokeWidth={2.5} />
                      </IconButton>
                    )
                  }
                />
              ))}
            </ListGroup>
          )}

          {isLoadingSocial && (
            <div className="flex justify-center py-6"><Spinner /></div>
          )}
        </div>
      </Dialog>

      {/* FULL-SCREEN PHOTO VIEWER */}
      <Dialog
        open={showPhotoViewer && !!avatarUrl}
        onClose={() => setShowPhotoViewer(false)}
        className="max-w-sm overflow-hidden p-0"
      >
        <div className="relative aspect-square w-full">
          <img src={avatarUrl || ''} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <IconButton aria-label={t.cancel} variant="filled" onClick={() => setShowPhotoViewer(false)}>
              <X size={18} strokeWidth={3} />
            </IconButton>
            <IconButton aria-label={t.social.remove} variant="filled" tone="error" onClick={handleDeletePhoto} disabled={isUploading}>
              {isUploading ? <Spinner size={18} /> : <Trash2 size={17} strokeWidth={2.5} />}
            </IconButton>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => { signOut(auth); setShowLogoutModal(false); }}
        title={t.logoutConfirm.title}
        description={t.logoutConfirm.desc}
        cancelLabel={t.logoutConfirm.cancel}
        confirmLabel={t.logoutConfirm.confirm}
        destructive
        icon={
          <div className="grid h-14 w-14 place-items-center rounded-full bg-error-container text-on-error-container">
            <LogOut size={26} strokeWidth={2.6} />
          </div>
        }
      />

    </Page>
  );
}

/** Google's "G" — the brand mark, so its four colours are the logo's own. */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-[18px] w-[18px]">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}
