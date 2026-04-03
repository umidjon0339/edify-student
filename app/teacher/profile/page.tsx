'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/lib/AuthContext';
import { 
  User, MapPin, Briefcase, Calendar, Settings, 
  Mail, Phone, ShieldCheck, Globe, BookOpen,
  GraduationCap, Award, Loader2, ArrowRight,
  Camera, Trash2, X, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout'; 

// 🟢 NEW IMPORTS FOR CROPPER
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// --- 1. TRANSLATION DICTIONARY ---
const PROFILE_TRANSLATIONS = {
  uz: {
    notFound: "Profil topilmadi.", edit: "Profilni Tahrirlash", verified: "Tasdiqlangan", instructor: "O'qituvchi", student: "O'quvchi", contactTitle: "Aloqa Ma'lumotlari", email: "Email", phone: "Telefon", notProvided: "Kiritilmagan", workTitle: "Joylashuv va Ish", institution: "Muassasa", location: "Joylashuv", accountTitle: "Hisob Statistikasi", tests: "Testlar", classes: "Sinflar", students: "O'quvchilar", joined: "Qo'shilgan Yili",
    photo: { uploading: "Yuklanmoqda...", updated: "Rasm yangilandi!", deleted: "Rasm o'chirildi!", errUpload: "Rasm yuklashda xatolik", errDelete: "O'chirishda xatolik", viewFull: "To'liq ko'rish", cropTitle: "Rasmni Kesish", apply: "Saqlash", cancel: "Bekor qilish" }
  },
  en: {
    notFound: "Profile not found.", edit: "Edit Profile", verified: "Verified", instructor: "Instructor", student: "Student", contactTitle: "Contact Details", email: "Email", phone: "Phone", notProvided: "Not provided", workTitle: "Location & Work", institution: "Institution", location: "Location", accountTitle: "Account Statistics", tests: "Tests", classes: "Classes", students: "Students", joined: "Joined",
    photo: { uploading: "Uploading...", updated: "Photo updated!", deleted: "Photo deleted!", errUpload: "Failed to upload", errDelete: "Failed to delete", viewFull: "View Full Photo", cropTitle: "Crop Photo", apply: "Apply", cancel: "Cancel" }
  },
  ru: {
    notFound: "Профиль не найден.", edit: "Редактировать", verified: "Подтвержден", instructor: "Преподаватель", student: "Ученик", contactTitle: "Контактные Данные", email: "Email", phone: "Телефон", notProvided: "Не указано", workTitle: "Место и Работа", institution: "Учреждение", location: "Локация", accountTitle: "Статистика Аккаунта", tests: "Тесты", classes: "Классы", students: "Ученики", joined: "Год регистр.",
    photo: { uploading: "Загрузка...", updated: "Фото обновлено!", deleted: "Фото удалено!", errUpload: "Ошибка загрузки", errDelete: "Ошибка удаления", viewFull: "Смотреть полностью", cropTitle: "Обрезать фото", apply: "Применить", cancel: "Отмена" }
  }
};

export default function TeacherProfilePage() {
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = PROFILE_TRANSLATIONS[lang as keyof typeof PROFILE_TRANSLATIONS] || PROFILE_TRANSLATIONS['uz'];

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 🟢 Photo & Cropper States
  const [isUploading, setIsUploading] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) setProfile(snap.data());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // 🟢 1. HANDLE FILE SELECTION
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file); // Save the file to check its size later
      
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
    }
  };

  // Auto-center the crop box when image loads
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const cropSize = Math.min(width, height) * 0.9;
    const crop = centerCrop(makeAspectCrop({ unit: 'px', width: cropSize }, 1, width, height), width, height);
    setCrop(crop);
  };

  // 🟢 2. SMART COMPRESS & UPLOAD CROPPED IMAGE
  const handleUploadCroppedImage = async () => {
    if (!completedCrop || !imgRef.current || !user || !selectedFile) return;
    
    setIsUploading(true);
    try {
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      // Calculate the ACTUAL pixel dimensions of the cropped area
      let cropPixelWidth = completedCrop.width * scaleX;
      let cropPixelHeight = completedCrop.height * scaleY;

      const originalKb = selectedFile.size / 1024;
      let outputQuality = 0.95; // Default high quality

      // --- APPLY YOUR CUSTOM COMPRESSION LOGIC ---
      if (originalKb > 1024) {
        // If > 1MB: Reduce quality and cap resolution to 800x800 to force < 200KB
        outputQuality = 0.75;
        if (cropPixelWidth > 800) {
          const ratio = 800 / cropPixelWidth;
          cropPixelWidth = 800;
          cropPixelHeight = cropPixelHeight * ratio;
        }
      } else if (originalKb > 200) {
        // If between 200KB and 1MB: Apply gentle compression, cap at 1024x1024
        outputQuality = 0.85;
        if (cropPixelWidth > 1024) {
          const ratio = 1024 / cropPixelWidth;
          cropPixelWidth = 1024;
          cropPixelHeight = cropPixelHeight * ratio;
        }
      } else {
        // If < 200KB: Do not compress at all (1.0 quality), keep exact crop resolution
        outputQuality = 1.0;
      }

      canvas.width = cropPixelWidth;
      canvas.height = cropPixelHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');

      // Draw the high-res cropped image
      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0, 0, canvas.width, canvas.height
      );

      // Convert to blob using our dynamic quality setting
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas is empty'));
        }, 'image/jpeg', outputQuality);
      });

      // Upload to Firebase
      const storageRef = ref(storage, `profile_images/${user.uid}.jpg`);
      await uploadBytes(storageRef, blob);
      
      const downloadUrl = await getDownloadURL(storageRef);
      const finalUrl = `${downloadUrl}&t=${Date.now()}`;

      await updateDoc(doc(db, 'users', user.uid), { photoURL: finalUrl });
      await updateProfile(user, { photoURL: finalUrl });

      setProfile((prev: any) => ({ ...prev, photoURL: finalUrl }));
      toast.success(t.photo.updated);
      
      setImgSrc(''); 
      setSelectedFile(null); // Clear file
    } catch (error) {
      console.error(error);
      toast.error(t.photo.errUpload);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  // 🟢 PHOTO DELETE LOGIC
  const handleDeletePhoto = async () => {
    if (!user) return;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profile_images/${user.uid}.jpg`);
      try { await deleteObject(storageRef); } catch (e) { /* ignore if missing */ }

      await updateDoc(doc(db, 'users', user.uid), { photoURL: null });
      await updateProfile(user, { photoURL: "" });

      setProfile((prev: any) => ({ ...prev, photoURL: null }));
      setShowPhotoViewer(false);
      toast.success(t.photo.deleted);
    } catch (error) {
      console.error(error);
      toast.error(t.photo.errDelete);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return <div className="min-h-[100dvh] bg-[#FAFAFA] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;
  }

  if (!profile) return null;

  const joinYear = profile.createdAt 
    ? (profile.createdAt.toDate ? new Date(profile.createdAt.toDate()).getFullYear() : new Date(profile.createdAt).getFullYear())
    : '-';

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      {/* Hidden File Input */}
      <input type="file" accept="image/jpeg, image/png, image/webp" ref={fileInputRef} className="hidden" onChange={onSelectFile} />

      {/* ========================================================================= */}
      {/* ✂️ IMAGE CROPPER MODAL */}
      {/* ========================================================================= */}
      {imgSrc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isUploading && setImgSrc('')}></div>
          <div className="relative bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900">{t.photo.cropTitle}</h3>
              <button onClick={() => setImgSrc('')} disabled={isUploading} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="w-full max-h-[60vh] overflow-hidden bg-slate-100 rounded-xl flex items-center justify-center mb-6">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1} // Forces a perfect square
                circularCrop // Shows a circle overlay for profile pics
                className="max-h-full"
              >
                <img ref={imgRef} src={imgSrc} alt="Crop preview" onLoad={onImageLoad} className="max-h-[60vh] object-contain" />
              </ReactCrop>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setImgSrc('')} disabled={isUploading} className="px-5 py-2.5 text-[14px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">
                {t.photo.cancel}
              </button>
              <button onClick={handleUploadCroppedImage} disabled={isUploading} className="px-6 py-2.5 text-[14px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center gap-2">
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                {t.photo.apply}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🖼️ PROFILE UI */}
      {/* ========================================================================= */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* --- 1. PREMIUM HERO CARD --- */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-violet-400/20 blur-3xl rounded-full translate-y-4 scale-95 opacity-60"></div>
          
          <div className="relative bg-white border border-slate-200/80 rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            
            {/* AVATAR */}
            <div className="relative group shrink-0">
              <div 
                onClick={() => profile.photoURL && !isUploading ? setShowPhotoViewer(true) : null}
                className={`w-32 h-32 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-xl shadow-indigo-500/20 flex items-center justify-center relative overflow-hidden transition-transform duration-300 ${profile.photoURL ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
              >
                <div className="w-full h-full bg-white rounded-full overflow-hidden flex items-center justify-center border-4 border-white relative">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-black text-indigo-600 bg-indigo-50 w-full h-full flex items-center justify-center">
                      {profile.displayName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                  {isUploading && <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center"><Loader2 className="animate-spin text-white" size={28} /></div>}
                </div>
              </div>

              {/* CAMERA BUTTON */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-1 right-1 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center border-4 border-white shadow-md transition-transform active:scale-90 disabled:opacity-50 z-10"
              >
                <Camera size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left mt-2 md:mt-0 w-full">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-1">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">{profile.displayName}</h1>
                    {profile.verifiedTeacher && (
                      <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-emerald-100/50 shrink-0">
                        <ShieldCheck size={12} strokeWidth={3} /> {t.verified}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 font-bold text-[14px] mb-4">@{profile.username}</p>
                </div>

                <Link href="/teacher/settings" className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-[13px] shadow-sm transition-all active:scale-95 shrink-0">
                  <Settings size={16} /> {t.edit}
                </Link>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-[12px] font-bold rounded-lg border border-indigo-100/50">
                  <GraduationCap size={14} /> {profile.role === 'teacher' ? t.instructor : t.student}
                </span>
              </div>

              {profile.bio && <p className="text-slate-600 font-medium text-[14px] leading-relaxed max-w-2xl bg-slate-50 p-4 rounded-[1rem] border border-slate-100/80">{profile.bio}</p>}
            </div>
          </div>
        </div>

        {/* --- 2. DETAILS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/80 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-[12px] flex items-center justify-center text-blue-600 border border-blue-100/50"><Mail size={20} /></div>
              <h3 className="font-black text-slate-800 text-[16px]">{t.contactTitle}</h3>
            </div>
            <div className="space-y-5">
              <div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.email}</p><p className="text-slate-800 font-bold text-[14px] truncate">{profile.email}</p></div>
              <div className="h-px w-full bg-slate-100"></div>
              <div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.phone}</p><p className="text-slate-800 font-bold text-[14px]">{profile.phone || <span className="text-slate-400 font-medium italic">{t.notProvided}</span>}</p></div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/80 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-50 rounded-[12px] flex items-center justify-center text-purple-600 border border-purple-100/50"><Globe size={20} /></div>
              <h3 className="font-black text-slate-800 text-[16px]">{t.workTitle}</h3>
            </div>
            <div className="space-y-5">
              <div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.institution}</p><p className="text-slate-800 font-bold text-[14px] truncate">{profile.institution || <span className="text-slate-400 font-medium italic">{t.notProvided}</span>}</p></div>
              <div className="h-px w-full bg-slate-100"></div>
              <div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.location}</p><p className="text-slate-800 font-bold text-[14px] truncate">{[profile.location?.district, profile.location?.region, profile.location?.country].filter(Boolean).join(', ') || <span className="text-slate-400 font-medium italic">{t.notProvided}</span>}</p></div>
            </div>
          </div>
        </div>

        {/* --- 3. VIBRANT STATS GRID (NOW USING REAL DATA) --- */}
        <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-indigo-100/50 transition-colors duration-500"></div>
          
          <div className="relative z-10 flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-amber-50 rounded-[12px] flex items-center justify-center text-amber-500 border border-amber-100/50"><Award size={22} /></div>
            <h3 className="font-black text-slate-800 text-[16px]">{t.accountTitle}</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative z-10">
            <div className="p-5 bg-slate-50/80 rounded-[1.5rem] border border-slate-100 text-center hover:bg-white hover:shadow-sm transition-all duration-300 hover:border-indigo-100">
              <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent mb-1">
                {profile.customTestCount || 0}
              </p>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.tests}</p>
            </div>
            <div className="p-5 bg-slate-50/80 rounded-[1.5rem] border border-slate-100 text-center hover:bg-white hover:shadow-sm transition-all duration-300 hover:border-indigo-100">
              <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent mb-1">
                {profile.activeClassCount || 0}
              </p>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.classes}</p>
            </div>
            <div className="p-5 bg-slate-50/80 rounded-[1.5rem] border border-slate-100 text-center hover:bg-white hover:shadow-sm transition-all duration-300 hover:border-indigo-100">
              <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent mb-1">
                {profile.totalStudents || 0}
              </p>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.students}</p>
            </div>
            <div className="p-5 bg-slate-50/80 rounded-[1.5rem] border border-slate-100 text-center hover:bg-white hover:shadow-sm transition-all duration-300 hover:border-emerald-100">
              <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent mb-1">
                {joinYear}
              </p>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.joined}</p>
            </div>
          </div>
        </div>

      </div>

      {/* 🟢 FULL-SCREEN PHOTO VIEWER MODAL */}
      {showPhotoViewer && profile.photoURL && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setShowPhotoViewer(false)}></div>
          <div className="relative w-full max-w-lg aspect-square rounded-[2rem] bg-black overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95">
            <img src={profile.photoURL} alt="Full Profile" className="w-full h-full object-cover" />
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
              <button onClick={() => setShowPhotoViewer(false)} className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 backdrop-blur-md transition-colors"><X size={20} strokeWidth={2.5}/></button>
              <button onClick={handleDeletePhoto} disabled={isUploading} className="w-10 h-10 rounded-full bg-black/40 text-red-400 hover:text-red-500 hover:bg-red-500/20 flex items-center justify-center backdrop-blur-md transition-colors disabled:opacity-50">
                {isUploading ? <Loader2 size={18} className="animate-spin text-white"/> : <Trash2 size={18} strokeWidth={2.5}/>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}