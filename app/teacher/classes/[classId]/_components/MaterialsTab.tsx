'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom'; // 🟢 ADDED PORTAL
import { db, storage } from '@/lib/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, doc, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import {
  FileText, Image as ImageIcon, Video, File, Download, Trash2,
  Eye, EyeOff, Link as LinkIcon, ExternalLink, Folder,
  Archive, ArchiveRestore, Edit, X, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { Button, Spinner, EmptyState } from '@/components/ui';

// ============================================================================
// 🟢 1. GLOBAL DUAL-CACHE (Survives Tab Switches, 0 Reads on Toggle)
// ============================================================================
const globalMaterialsCache: Record<string, {
  active: { materials: any[], lastDoc: any, hasMore: boolean, timestamp: number } | null;
  archived: { materials: any[], lastDoc: any, hasMore: boolean, timestamp: number } | null;
}> = {};

const CACHE_LIFESPAN = 60 * 1000; // 60 seconds

// --- TRANSLATION DICTIONARY ---
const MATERIALS_TRANSLATIONS: any = {
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

  // 🟢 SSR HYDRATION FIX FOR PORTAL
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  // ============================================================================
  // 🟢 2. SWR FETCH LOGIC
  // ============================================================================
  useEffect(() => {
    const initializeTab = async () => {
      if (!globalMaterialsCache[classId]) {
        globalMaterialsCache[classId] = { active: null, archived: null };
      }

      const cacheType = showArchived ? 'archived' : 'active';
      const cached = globalMaterialsCache[classId][cacheType];
      const now = Date.now();

      // 🟢 CACHE HIT: Instant Load
      if (cached) {
        setMaterials(cached.materials);
        setLastDoc(cached.lastDoc);
        setHasMore(cached.hasMore);
        setLoadingInitial(false);

        // If fresh, do nothing. If stale, fetch silently in the background
        if (now - cached.timestamp < CACHE_LIFESPAN) return;
        fetchMaterials(false, true);
      } else {
        // No cache: Show loading spinner and fetch
        setLoadingInitial(true);
        fetchMaterials(false, false);
      }
    };

    initializeTab();
  }, [classId, showArchived]);

  const fetchMaterials = async (isNextPage: boolean = false, silent: boolean = false) => {
    if (!classId) return;
    if (isNextPage && !lastDoc) return;
    
    if (!silent) {
      isNextPage ? setLoadingMore(true) : setLoadingInitial(true);
    }

    try {
      let q = query(
        collection(db, 'classes', classId, 'materials'), 
        where('isArchived', '==', showArchived),
        orderBy('createdAt', 'desc'), 
        limit(PAGE_SIZE)
      );

      if (isNextPage && lastDoc) {
        q = query(
          collection(db, 'classes', classId, 'materials'), 
          where('isArchived', '==', showArchived), 
          orderBy('createdAt', 'desc'), 
          startAfter(lastDoc), 
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const newDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setMaterials(prev => {
        const updated = isNextPage ? [...prev, ...newDocs] : newDocs;
        const newLastDoc = snap.docs[snap.docs.length - 1] || null;
        const newHasMore = snap.docs.length >= PAGE_SIZE;

        // 🟢 Update Cache
        const cacheType = showArchived ? 'archived' : 'active';
        globalMaterialsCache[classId][cacheType] = {
          materials: updated,
          lastDoc: newLastDoc,
          hasMore: newHasMore,
          timestamp: Date.now()
        };

        if (!silent || !isNextPage) {
          setLastDoc(newLastDoc);
          setHasMore(newHasMore);
        }
        return updated;
      });
    } catch (e) {
      console.error(e);
      if (!silent) toast.error(t.toasts.error);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  };

  // Observer
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingInitial || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchMaterials(true);
    }, { threshold: 0.5 });
    if (node) observerRef.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore, showArchived]);

  // ============================================================================
  // 🟢 3. MUTATIONS (Updates UI & Cache instantly)
  // ============================================================================
  const executeConfirmAction = async () => {
    if (!confirmDialog) return;
    setIsProcessing(true);
    const { type, mat } = confirmDialog;
    const cacheType = showArchived ? 'archived' : 'active';
    const oppositeCacheType = showArchived ? 'active' : 'archived';

    try {
      if (type === 'visibility') {
        await updateDoc(doc(db, 'classes', classId, 'materials', mat.id), { isVisible: !mat.isVisible });
        setMaterials(prev => {
          const updated = prev.map(m => m.id === mat.id ? { ...m, isVisible: !m.isVisible } : m);
          if (globalMaterialsCache[classId][cacheType]) globalMaterialsCache[classId][cacheType]!.materials = updated;
          return updated;
        });
        toast.success(mat.isVisible ? t.toasts.hidden : t.toasts.visible);

      } else if (type === 'archive') {
        await updateDoc(doc(db, 'classes', classId, 'materials', mat.id), { isArchived: !mat.isArchived });
        
        // Remove from current view
        setMaterials(prev => {
          const updated = prev.filter(m => m.id !== mat.id);
          if (globalMaterialsCache[classId][cacheType]) globalMaterialsCache[classId][cacheType]!.materials = updated;
          return updated;
        });
        
        // 🟢 Invalidate the opposite cache so it fetches fresh when they switch tabs
        globalMaterialsCache[classId][oppositeCacheType] = null;
        
        toast.success(mat.isArchived ? t.toasts.unarchived : t.toasts.archived);

      } else if (type === 'delete') {
        if (mat.storagePath) await deleteObject(ref(storage, mat.storagePath));
        await deleteDoc(doc(db, 'classes', classId, 'materials', mat.id));
        
        setMaterials(prev => {
          const updated = prev.filter(m => m.id !== mat.id);
          if (globalMaterialsCache[classId][cacheType]) globalMaterialsCache[classId][cacheType]!.materials = updated;
          return updated;
        });
        toast.success(t.toasts.deleted);
      }
    } catch (error) { toast.error(t.toasts.error); } 
    finally { setIsProcessing(false); setConfirmDialog(null); }
  };

  const handleEditSave = async () => {
    if (!editingMat || !editForm.title.trim()) return toast.error(t.toasts.error);
    setIsProcessing(true);
    const cacheType = showArchived ? 'archived' : 'active';

    try {
      await updateDoc(doc(db, 'classes', classId, 'materials', editingMat.id), {
        title: editForm.title.trim(), description: editForm.description.trim(), topicId: editForm.topicId.trim() || null,
        externalUrl: editingMat.isExternal ? editForm.externalUrl.trim() : null,
        fileUrl: editingMat.isExternal ? editForm.externalUrl.trim() : editingMat.fileUrl,
      });
      
      setMaterials(prev => {
        const updated = prev.map(m => m.id === editingMat.id ? { ...m, ...editForm } : m);
        if (globalMaterialsCache[classId][cacheType]) globalMaterialsCache[classId][cacheType]!.materials = updated;
        return updated;
      });
      
      toast.success(t.toasts.updated);
      setEditingMat(null);
    } catch (error) { toast.error(t.toasts.error); } 
    finally { setIsProcessing(false); }
  };

  const openEditModal = (mat: any) => {
    setEditingMat(mat);
    setEditForm({ 
      title: mat.title || '', 
      description: mat.description || '', 
      topicId: mat.topicId || '', 
      externalUrl: mat.externalUrl || '' 
    });
  };

  // Decorative per-file-type accents — rotate the M3 container tones (not status colors).
  const getSemanticStyle = (type: string) => {
    if (type === 'pdf') return { color: 'text-on-primary-container', bg: 'bg-primary-container', border: 'border-transparent', icon: FileText, hover: 'hover:border-outline' };
    if (type === 'image') return { color: 'text-on-secondary-container', bg: 'bg-secondary-container', border: 'border-transparent', icon: ImageIcon, hover: 'hover:border-outline' };
    if (type === 'video') return { color: 'text-on-tertiary-container', bg: 'bg-tertiary-container', border: 'border-transparent', icon: Video, hover: 'hover:border-outline' };
    if (type === 'link') return { color: 'text-on-primary-container', bg: 'bg-primary-container', border: 'border-transparent', icon: LinkIcon, hover: 'hover:border-outline' };
    return { color: 'text-on-surface-variant', bg: 'bg-surface-container-highest', border: 'border-transparent', icon: File, hover: 'hover:border-outline' };
  };

  // --- RENDER ---
  return (
    <div className="space-y-4 md:space-y-6">
      
      {/* ACTIVE / ARCHIVED TOGGLE */}
      <div className="t-glass-card flex p-1 rounded-full max-w-xs mx-auto md:mx-0">
        <button onClick={() => setShowArchived(false)} className={`flex-1 py-2 text-[11px] md:text-[12px] font-bold rounded-full transition-all ${!showArchived ? 't-icon-chip' : 'text-on-surface-variant hover:text-on-surface'}`}>
          {t.tabs.active}
        </button>
        <button onClick={() => setShowArchived(true)} className={`flex-1 py-2 text-[11px] md:text-[12px] font-bold rounded-full transition-all ${showArchived ? 't-icon-chip' : 'text-on-surface-variant hover:text-on-surface'}`}>
          {t.tabs.archived}
        </button>
      </div>

      {/* CONTENT LIST */}
      {loadingInitial ? (
        <div className="py-12 flex justify-center"><Spinner size={28}/></div>
      ) : materials.length === 0 ? (
        <div className="t-glass-card rounded-m3-xl">
          <EmptyState
            icon={showArchived ? <Archive /> : <FileText />}
            title={showArchived ? t.empty.archiveTitle : t.empty.activeTitle}
            description={showArchived ? t.empty.archiveDesc : t.empty.activeDesc}
            className="py-12 md:py-16"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {materials.map((mat, index) => {
            const isLastElement = index === materials.length - 1;
            const style = getSemanticStyle(mat.fileType);
            const IconComp = style.icon;

            return (
              <div 
                key={mat.id} 
                ref={isLastElement ? lastElementRef : null}
                className={`t-glass-card p-4 md:p-5 rounded-m3-lg transition-all duration-300 group flex flex-col justify-between ${
                  !mat.isVisible ? 'opacity-60 hover:opacity-100' : `hover:shadow-elev-2 hover:-translate-y-0.5 active:scale-[0.98] md:active:scale-100`
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                    <IconComp size={20} strokeWidth={2.5} className="md:w-6 md:h-6 md:stroke-2" />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1 md:mb-1.5">
                      {mat.topicId && (
                        <span className="t-icon-chip-soft text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Folder size={10}/> {mat.topicId}
                        </span>
                      )}
                      {!mat.isVisible && (
                        <span className="t-icon-chip-soft text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                          <EyeOff size={10}/> {t.labels.hidden}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-[14px] md:text-[15px] text-on-surface truncate leading-snug">{mat.title}</h3>
                    {mat.description && <p className="text-[11px] md:text-[12px] font-medium text-on-surface-variant truncate mt-0.5 md:mt-1">{mat.description}</p>}

                    <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2 text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                      {mat.isExternal ? (
                         <span className="text-primary flex items-center gap-1"><ExternalLink size={10} className="md:w-3 md:h-3"/> {t.labels.externalLink}</span>
                      ) : (
                         <span>{(mat.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      )}
                      <span>•</span>
                      <span>{mat.createdAt ? new Date(mat.createdAt.seconds * 1000).toLocaleDateString() : t.labels.new}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <a
                    href={mat.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="t-icon-chip px-4 py-2.5 md:py-2 rounded-full text-[11px] md:text-[12px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 hover:brightness-105 text-center w-full sm:w-auto"
                  >
                    {mat.isExternal ? <><ExternalLink size={14}/> {t.labels.view}</> : <><Download size={14}/> {t.labels.download}</>}
                  </a>

                  <div className="flex gap-1.5 justify-end w-full sm:w-auto">
                    <button onClick={() => setConfirmDialog({ type: 'visibility', mat })} className="flex-1 sm:flex-none w-auto sm:w-8 h-9 sm:h-8 rounded-full bg-[color-mix(in_oklab,var(--m3-on-surface)_6%,transparent)] text-on-surface-variant hover:text-on-surface hover:text-on-surface flex items-center justify-center transition-colors active:scale-95" title={mat.isVisible ? t.tooltips.hide : t.tooltips.show}>
                      {mat.isVisible ? <EyeOff size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/> : <Eye size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/>}
                    </button>
                    <button onClick={() => openEditModal(mat)} className="flex-1 sm:flex-none w-auto sm:w-8 h-9 sm:h-8 rounded-full bg-primary-container text-on-primary-container border border-transparent hover:brightness-95 flex items-center justify-center transition-colors active:scale-95" title={t.tooltips.edit}>
                      <Edit size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/>
                    </button>
                    <button onClick={() => setConfirmDialog({ type: 'archive', mat })} className="flex-1 sm:flex-none w-auto sm:w-8 h-9 sm:h-8 rounded-full bg-warning-container text-on-warning-container border border-transparent hover:brightness-95 flex items-center justify-center transition-colors active:scale-95" title={mat.isArchived ? t.tooltips.unarchive : t.tooltips.archive}>
                      {mat.isArchived ? <ArchiveRestore size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/> : <Archive size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/>}
                    </button>
                    <button onClick={() => setConfirmDialog({ type: 'delete', mat })} className="flex-1 sm:flex-none w-auto sm:w-8 h-9 sm:h-8 rounded-full bg-error-container text-on-error-container border border-transparent hover:brightness-95 flex items-center justify-center transition-colors active:scale-95" title={t.tooltips.delete}>
                      <Trash2 size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loadingMore && <div className="py-4 md:py-6 flex justify-center"><Spinner size={24}/></div>}

      {/* --- CONFIRMATION MODAL (PORTAL) --- */}
      {mounted && confirmDialog && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-scrim backdrop-blur-sm transition-opacity" onClick={() => setConfirmDialog(null)}></div>
          <div className="relative bg-surface-container-low rounded-m3-xl w-full max-w-sm p-6 md:p-8 shadow-elev-3 animate-in zoom-in-95 fade-in text-center border border-outline-variant">
            <div className={`w-14 h-14 rounded-m3-md flex items-center justify-center mb-5 mx-auto ${confirmDialog.type === 'delete' ? 'bg-error-container text-on-error-container' : 'bg-warning-container text-on-warning-container'}`}>
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <h2 className="text-[16px] md:text-[18px] font-black text-on-surface mb-2">{t.modals.confirmTitle}</h2>
            <p className="text-[12px] md:text-[13px] text-on-surface-variant font-medium mb-6 leading-relaxed px-2">
              {confirmDialog.type === 'visibility' ? (confirmDialog.mat.isVisible ? t.modals.hideMsg : t.modals.showMsg) : confirmDialog.type === 'archive' ? (confirmDialog.mat.isArchived ? t.modals.unarchiveMsg : t.modals.archiveMsg) : t.modals.deleteMsg}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
              <Button variant="outlined" className="w-full" onClick={() => setConfirmDialog(null)} disabled={isProcessing}>{t.modals.cancel}</Button>
              <Button variant={confirmDialog.type === 'delete' ? 'danger' : 'filled'} className="w-full" onClick={executeConfirmAction} loading={isProcessing}>
                {t.modals.confirm}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- EDIT MODAL (PORTAL) --- */}
      {mounted && editingMat && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-scrim backdrop-blur-sm transition-opacity" onClick={() => setEditingMat(null)}></div>
          <div className="relative bg-surface-container-low rounded-t-m3-xl sm:rounded-m3-xl w-full max-w-md shadow-elev-3 animate-in slide-in-from-bottom-10 sm:zoom-in-95 fade-in border border-outline-variant flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh]">

            <div className="px-5 py-4 sm:px-8 sm:py-5 border-b border-outline-variant bg-[color-mix(in_oklab,var(--m3-surface-container-low)_90%,transparent)] backdrop-blur-xl flex justify-between items-center shrink-0 z-20 shadow-elev-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-m3-md bg-primary-container border border-transparent flex items-center justify-center text-on-primary-container shadow-elev-1 shrink-0">
                   <Edit size={16} strokeWidth={2.5} className="sm:w-[18px] sm:h-[18px]" />
                </div>
                <h2 className="text-[16px] sm:text-[18px] font-black text-on-surface tracking-tight">{t.modals.editTitle}</h2>
              </div>
              <button onClick={() => setEditingMat(null)} className="w-8 h-8 flex items-center justify-center bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-full text-on-surface-variant hover:text-on-surface transition-colors active:scale-95 shrink-0">
                 <X size={18} strokeWidth={2.5}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-5 bg-surface custom-scrollbar pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-8">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 sm:mb-2">{t.modals.titleLabel}</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-m3-md text-[13px] sm:text-[14px] font-bold text-on-surface focus:border-primary focus:ring-4 focus:ring-[color-mix(in_oklab,var(--m3-primary)_10%,transparent)] outline-none transition-all shadow-elev-1" />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 sm:mb-2 flex items-center gap-1.5"><Folder size={12}/> {t.modals.topicLabel}</label>
                <input type="text" value={editForm.topicId} onChange={e => setEditForm({...editForm, topicId: e.target.value})} className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-m3-md text-[13px] sm:text-[14px] font-bold text-on-surface focus:border-primary focus:ring-4 focus:ring-[color-mix(in_oklab,var(--m3-primary)_10%,transparent)] outline-none transition-all shadow-elev-1" />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 sm:mb-2">{t.modals.descLabel}</label>
                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={3} className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-m3-md text-[13px] sm:text-[14px] font-medium text-on-surface focus:border-primary focus:ring-4 focus:ring-[color-mix(in_oklab,var(--m3-primary)_10%,transparent)] outline-none resize-none transition-all shadow-elev-1" />
              </div>
              {editingMat.isExternal && (
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 sm:mb-2">{t.modals.urlLabel}</label>
                  <input type="url" value={editForm.externalUrl} onChange={e => setEditForm({...editForm, externalUrl: e.target.value})} className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-m3-md text-[13px] sm:text-[14px] font-bold text-on-surface focus:border-primary focus:ring-4 focus:ring-[color-mix(in_oklab,var(--m3-primary)_10%,transparent)] outline-none transition-all shadow-elev-1" />
                </div>
              )}
            </div>

            <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-outline-variant bg-surface-container-low flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0 z-20 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 shadow-[0_-10px_30px_rgb(0,0,0,0.03)]">
              <Button variant="outlined" className="w-full sm:w-auto" onClick={() => setEditingMat(null)} disabled={isProcessing}>{t.modals.cancel}</Button>
              <Button className="w-full sm:w-auto" onClick={handleEditSave} loading={isProcessing} disabled={!editForm.title.trim()}>
                {t.modals.save}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}