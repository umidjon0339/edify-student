'use client';

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { X, UploadCloud, Loader2, File as FileIcon, Link as LinkIcon, Folder, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATION DICTIONARY ---
const UPLOAD_MODAL_TRANSLATIONS = {
  uz: {
    toasts: { noTitle: "Sarlavha kiriting.", noFile: "Fayl tanlang.", noUrl: "To'g'ri havola kiriting.", notLoggedIn: "Tizimga kiring.", linkSuccess: "Havola qo'shildi!", uploadFailed: "Yuklashda xatolik!", fileSuccess: "Material yuklandi!", saveFailed: "Saqlashda xatolik." },
    modalTitle: "Material Qo'shish", modes: { file: "Fayl Yuklash", link: "Tashqi Havola" },
    form: { title: "Sarlavha", titlePlaceholder: "Masalan: 1-bob PDF", topic: "Mavzu (Ixtiyoriy)", topicPlaceholder: "Masalan: 1-hafta", description: "Tavsif (Ixtiyoriy)", descPlaceholder: "Ko'rsatmalar qo'shing...", url: "Havola (URL)", urlPlaceholder: "https://youtube.com/..." },
    dropzone: { select: "Fayl tanlash uchun bosing", types: "PDF, Rasm yoki Video fayllar", change: "Boshqa fayl tanlash" },
    progress: "Yuklanmoqda...", buttons: { save: "Materialni Saqlash", saving: "Saqlanmoqda..." }
  },
  en: {
    toasts: { noTitle: "Provide a title.", noFile: "Select a file.", noUrl: "Provide a valid URL.", notLoggedIn: "Please log in.", linkSuccess: "Link added!", uploadFailed: "Upload failed!", fileSuccess: "Material uploaded!", saveFailed: "Failed to save." },
    modalTitle: "Add Material", modes: { file: "Upload File", link: "External Link" },
    form: { title: "Title", titlePlaceholder: "e.g. Chapter 1 PDF", topic: "Topic (Optional)", topicPlaceholder: "e.g. Week 1", description: "Description (Optional)", descPlaceholder: "Add instructions...", url: "URL / Link", urlPlaceholder: "https://youtube.com/..." },
    dropzone: { select: "Click to select a file", types: "PDF, Image, or Video files", change: "Change file" },
    progress: "Uploading...", buttons: { save: "Save Material", saving: "Saving..." }
  },
  ru: {
    toasts: { noTitle: "Введите заголовок.", noFile: "Выберите файл.", noUrl: "Введите ссылку.", notLoggedIn: "Войдите в систему.", linkSuccess: "Ссылка добавлена!", uploadFailed: "Ошибка загрузки!", fileSuccess: "Материал загружен!", saveFailed: "Ошибка сохранения." },
    modalTitle: "Добавить Материал", modes: { file: "Загрузить Файл", link: "Внешняя Ссылка" },
    form: { title: "Заголовок", titlePlaceholder: "Напр. Глава 1 PDF", topic: "Тема (Необяз.)", topicPlaceholder: "Напр. Неделя 1", description: "Описание (Необяз.)", descPlaceholder: "Добавьте инструкции...", url: "Ссылка (URL)", urlPlaceholder: "https://youtube.com/..." },
    dropzone: { select: "Нажмите, чтобы выбрать файл", types: "PDF, Изображение или Видео", change: "Изменить файл" },
    progress: "Загрузка...", buttons: { save: "Сохранить", saving: "Сохранение..." }
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
  const { lang } = useTeacherLanguage();
  const t = UPLOAD_MODAL_TRANSLATIONS[lang] || UPLOAD_MODAL_TRANSLATIONS['en'];

  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState(''); 
  const [linkUrl, setLinkUrl] = useState(''); 
  const [file, setFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) return toast.error(t.toasts.noTitle);
    if (uploadMode === 'file' && !file) return toast.error(t.toasts.noFile);
    if (uploadMode === 'link' && !linkUrl.trim()) return toast.error(t.toasts.noUrl);
    if (!user) return toast.error(t.toasts.notLoggedIn);

    setIsUploading(true);

    try {
      if (uploadMode === 'link') {
        await addDoc(collection(db, 'classes', classId, 'materials'), {
          classId, title: title.trim(), description: description.trim(), topicId: topic.trim() || null, 
          orderIndex: Date.now(), isExternal: true, externalUrl: linkUrl.trim(), fileType: 'link',       
          fileSize: 0, fileExtension: '', fileUrl: linkUrl.trim(), storagePath: null,      
          createdAt: serverTimestamp(), uploaderId: user.uid, isVisible: true, isArchived: false, viewCount: 0, downloadCount: 0
        });
        toast.success(t.toasts.linkSuccess);
        handleClose();
      } 
      else if (uploadMode === 'file' && file) {
        const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2)}${fileExtension}`;
        const storagePath = `classes/${classId}/materials/${uniqueFileName}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
          (snapshot) => setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
          (error) => { toast.error(t.toasts.uploadFailed); setIsUploading(false); },
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(db, 'classes', classId, 'materials'), {
              classId, title: title.trim(), description: description.trim(), topicId: topic.trim() || null, 
              orderIndex: Date.now(), isExternal: false, externalUrl: null,      
              fileType: getFileType(file.type), fileSize: file.size, fileExtension,
              fileUrl: downloadUrl, storagePath: storagePath, 
              createdAt: serverTimestamp(), uploaderId: user.uid, isVisible: true, isArchived: false, viewCount: 0, downloadCount: 0
            });
            toast.success(t.toasts.fileSuccess);
            handleClose();
          }
        );
      }
    } catch (err) {
      toast.error(t.toasts.saveFailed);
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null); setTitle(''); setDescription(''); setTopic(''); setLinkUrl('');
    setProgress(0); setIsUploading(false); onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Premium Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={!isUploading ? handleClose : undefined}></div>
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
               <Cloud size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-black text-slate-900 tracking-tight">{t.modalTitle}</h2>
          </div>
          <button 
            onClick={handleClose} disabled={isUploading}
            className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0 disabled:opacity-50"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#FAFAFA] space-y-6 custom-scrollbar">
          
          {/* Segmented Tabs */}
          <div className="flex p-1.5 bg-slate-200/50 rounded-[1rem] shadow-inner">
            <button 
              onClick={() => setUploadMode('file')} disabled={isUploading}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-bold rounded-xl transition-all ${uploadMode === 'file' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800 disabled:opacity-50'}`}
            >
              <FileIcon size={14}/> {t.modes.file}
            </button>
            <button 
              onClick={() => setUploadMode('link')} disabled={isUploading}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-bold rounded-xl transition-all ${uploadMode === 'link' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800 disabled:opacity-50'}`}
            >
              <LinkIcon size={14}/> {t.modes.link}
            </button>
          </div>

          {/* Title & Topic Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.form.title} <span className="text-red-500">*</span></label>
              <input 
                type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={isUploading} placeholder={t.form.titlePlaceholder} 
                className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[14px] font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm disabled:opacity-50" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Folder size={12}/> {t.form.topic}</label>
              <input 
                type="text" value={topic} onChange={e => setTopic(e.target.value)} disabled={isUploading} placeholder={t.form.topicPlaceholder} 
                className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[14px] font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm disabled:opacity-50" 
              />
            </div>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.form.description}</label>
            <textarea 
              value={description} onChange={e => setDescription(e.target.value)} disabled={isUploading} rows={2} placeholder={t.form.descPlaceholder} 
              className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none transition-all shadow-sm disabled:opacity-50" 
            />
          </div>

          {/* DYNAMIC INPUT: Link OR File */}
          <div className="pt-2 border-t border-slate-200/60">
            {uploadMode === 'link' ? (
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.form.url} <span className="text-red-500">*</span></label>
                <div className="relative group">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16}/>
                  <input 
                    type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} disabled={isUploading} placeholder={t.form.urlPlaceholder} 
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[14px] font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm disabled:opacity-50" 
                  />
                </div>
              </div>
            ) : (
              <div className="relative">
                <input type="file" id="file-upload" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} disabled={isUploading} />
                <label 
                  htmlFor="file-upload" 
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-[1.2rem] cursor-pointer transition-all relative overflow-hidden group ${
                    file 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-blue-300'
                  } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {/* Subtle hover flare */}
                  {!file && <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>}

                  {file ? (
                    <div className="text-center relative z-10 flex flex-col items-center">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2 text-blue-600">
                        <FileIcon size={20} strokeWidth={2.5} />
                      </div>
                      <p className="text-[13px] font-black text-slate-800 truncate px-4 max-w-[250px]">{file.name}</p>
                      <p className="text-[11px] font-bold text-blue-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB • <span className="underline decoration-blue-200 hover:decoration-blue-500">{t.dropzone.change}</span></p>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 relative z-10">
                      <UploadCloud className="mx-auto mb-2 text-slate-400 group-hover:text-blue-500 transition-colors group-hover:-translate-y-1 duration-300" size={28} />
                      <p className="text-[13px] font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{t.dropzone.select}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{t.dropzone.types}</p>
                    </div>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && uploadMode === 'file' && (
            <div className="pt-2 animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-blue-500"/> {t.progress}</span>
                <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 md:px-8 py-4 bg-white border-t border-slate-100 flex justify-end shrink-0">
          <button 
            onClick={handleSave} 
            disabled={isUploading || !title.trim()} 
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex justify-center items-center gap-2 active:scale-95 text-[14px]"
          >
            {isUploading ? <Loader2 className="animate-spin" size={18}/> : <Cloud size={18} strokeWidth={2.5}/>}
            {isUploading ? t.buttons.saving : t.buttons.save}
          </button>
        </div>
      </div>
    </div>
  );
}