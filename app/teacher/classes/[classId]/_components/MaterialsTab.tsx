'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, doc, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { 
  FileText, Image as ImageIcon, Video, File, Download, Trash2, 
  Eye, EyeOff, Loader2, Link as LinkIcon, ExternalLink, Folder, 
  Archive, ArchiveRestore, Edit, X, AlertTriangle, CheckCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATION DICTIONARY ---
const MATERIALS_TRANSLATIONS = {
  uz: {
    tabs: { active: "Faol Materiallar", archived: "Arxivlanganlar" },
    empty: { activeTitle: "Hozircha materiallar yo'q", activeDesc: "O'quvchilar uchun PDF, rasm, video yoki havolalar yuklang.", archiveTitle: "Arxivlangan materiallar yo'q", archiveDesc: "Arxivlangan narsalar shu yerda ko'rinadi." },
    labels: { externalLink: "TASHQI HAVOLA", new: "Yangi", view: "Ko'rish", download: "Yuklab olish", hidden: "Yashirin", visible: "Ko'rinadi" },
    tooltips: { hide: "O'quvchilardan yashirish", show: "O'quvchilarga ko'rsatish", archive: "Arxivlash", unarchive: "Arxivdan chiqarish", edit: "Tahrirlash", delete: "O'chirish" },
    toasts: { hidden: "Material yashirildi.", visible: "Material ko'rinadi.", archived: "Arxivlandi.", unarchived: "Arxivdan chiqarildi.", deleted: "O'chirildi.", updated: "Yangilandi.", error: "Xatolik yuz berdi." },
    modals: { cancel: "Bekor qilish", save: "Saqlash", confirm: "Tasdiqlash", editTitle: "Materialni Tahrirlash", titleLabel: "Sarlavha", descLabel: "Tavsif", topicLabel: "Mavzu", urlLabel: "Havola (URL)", confirmTitle: "Tasdiqlang", hideMsg: "O'quvchilardan yashirmoqchimisiz?", showMsg: "O'quvchilarga ko'rsatmoqchimisiz?", archiveMsg: "Arxivga o'tkazmoqchimisiz?", unarchiveMsg: "Arxivdan chiqarmoqchimisiz?", deleteMsg: "Butunlay o'chirib tashlamoqchimisiz?" }
  },
  en: {
    tabs: { active: "Active", archived: "Archived" },
    empty: { activeTitle: "No Materials Yet", activeDesc: "Upload PDFs, images, videos, or share links.", archiveTitle: "No Archived Materials", archiveDesc: "Archived items will appear here." },
    labels: { externalLink: "EXTERNAL LINK", new: "New", view: "View", download: "Download", hidden: "Hidden", visible: "Visible" },
    tooltips: { hide: "Hide from students", show: "Show to students", archive: "Archive", unarchive: "Unarchive", edit: "Edit", delete: "Delete" },
    toasts: { hidden: "Hidden from students.", visible: "Now visible.", archived: "Archived.", unarchived: "Unarchived.", deleted: "Deleted.", updated: "Updated.", error: "Error occurred." },
    modals: { cancel: "Cancel", save: "Save Changes", confirm: "Confirm", editTitle: "Edit Material", titleLabel: "Title", descLabel: "Description", topicLabel: "Topic", urlLabel: "URL / Link", confirmTitle: "Confirm Action", hideMsg: "Hide this material from students?", showMsg: "Show this material to students?", archiveMsg: "Move this to archive?", unarchiveMsg: "Unarchive this material?", deleteMsg: "Permanently delete this?" }
  },
  ru: {
    tabs: { active: "Активные", archived: "В архиве" },
    empty: { activeTitle: "Нет материалов", activeDesc: "Загрузите PDF, фото, видео или ссылки.", archiveTitle: "Нет архивных материалов", archiveDesc: "Здесь будут архивные элементы." },
    labels: { externalLink: "ВНЕШНЯЯ ССЫЛКА", new: "Новый", view: "Смотреть", download: "Скачать", hidden: "Скрыто", visible: "Видно" },
    tooltips: { hide: "Скрыть", show: "Показать", archive: "В архив", unarchive: "Из архива", edit: "Изменить", delete: "Удалить" },
    toasts: { hidden: "Скрыто.", visible: "Теперь видно.", archived: "В архиве.", unarchived: "Восстановлено.", deleted: "Удалено.", updated: "Обновлено.", error: "Ошибка." },
    modals: { cancel: "Отмена", save: "Сохранить", confirm: "Подтвердить", editTitle: "Редактировать", titleLabel: "Заголовок", descLabel: "Описание", topicLabel: "Тема", urlLabel: "Ссылка (URL)", confirmTitle: "Подтвердите", hideMsg: "Скрыть этот материал?", showMsg: "Показать этот материал?", archiveMsg: "Перенести в архив?", unarchiveMsg: "Разархивировать?", deleteMsg: "Навсегда удалить?" }
  }
};

