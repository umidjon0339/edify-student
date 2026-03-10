'use client';

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { X, UploadCloud, Loader2, File as FileIcon, Link as LinkIcon, Folder } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';
import { useTeacherLanguage } from '@/app/teacher/layout'; // 🟢 Added language hook

// --- 1. TRANSLATION DICTIONARY ---
const UPLOAD_MODAL_TRANSLATIONS = {
  uz: {
    toasts: {
      noTitle: "Iltimos, sarlavha kiriting.",
      noFile: "Iltimos, fayl tanlang.",
      noUrl: "Iltimos, to'g'ri havola kiriting.",
      notLoggedIn: "Tizimga kirishingiz kerak.",
      linkSuccess: "Havola muvaffaqiyatli qo'shildi!",
      uploadFailed: "Yuklashda xatolik yuz berdi!",
      fileSuccess: "Material yuklandi!",
      saveFailed: "Ma'lumotlar bazasiga saqlashda xatolik."
    },
    modalTitle: "Material Qo'shish",
    modes: { file: "Fayl Yuklash", link: "Tashqi Havola" },
    form: {
      title: "Sarlavha", titlePlaceholder: "Masalan: 1-bob PDF",
      topic: "Mavzu (Ixtiyoriy)", topicPlaceholder: "Masalan: 1-hafta",
      description: "Tavsif (Ixtiyoriy)", descPlaceholder: "Ko'rsatmalar qo'shing...",
      url: "Havola (URL)", urlPlaceholder: "https://youtube.com/..."
    },
    dropzone: { select: "Fayl tanlang", types: "PDF, Rasm, Video" },
    progress: "Yuklanmoqda...",
    buttons: { save: "Materialni Saqlash", saving: "Saqlanmoqda..." }
  },
  en: {
    toasts: {
      noTitle: "Please provide a title.",
      noFile: "Please select a file.",
      noUrl: "Please provide a valid URL.",
      notLoggedIn: "You must be logged in.",
      linkSuccess: "Link added successfully!",
      uploadFailed: "Upload failed!",
      fileSuccess: "Material uploaded!",
      saveFailed: "Failed to save to database."
    },
    modalTitle: "Add Material",
    modes: { file: "Upload File", link: "External Link" },
    form: {
      title: "Title", titlePlaceholder: "e.g. Chapter 1 PDF",
      topic: "Topic (Optional)", topicPlaceholder: "e.g. Week 1",
      description: "Description (Optional)", descPlaceholder: "Add instructions...",
      url: "URL / Link", urlPlaceholder: "https://youtube.com/..."
    },
    dropzone: { select: "Select a file", types: "PDF, Image, Video" },
    progress: "Uploading...",
    buttons: { save: "Save Material", saving: "Saving..." }
  },
  ru: {
    toasts: {
      noTitle: "Пожалуйста, введите заголовок.",
      noFile: "Пожалуйста, выберите файл.",
      noUrl: "Пожалуйста, введите корректную ссылку.",
      notLoggedIn: "Вы должны войти в систему.",
      linkSuccess: "Ссылка успешно добавлена!",
      uploadFailed: "Ошибка загрузки!",
      fileSuccess: "Материал загружен!",
      saveFailed: "Не удалось сохранить в базу данных."
    },
    modalTitle: "Добавить Материал",
    modes: { file: "Загрузить Файл", link: "Внешняя Ссылка" },
    form: {
      title: "Заголовок", titlePlaceholder: "Напр. Глава 1 PDF",
      topic: "Тема (Необязательно)", topicPlaceholder: "Напр. Неделя 1",
      description: "Описание (Необязательно)", descPlaceholder: "Добавьте инструкции...",
      url: "Ссылка (URL)", urlPlaceholder: "https://youtube.com/..."
    },
    dropzone: { select: "Выберите файл", types: "PDF, Изображение, Видео" },
    progress: "Загрузка...",
    buttons: { save: "Сохранить", saving: "Сохранение..." }
  }
};

interface Props {
  classId: string;
  isOpen: boolean;
  onClose: () => void;
}

const getFileType = (mimeType: string) => {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('video')) return 'video';
  return 'document';
};

