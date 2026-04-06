'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, orderBy, getDocs, 
  doc, writeBatch, limit, updateDoc 
} from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
  Bell, Check, FileText, UserPlus, Trophy, Eye, Clock, 
  Trash2, Inbox, Loader2, Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentLanguage } from '@/app/(student)/layout'; 

// ============================================================================
// 🟢 1. GLOBAL CACHE (0 Reads on Tab Switch)
// ============================================================================
const globalNotificationsCache: Record<string, { notifications: any[], timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds

// --- TRANSLATION DICTIONARY ---
const NOTIF_TRANSLATIONS: any = {
  uz: {
    title: "Bildirishnomalar", subtitle: "Faollik va yangilanishlar",
    dismiss: "O'qilgan qilish", clear: "Tozalash",
    emptyTitle: "Hammasi ko'rib chiqildi!", emptyDesc: "Sizda yangi bildirishnomalar yo'q.",
    time: { now: "Hozirgina", view: "Batafsil" },
    confirmClear: "Barcha bildirishnomalarni o'chirasizmi? Bu amalni qaytarib bo'lmaydi.", newBadge: "YANGI"
  },
  en: {
    title: "Inbox", subtitle: "Your activity & updates",
    dismiss: "Mark Read", clear: "Clear",
    emptyTitle: "All caught up!", emptyDesc: "You have no new notifications.",
    time: { now: "Just now", view: "View Details" },
    confirmClear: "Clear all notifications? This cannot be undone.", newBadge: "NEW"
  },
  ru: {
    title: "Входящие", subtitle: "Активность и обновления",
    dismiss: "Прочитано", clear: "Очистить",
    emptyTitle: "Все прочитано!", emptyDesc: "У вас нет новых уведомлений.",
    time: { now: "Только что", view: "Подробнее" },
    confirmClear: "Очистить все? Это нельзя отменить.", newBadge: "НОВОЕ"
  }
};

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'assignment' | 'submission' | 'request' | 'result' | 'general';
  read: boolean;
  link?: string;
  createdAt: any;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { lang } = useStudentLanguage();
  const t = NOTIF_TRANSLATIONS[lang] || NOTIF_TRANSLATIONS['en'];

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // 🟢 2. SWR FETCH LOGIC (Replaces onSnapshot)
  // ============================================================================
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async (silent = false) => {
      const cached = globalNotificationsCache[user.uid];
      const now = Date.now();

      if (cached && !silent) {
        setNotifications(cached.notifications);
        setLoading(false);
        if (now - cached.timestamp < CACHE_LIFESPAN) return;
      }

      if (!silent) setLoading(true);

      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );

        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
        
        setNotifications(data);
        globalNotificationsCache[user.uid] = { notifications: data, timestamp: Date.now() };
      } catch (e) {
        console.error("Error fetching notifications:", e);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  // ============================================================================
  // 🟢 3. ACTIONS (Optimistic UI Updates)
  // ============================================================================
  const handleRead = async (notification: Notification) => {
    if (notification.link) router.push(notification.link);
    
    if (!notification.read) {
      // Optimistic Update
      const updated = notifications.map(n => n.id === notification.id ? { ...n, read: true } : n);
      setNotifications(updated);
      if (globalNotificationsCache[user!.uid]) globalNotificationsCache[user!.uid].notifications = updated;

      try {
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
      } catch (e) { console.error(e); }
    }
  };

  const markAllRead = async () => {
    // Optimistic Update
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    if (globalNotificationsCache[user!.uid]) globalNotificationsCache[user!.uid].notifications = updated;

    const batch = writeBatch(db);
    let hasUpdates = false;

    notifications.forEach(n => {
      if (!n.read) {
        batch.update(doc(db, 'notifications', n.id), { read: true });
        hasUpdates = true;
      }
    });

    if (hasUpdates) await batch.commit();
  };

  const clearAll = async () => {
    if (!confirm(t.confirmClear)) return;
    
    // Optimistic Update
    setNotifications([]);
    if (globalNotificationsCache[user!.uid]) globalNotificationsCache[user!.uid].notifications = [];

    const batch = writeBatch(db);
    notifications.forEach(n => {
      batch.delete(doc(db, 'notifications', n.id));
    });
    await batch.commit();
  };

  // --- ICONS (Tactile Design) ---
  const getIcon = (type: string) => {
    const baseClass = "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-sm";
    switch (type) {
      case 'assignment': return <div className={`${baseClass} bg-blue-50 text-blue-500 border-blue-200`}><FileText size={24} strokeWidth={2.5}/></div>;
      case 'submission': return <div className={`${baseClass} bg-emerald-50 text-emerald-500 border-emerald-200`}><Trophy size={24} strokeWidth={2.5}/></div>;
      case 'request': return <div className={`${baseClass} bg-purple-50 text-purple-500 border-purple-200`}><UserPlus size={24} strokeWidth={2.5}/></div>;
      case 'result': return <div className={`${baseClass} bg-orange-50 text-orange-500 border-orange-200`}><Eye size={24} strokeWidth={2.5}/></div>;
      default: return <div className={`${baseClass} bg-zinc-100 text-zinc-500 border-zinc-200`}><Bell size={24} strokeWidth={2.5}/></div>;
    }
  };

  const getTimeString = (timestamp: any) => {
    if (!timestamp) return t.time.now;
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // --- TACTILE SKELETON ---
  if (loading) return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-24">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 pt-12">
        <div className="flex justify-between items-end animate-pulse mb-8">
           <div className="h-10 w-40 bg-zinc-200 rounded-xl"></div>
           <div className="h-10 w-24 bg-zinc-200 rounded-xl"></div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white rounded-[1.5rem] border-2 border-zinc-100 animate-pulse" />
        ))}
      </div>
    </div>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-28 md:pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 md:pt-10">
        
        {/* 🟢 HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
               <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-100 text-indigo-600 rounded-[1rem] md:rounded-[1.2rem] flex items-center justify-center border-2 border-indigo-200 shadow-sm shrink-0">
                 <Inbox size={28} strokeWidth={2.5}/>
               </div>
               {t.title}
            </h1>
            <p className="text-[14px] font-bold text-zinc-500 mt-2 uppercase tracking-widest pl-1">
              {t.subtitle} {unreadCount > 0 && <span className="text-indigo-500">• {unreadCount} New</span>}
            </p>
          </div>
          
          <div className="flex gap-2">
             <button 
               onClick={markAllRead} 
               disabled={unreadCount === 0}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 bg-white border-2 border-zinc-200 border-b-4 text-zinc-600 font-black text-[12px] uppercase tracking-widest rounded-xl hover:bg-zinc-50 hover:text-zinc-900 active:border-b-2 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
             >
               <Check size={16} strokeWidth={3} /> {t.dismiss}
             </button>
             <button 
               onClick={clearAll} 
               disabled={notifications.length === 0}
               className="flex items-center justify-center px-5 py-3 md:py-2.5 bg-red-50 text-red-500 border-2 border-red-200 border-b-4 font-black text-[12px] uppercase tracking-widest rounded-xl hover:bg-red-100 active:border-b-2 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
             >
               <Trash2 size={18} strokeWidth={3} className="md:hidden" />
               <span className="hidden md:inline">{t.clear}</span>
             </button>
          </div>
        </div>

        {/* 🟢 NOTIFICATIONS LIST */}
        <div className="space-y-4">
          <AnimatePresence mode='popLayout'>
            {notifications.length === 0 ? (
               <motion.div 
                 initial={{ opacity: 0, y: 20, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-zinc-300 shadow-sm"
               >
                  <div className="w-20 h-20 bg-zinc-100 text-zinc-400 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border-2 border-zinc-200 rotate-6">
                    <Sparkles size={36} strokeWidth={2.5}/>
                  </div>
                  <h3 className="text-zinc-900 font-black text-xl mb-2 tracking-tight">{t.emptyTitle}</h3>
                  <p className="text-zinc-500 font-bold text-[14px]">{t.emptyDesc}</p>
               </motion.div>
            ) : (
              notifications.map((n) => (
                <motion.div 
                  key={n.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  onClick={() => handleRead(n)}
                  className={`relative p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer group hover:shadow-md
                    ${!n.read 
                      ? 'bg-indigo-50/50 border-indigo-200 border-b-[6px] active:border-b-2 active:translate-y-[4px]' 
                      : 'bg-white border-zinc-200 border-b-[6px] active:border-b-2 active:translate-y-[4px] hover:border-indigo-300'
                    }
                  `}
                >
                  {/* "New" Badge */}
                  {!n.read && (
                    <span className="absolute top-4 right-4 bg-indigo-500 text-white text-[10px] font-black px-2.5 py-1 rounded-md tracking-widest shadow-sm">
                      {t.newBadge}
                    </span>
                  )}

                  <div className="flex items-start gap-4 relative z-10">
                    <div className="shrink-0 transition-transform group-hover:scale-105 duration-300">
                      {getIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                       <h3 className={`text-[15px] md:text-[17px] tracking-tight leading-tight pr-14 mb-1 ${!n.read ? 'font-black text-indigo-950' : 'font-bold text-zinc-800 group-hover:text-indigo-600 transition-colors'}`}>
                         {n.title}
                       </h3>
                       <p className={`text-[13px] md:text-[14px] leading-relaxed mb-3 ${!n.read ? 'text-indigo-900/80 font-medium' : 'text-zinc-500 font-medium'}`}>
                         {n.message}
                       </p>
                       
                       <div className="flex items-center gap-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5 bg-zinc-100/80 px-2 py-1 rounded-md border border-zinc-200/50">
                            <Clock size={14} strokeWidth={2.5}/> {getTimeString(n.createdAt)}
                          </span>
                          {n.link && (
                            <span className="text-indigo-500 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                              {t.time.view} <Eye size={14} strokeWidth={3}/>
                            </span>
                          )}
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}