const PAGE_SIZE = 10;

export default function MaterialsTab({ classId }: { classId: string }) {
  const { lang } = useTeacherLanguage();
  const t = MATERIALS_TRANSLATIONS[lang] || MATERIALS_TRANSLATIONS['en'];

  // --- STATE ---
  const [materials, setMaterials] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  
  // Pagination State
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // Modal States
  const [editingMat, setEditingMat] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', topicId: '', externalUrl: '' });
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'visibility' | 'archive' | 'delete', mat: any } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // --- 1. INFINITE SCROLL FETCHING ---
  const fetchMaterials = async (isNextPage: boolean = false) => {
    if (!classId) return;
    if (isNextPage && !lastDoc) return;
    
    isNextPage ? setLoadingMore(true) : setLoadingInitial(true);

    try {
      let q = query(
        collection(db, 'classes', classId, 'materials'), 
        where('isArchived', '==', showArchived),
        orderBy('createdAt', 'desc'), 
        limit(PAGE_SIZE)
      );

      if (isNextPage && lastDoc) {
        q = query(collection(db, 'classes', classId, 'materials'), where('isArchived', '==', showArchived), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      }

      const snap = await getDocs(q);
      const newDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setMaterials(prev => isNextPage ? [...prev, ...newDocs] : newDocs);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length >= PAGE_SIZE);
    } catch (e) {
      console.error(e);
      toast.error(t.toasts.error);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  };

  // Fetch when tab mounts or 'showArchived' toggles
  useEffect(() => {
    setMaterials([]); setLastDoc(null); setHasMore(true);
    fetchMaterials();
  }, [classId, showArchived]);

  // Observer
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingInitial || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchMaterials(true);
    }, { threshold: 0.5 });
    if (node) observerRef.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore, showArchived]);

  // --- ACTIONS ---
  const executeConfirmAction = async () => {
    if (!confirmDialog) return;
    setIsProcessing(true);
    const { type, mat } = confirmDialog;

    try {
      if (type === 'visibility') {
        await updateDoc(doc(db, 'classes', classId, 'materials', mat.id), { isVisible: !mat.isVisible });
        setMaterials(prev => prev.map(m => m.id === mat.id ? { ...m, isVisible: !m.isVisible } : m));
        toast.success(mat.isVisible ? t.toasts.hidden : t.toasts.visible);
      } else if (type === 'archive') {
        await updateDoc(doc(db, 'classes', classId, 'materials', mat.id), { isArchived: !mat.isArchived });
        setMaterials(prev => prev.filter(m => m.id !== mat.id)); // Remove from current view
        toast.success(mat.isArchived ? t.toasts.unarchived : t.toasts.archived);
      } else if (type === 'delete') {
        if (mat.storagePath) await deleteObject(ref(storage, mat.storagePath));
        await deleteDoc(doc(db, 'classes', classId, 'materials', mat.id));
        setMaterials(prev => prev.filter(m => m.id !== mat.id));
        toast.success(t.toasts.deleted);
      }
    } catch (error) { toast.error(t.toasts.error); } 
    finally { setIsProcessing(false); setConfirmDialog(null); }
  };

  const handleEditSave = async () => {
    if (!editingMat || !editForm.title.trim()) return toast.error(t.toasts.error);
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'classes', classId, 'materials', editingMat.id), {
        title: editForm.title.trim(), description: editForm.description.trim(), topicId: editForm.topicId.trim() || null,
        externalUrl: editingMat.isExternal ? editForm.externalUrl.trim() : null,
        fileUrl: editingMat.isExternal ? editForm.externalUrl.trim() : editingMat.fileUrl,
      });
      setMaterials(prev => prev.map(m => m.id === editingMat.id ? { ...m, ...editForm } : m));
      toast.success(t.toasts.updated);
      setEditingMat(null);
    } catch (error) { toast.error(t.toasts.error); } 
    finally { setIsProcessing(false); }
  };
  

  // 🟢 ADD THIS MISSING FUNCTION BACK
  const openEditModal = (mat: any) => {
    setEditingMat(mat);
    setEditForm({ 
      title: mat.title || '', 
      description: mat.description || '', 
      topicId: mat.topicId || '', 
      externalUrl: mat.externalUrl || '' 
    });
  };

  const getSemanticStyle = (type: string) => {
    if (type === 'pdf') return { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', icon: FileText, hover: 'hover:border-red-200 hover:shadow-red-500/10' };
    if (type === 'image') return { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', icon: ImageIcon, hover: 'hover:border-blue-200 hover:shadow-blue-500/10' };
    if (type === 'video') return { color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100', icon: Video, hover: 'hover:border-purple-200 hover:shadow-purple-500/10' };
    if (type === 'link') return { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: LinkIcon, hover: 'hover:border-emerald-200 hover:shadow-emerald-500/10' };
    return { color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: File, hover: 'hover:border-slate-300' };
  };

  return (
    <div className="space-y-6">
      
      {/* ACTIVE / ARCHIVED TOGGLE */}
      <div className="flex p-1.5 bg-slate-200/50 rounded-[1rem] shadow-inner max-w-xs">
        <button onClick={() => setShowArchived(false)} className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all ${!showArchived ? 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
          {t.tabs.active}
        </button>
        <button onClick={() => setShowArchived(true)} className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all ${showArchived ? 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
          {t.tabs.archived}
        </button>
      </div>

      {/* CONTENT LIST */}
      {loadingInitial ? (
        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={28}/></div>
      ) : materials.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center mb-4 shadow-sm text-slate-300">
            {showArchived ? <Archive size={32} /> : <FileText size={32} />}
          </div>
          <h3 className="text-slate-800 font-black text-[16px]">{showArchived ? t.empty.archiveTitle : t.empty.activeTitle}</h3>
          <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-xs">{showArchived ? t.empty.archiveDesc : t.empty.activeDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materials.map((mat, index) => {
            const isLastElement = index === materials.length - 1;
            const style = getSemanticStyle(mat.fileType);
            const IconComp = style.icon;

            return (
              <div 
                key={mat.id} 
                ref={isLastElement ? lastElementRef : null}
                className={`bg-white p-5 rounded-[1.5rem] border transition-all duration-300 shadow-sm group flex flex-col justify-between ${
                  !mat.isVisible ? 'border-dashed border-slate-300 opacity-60 hover:opacity-100' : `border-slate-200/80 hover:shadow-md ${style.hover} hover:-translate-y-0.5`
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-[14px] border flex items-center justify-center shrink-0 shadow-inner ${style.bg} ${style.color} ${style.border}`}>
                    <IconComp size={24} strokeWidth={2}/>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {mat.topicId && (
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/60 shadow-sm">
                          <Folder size={10}/> {mat.topicId}
                        </span>
                      )}
                      {!mat.isVisible && (
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/60 shadow-sm">
                          <EyeOff size={10}/> {t.labels.hidden}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-[15px] text-slate-900 truncate">{mat.title}</h3>
                    <p className="text-[12px] font-medium text-slate-500 truncate mt-0.5">{mat.description || '...'}</p>
                    
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {mat.isExternal ? (
                         <span className="text-emerald-500 flex items-center gap-1"><ExternalLink size={12}/> {t.labels.externalLink}</span>
                      ) : (
                         <span>{(mat.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      )}
                      <span>•</span>
                      <span>{mat.createdAt ? new Date(mat.createdAt.seconds * 1000).toLocaleDateString() : t.labels.new}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100/80">
                  
                  {/* Primary View/Download Action */}
                  <a 
                    href={mat.fileUrl} target="_blank" rel="noopener noreferrer" 
                    className={`px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-2 transition-all active:scale-95 ${style.bg} ${style.color} hover:brightness-95 border ${style.border}`}
                  >
                    {mat.isExternal ? <><ExternalLink size={14}/> {t.labels.view}</> : <><Download size={14}/> {t.labels.download}</>}
                  </a>
                  
                  {/* Secondary Management Actions */}
                  <div className="flex gap-1.5">
                    <button onClick={() => setConfirmDialog({ type: 'visibility', mat })} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 border border-slate-200/50 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors" title={mat.isVisible ? t.tooltips.hide : t.tooltips.show}>
                      {mat.isVisible ? <EyeOff size={14} strokeWidth={2.5}/> : <Eye size={14} strokeWidth={2.5}/>}
                    </button>
                    <button onClick={() => openEditModal(mat)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 border border-blue-100/50 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors" title={t.tooltips.edit}>
                      <Edit size={14} strokeWidth={2.5}/>
                    </button>
                    <button onClick={() => setConfirmDialog({ type: 'archive', mat })} className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 border border-amber-100/50 hover:bg-amber-100 hover:text-amber-600 flex items-center justify-center transition-colors" title={mat.isArchived ? t.tooltips.unarchive : t.tooltips.archive}>
                      {mat.isArchived ? <ArchiveRestore size={14} strokeWidth={2.5}/> : <Archive size={14} strokeWidth={2.5}/>}
                    </button>
                    <button onClick={() => setConfirmDialog({ type: 'delete', mat })} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 border border-red-100/50 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors" title={t.tooltips.delete}>
                      <Trash2 size={14} strokeWidth={2.5}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loadingMore && <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24}/></div>}

      {/* --- CONFIRMATION MODAL --- */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setConfirmDialog(null)}></div>
          <div className="relative bg-white rounded-[2rem] w-full max-w-sm p-6 md:p-8 shadow-2xl animate-in zoom-in-95 text-center border border-slate-100">
            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center mb-5 mx-auto ${confirmDialog.type === 'delete' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-black text-slate-900 mb-2">{t.modals.confirmTitle}</h2>
            <p className="text-[13px] text-slate-500 font-medium mb-6 leading-relaxed">
              {confirmDialog.type === 'visibility' ? (confirmDialog.mat.isVisible ? t.modals.hideMsg : t.modals.showMsg) : confirmDialog.type === 'archive' ? (confirmDialog.mat.isArchived ? t.modals.unarchiveMsg : t.modals.archiveMsg) : t.modals.deleteMsg}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog(null)} disabled={isProcessing} className="flex-1 py-3 text-[13px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200/80">{t.modals.cancel}</button>
              <button onClick={executeConfirmAction} disabled={isProcessing} className={`flex-1 py-3 text-[13px] font-bold text-white rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 ${confirmDialog.type === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}>
                {isProcessing && <Loader2 size={16} className="animate-spin"/>} {t.modals.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {editingMat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setEditingMat(null)}></div>
          <div className="relative bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="px-6 md:px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0"><Edit size={18} strokeWidth={2.5}/></div>
                <h2 className="text-[18px] font-black text-slate-900 tracking-tight">{t.modals.editTitle}</h2>
              </div>
              <button onClick={() => setEditingMat(null)} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={16} strokeWidth={2.5}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 bg-[#FAFAFA] custom-scrollbar">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.modals.titleLabel}</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[14px] font-bold text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Folder size={12}/> {t.modals.topicLabel}</label>
                <input type="text" value={editForm.topicId} onChange={e => setEditForm({...editForm, topicId: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[14px] font-bold text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.modals.descLabel}</label>
                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={2} className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[14px] font-medium text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all shadow-sm" />
              </div>
              {editingMat.isExternal && (
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.modals.urlLabel}</label>
                  <input type="url" value={editForm.externalUrl} onChange={e => setEditForm({...editForm, externalUrl: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[14px] font-bold text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" />
                </div>
              )}
            </div>

            <div className="px-6 md:px-8 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingMat(null)} disabled={isProcessing} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-[13px] transition-colors">{t.modals.cancel}</button>
              <button onClick={handleEditSave} disabled={isProcessing || !editForm.title.trim()} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 text-[13px] disabled:opacity-50">
                {isProcessing && <Loader2 className="animate-spin" size={16}/>} {t.modals.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}