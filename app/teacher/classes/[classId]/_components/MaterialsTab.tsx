'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc, where, limit } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { FileText, Image as ImageIcon, Video, File, Download, Trash2, Eye, EyeOff, Loader2, Link as LinkIcon, ExternalLink, Folder, Archive, ArchiveRestore, Edit, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- 1. TRANSLATION DICTIONARY ---
const MATERIALS_TRANSLATIONS = {
  uz: {
    tabs: { active: "Faol Materiallar", archived: "Arxivlanganlar" },
    empty: {
      activeTitle: "Hozircha materiallar yo'q",
      activeDesc: "O'quvchilar uchun PDF, rasm, video yoki havolalar yuklang.",
      archiveTitle: "Arxivlangan materiallar yo'q",
      archiveDesc: "Arxivlangan narsalar shu yerda ko'rinadi."
    },
    labels: { externalLink: "TASHQI HAVOLA", new: "Yangi", loadMore: "Ko'proq material yuklash" },
    tooltips: { hide: "O'quvchilardan yashirish", show: "O'quvchilarga ko'rsatish", archive: "Arxivlash", unarchive: "Arxivdan chiqarish", open: "Havolani ochish", download: "Yuklab olish", edit: "Tahrirlash", delete: "O'chirish" },
    toasts: { hidden: "Material yashirildi.", visible: "Material endi ko'rinadi.", archived: "Arxivlandi.", unarchived: "Arxivdan chiqarildi.", deleted: "O'chirildi.", updated: "Yangilandi.", error: "Xatolik yuz berdi." },
    modals: {
      cancel: "Bekor qilish", save: "Saqlash", confirm: "Tasdiqlash",
      editTitle: "Materialni Tahrirlash",
      titleLabel: "Sarlavha", descLabel: "Tavsif", topicLabel: "Mavzu", urlLabel: "Havola (URL)",
      confirmTitle: "Harakatni tasdiqlang",
      hideMsg: "Bu materialni o'quvchilardan yashirmoqchimisiz?",
      showMsg: "Bu materialni o'quvchilarga ko'rsatmoqchimisiz?",
      archiveMsg: "Bu materialni arxivga o'tkazmoqchimisiz? U faol ro'yxatdan yo'qoladi.",
      unarchiveMsg: "Bu materialni arxivdan chiqarmoqchimisiz?",
      deleteMsg: "Bu materialni butunlay o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi."
    }
  },
  en: {
    tabs: { active: "Active Materials", archived: "Archived" },
    empty: {
      activeTitle: "No Materials Yet",
      activeDesc: "Upload PDFs, images, videos, or share links for your students.",
      archiveTitle: "No Archived Materials",
      archiveDesc: "Archived items will appear here."
    },
    labels: { externalLink: "EXTERNAL LINK", new: "New", loadMore: "Load More Materials" },
    tooltips: { hide: "Hide from students", show: "Show to students", archive: "Archive", unarchive: "Unarchive", open: "Open Link", download: "Download File", edit: "Edit", delete: "Delete" },
    toasts: { hidden: "Material hidden from students.", visible: "Material is now visible.", archived: "Material archived.", unarchived: "Material unarchived.", deleted: "Deleted successfully.", updated: "Updated successfully.", error: "An error occurred." },
    modals: {
      cancel: "Cancel", save: "Save Changes", confirm: "Confirm",
      editTitle: "Edit Material",
      titleLabel: "Title", descLabel: "Description", topicLabel: "Topic", urlLabel: "URL / Link",
      confirmTitle: "Confirm Action",
      hideMsg: "Are you sure you want to hide this material from students?",
      showMsg: "Are you sure you want to show this material to students?",
      archiveMsg: "Are you sure you want to archive this? It will be moved from the active list.",
      unarchiveMsg: "Are you sure you want to unarchive this material?",
      deleteMsg: "Are you sure you want to permanently delete this? This action cannot be undone."
    }
  },
  ru: {
    tabs: { active: "Активные материалы", archived: "В архиве" },
    empty: {
      activeTitle: "Пока нет материалов",
      activeDesc: "Загрузите PDF, изображения, видео или ссылки для учеников.",
      archiveTitle: "Нет архивных материалов",
      archiveDesc: "Здесь будут отображаться архивные элементы."
    },
    labels: { externalLink: "ВНЕШНЯЯ ССЫЛКА", new: "Новый", loadMore: "Загрузить еще материалы" },
    tooltips: { hide: "Скрыть от учеников", show: "Показать ученикам", archive: "В архив", unarchive: "Из архива", open: "Открыть ссылку", download: "Скачать файл", edit: "Редактировать", delete: "Удалить" },
    toasts: { hidden: "Материал скрыт.", visible: "Материал теперь виден.", archived: "В архиве.", unarchived: "Восстановлен из архива.", deleted: "Успешно удалено.", updated: "Успешно обновлено.", error: "Произошла ошибка." },
    modals: {
      cancel: "Отмена", save: "Сохранить", confirm: "Подтвердить",
      editTitle: "Редактировать материал",
      titleLabel: "Заголовок", descLabel: "Описание", topicLabel: "Тема", urlLabel: "Ссылка (URL)",
      confirmTitle: "Подтвердите действие",
      hideMsg: "Вы уверены, что хотите скрыть этот материал от учеников?",
      showMsg: "Вы уверены, что хотите показать этот материал ученикам?",
      archiveMsg: "Вы уверены, что хотите перенести это в архив?",
      unarchiveMsg: "Вы уверены, что хотите разархивировать этот материал?",
      deleteMsg: "Вы уверены, что хотите навсегда удалить это? Это действие нельзя отменить."
    }
  }
};