export default function UploadMaterialModal({ classId, isOpen, onClose }: Props) {
  const { user } = useAuth();
  
  // 🟢 Hook into Teacher Language
  const { lang } = useTeacherLanguage();
  const t = UPLOAD_MODAL_TRANSLATIONS[lang];

  // New UI States
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  
  // Form Data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState(''); 
  const [linkUrl, setLinkUrl] = useState(''); 
  const [file, setFile] = useState<File | null>(null);
  
  // Progress
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title) return toast.error(t.toasts.noTitle);
    if (uploadMode === 'file' && !file) return toast.error(t.toasts.noFile);
    if (uploadMode === 'link' && !linkUrl) return toast.error(t.toasts.noUrl);
    if (!user) return toast.error(t.toasts.notLoggedIn);

    setIsUploading(true);

    try {
      // --- MODE 1: EXTERNAL LINK ---
      if (uploadMode === 'link') {
        await addDoc(collection(db, 'classes', classId, 'materials'), {
          classId,
          title,
          description,
          topicId: topic || null, 
          orderIndex: Date.now(), 
          isExternal: true,       
          externalUrl: linkUrl,   
          fileType: 'link',       
          fileSize: 0,            
          fileExtension: '',
          fileUrl: linkUrl,       
          storagePath: null,      
          createdAt: serverTimestamp(),
          uploaderId: user.uid,
          isVisible: true,
          isArchived: false,
          viewCount: 0,
          downloadCount: 0
        });
        
        toast.success(t.toasts.linkSuccess);
        handleClose();
      } 
      
      // --- MODE 2: FILE UPLOAD ---
      else if (uploadMode === 'file' && file) {
        // 🛑 SAAS GATEKEEPER GOES HERE: Check usePlanLimits before allowing upload!
        
        const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2)}${fileExtension}`;
        const storagePath = `classes/${classId}/materials/${uniqueFileName}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
          (snapshot) => setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
          (error) => {
            console.error(error);
            toast.error(t.toasts.uploadFailed);
            setIsUploading(false);
          },
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(db, 'classes', classId, 'materials'), {
              classId,
              title,
              description,
              topicId: topic || null, 
              orderIndex: Date.now(), 
              isExternal: false,      
              externalUrl: null,      
              fileType: getFileType(file.type),
              fileSize: file.size,
              fileExtension,
              fileUrl: downloadUrl,
              storagePath: storagePath, 
              createdAt: serverTimestamp(),
              uploaderId: user.uid,
              isVisible: true,
              isArchived: false, 
              viewCount: 0,
              downloadCount: 0
            });
            
            toast.success(t.toasts.fileSuccess);
            handleClose();
          }
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(t.toasts.saveFailed);
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setTopic('');
    setLinkUrl('');
    setProgress(0);
    setIsUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose}></div>
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <UploadCloud className="text-indigo-600"/> {t.modalTitle}
          </h2>
          <button onClick={handleClose} disabled={isUploading} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
        </div>

        {/* Toggle File vs Link */}
        <div className="px-6 pt-5">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setUploadMode('file')} disabled={isUploading}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${uploadMode === 'file' ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileIcon size={16}/> {t.modes.file}
            </button>
            <button 
              onClick={() => setUploadMode('link')} disabled={isUploading}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${uploadMode === 'link' ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LinkIcon size={16}/> {t.modes.link}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.form.title} <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={isUploading} placeholder={t.form.titlePlaceholder} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none font-medium transition text-sm" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Folder size={12}/> {t.form.topic}</label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)} disabled={isUploading} placeholder={t.form.topicPlaceholder} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none font-medium transition text-sm" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.form.description}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} disabled={isUploading} rows={2} placeholder={t.form.descPlaceholder} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none font-medium transition resize-none text-sm" />
          </div>

          {/* DYNAMIC INPUT: Link OR File */}
          <div className="pt-2">
            {uploadMode === 'link' ? (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.form.url} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                  <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} disabled={isUploading} placeholder={t.form.urlPlaceholder} className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl outline-none font-medium transition text-sm" />
                </div>
              </div>
            ) : (
              <>
                <input type="file" id="file-upload" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} disabled={isUploading} />
                <label htmlFor="file-upload" className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${file ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}>
                  {file ? (
                    <div className="text-center">
                      <FileIcon className="mx-auto text-indigo-500 mb-2" size={28} />
                      <p className="text-sm font-bold text-indigo-900 truncate px-4 max-w-[250px]">{file.name}</p>
                      <p className="text-xs text-indigo-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500">
                      <UploadCloud className="mx-auto mb-2 opacity-50" size={28} />
                      <p className="text-sm font-bold">{t.dropzone.select}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mt-1">{t.dropzone.types}</p>
                    </div>
                  )}
                </label>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && uploadMode === 'file' && (
            <div className="pt-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                <span>{t.progress}</span><span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <button onClick={handleSave} disabled={isUploading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2">
            {isUploading ? <><Loader2 className="animate-spin" size={18}/> {t.buttons.saving}</> : t.buttons.save}
          </button>
        </div>
      </div>
    </div>
  );
}