export default function MaterialsTab({ classId }: { classId: string }) {
  const { lang } = useTeacherLanguage();
  const t = MATERIALS_TRANSLATIONS[lang];

  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showArchived, setShowArchived] = useState(false);
  const [itemLimit, setItemLimit] = useState(10); 

  // --- MODAL STATES ---
  const [editingMat, setEditingMat] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', topicId: '', externalUrl: '' });
  
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'visibility' | 'archive' | 'delete', mat: any } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'classes', classId, 'materials'), where('isArchived', '==', showArchived), orderBy('createdAt', 'desc'), limit(itemLimit));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [classId, showArchived, itemLimit]);

  // --- ACTIONS ---
  const executeConfirmAction = async () => {
    if (!confirmDialog) return;
    setIsProcessing(true);
    const { type, mat } = confirmDialog;

    try {
      if (type === 'visibility') {
        await updateDoc(doc(db, 'classes', classId, 'materials', mat.id), { isVisible: !mat.isVisible });
        toast.success(mat.isVisible ? t.toasts.hidden : t.toasts.visible);
      } else if (type === 'archive') {
        await updateDoc(doc(db, 'classes', classId, 'materials', mat.id), { isArchived: !mat.isArchived });
        toast.success(mat.isArchived ? t.toasts.unarchived : t.toasts.archived);
      } else if (type === 'delete') {
        if (mat.storagePath) await deleteObject(ref(storage, mat.storagePath));
        await deleteDoc(doc(db, 'classes', classId, 'materials', mat.id));
        toast.success(t.toasts.deleted);
      }
    } catch (error) {
      console.error(error);
      toast.error(t.toasts.error);
    } finally {
      setIsProcessing(false);
      setConfirmDialog(null);
    }
  };

  const handleEditSave = async () => {
    if (!editingMat || !editForm.title) return toast.error(t.toasts.error);
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'classes', classId, 'materials', editingMat.id), {
        title: editForm.title,
        description: editForm.description,
        topicId: editForm.topicId || null,
        externalUrl: editingMat.isExternal ? editForm.externalUrl : null,
        fileUrl: editingMat.isExternal ? editForm.externalUrl : editingMat.fileUrl,
      });
      toast.success(t.toasts.updated);
      setEditingMat(null);
    } catch (error) {
      toast.error(t.toasts.error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (mat: any) => {
    setEditingMat(mat);
    setEditForm({ title: mat.title || '', description: mat.description || '', topicId: mat.topicId || '', externalUrl: mat.externalUrl || '' });
  };

  const getIcon = (type: string) => {
    if (type === 'pdf') return <FileText className="text-red-500" size={24} />;
    if (type === 'image') return <ImageIcon className="text-blue-500" size={24} />;
    if (type === 'video') return <Video className="text-purple-500" size={24} />;
    if (type === 'link') return <LinkIcon className="text-emerald-500" size={24} />;
    return <File className="text-slate-500" size={24} />;
  };

  return (
    <div className="space-y-4">
      
      {/* --- CONFIRMATION MODAL --- */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <AlertTriangle size={24} />
              <h2 className="text-lg font-bold text-slate-800">{t.modals.confirmTitle}</h2>
            </div>
            <p className="text-slate-600 text-sm mb-6 font-medium">
              {confirmDialog.type === 'visibility' ? (confirmDialog.mat.isVisible ? t.modals.hideMsg : t.modals.showMsg) :
               confirmDialog.type === 'archive' ? (confirmDialog.mat.isArchived ? t.modals.unarchiveMsg : t.modals.archiveMsg) :
               t.modals.deleteMsg}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)} disabled={isProcessing} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition text-sm">{t.modals.cancel}</button>
              <button onClick={executeConfirmAction} disabled={isProcessing} className={`px-4 py-2 text-white font-bold rounded-lg transition flex items-center gap-2 text-sm ${confirmDialog.type === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {isProcessing && <Loader2 size={16} className="animate-spin"/>} {t.modals.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {editingMat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit size={18} className="text-indigo-600"/> {t.modals.editTitle}</h2>
              <button onClick={() => setEditingMat(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.modals.titleLabel}</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl px-4 py-2.5 outline-none font-medium transition text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Folder size={12}/> {t.modals.topicLabel}</label>
                <input type="text" value={editForm.topicId} onChange={e => setEditForm({...editForm, topicId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl px-4 py-2.5 outline-none font-medium transition text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.modals.descLabel}</label>
                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={2} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl px-4 py-2.5 outline-none font-medium transition resize-none text-sm" />
              </div>
              {editingMat.isExternal && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.modals.urlLabel}</label>
                  <input type="url" value={editForm.externalUrl} onChange={e => setEditForm({...editForm, externalUrl: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-xl px-4 py-2.5 outline-none font-medium transition text-sm" />
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setEditingMat(null)} disabled={isProcessing} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition text-sm">{t.modals.cancel}</button>
              <button onClick={handleEditSave} disabled={isProcessing || !editForm.title} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm">
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : t.modals.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ACTIVE / ARCHIVED TOGGLE --- */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => { setShowArchived(false); setItemLimit(10); }} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${!showArchived ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.tabs.active}
          </button>
          <button onClick={() => { setShowArchived(true); setItemLimit(10); }} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${showArchived ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.tabs.archived}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" /></div>
      ) : materials.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-100">
          <FileText className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="text-lg font-bold text-slate-700">{showArchived ? t.empty.archiveTitle : t.empty.activeTitle}</h3>
          <p className="text-slate-500 text-sm mt-1">{showArchived ? t.empty.archiveDesc : t.empty.activeDesc}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {materials.map((mat) => (
              <div key={mat.id} className={`bg-white p-5 rounded-2xl border transition-all shadow-sm group ${mat.isVisible ? 'border-slate-200 hover:shadow-md' : 'border-dashed border-slate-300 opacity-75'}`}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">{getIcon(mat.fileType)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {mat.topicId && (
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Folder size={10}/> {mat.topicId}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 truncate mt-1">{mat.title}</h3>
                    {mat.description && <p className="text-xs text-slate-500 truncate mt-0.5">{mat.description}</p>}
                    
                    <div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${mat.isVisible ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {mat.isVisible ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  
                  <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setConfirmDialog({ type: 'visibility', mat })} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition" title={mat.isVisible ? t.tooltips.hide : t.tooltips.show}>
                      {mat.isVisible ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>

                    <button onClick={() => openEditModal(mat)} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition" title={t.tooltips.edit}>
                      <Edit size={16}/>
                    </button>

                    <button onClick={() => setConfirmDialog({ type: 'archive', mat })} className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition" title={mat.isArchived ? t.tooltips.unarchive : t.tooltips.archive}>
                      {mat.isArchived ? <ArchiveRestore size={16}/> : <Archive size={16}/>}
                    </button>
                    
                    <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition" title={mat.isExternal ? t.tooltips.open : t.tooltips.download}>
                      {mat.isExternal ? <ExternalLink size={16}/> : <Download size={16}/>}
                    </a>
                    
                    <button onClick={() => setConfirmDialog({ type: 'delete', mat })} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition" title={t.tooltips.delete}>
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {materials.length >= itemLimit && (
            <div className="flex justify-center mt-8">
              <button onClick={() => setItemLimit(prev => prev + 10)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors flex items-center gap-2">
                {t.labels.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}