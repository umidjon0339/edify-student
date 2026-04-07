'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
  Award, Flame, Zap, Calendar, ArrowLeft, User as UserIcon, 
  TrendingUp, Briefcase, MapPin, GraduationCap, Smile, Mail,Trophy, Star,X, Users, UserPlus, UserCheck, Loader2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStudentLanguage } from '@/app/(student)/layout'; 

// 🟢 1. IMPORT YOUR CLEAN SOCIAL ENGINE
import { toggleFollowUser } from '@/lib/social';

// --- TRANSLATION DICTIONARY ---
const PUBLIC_PROFILE_TRANSLATIONS: any = {
  uz: {
    loading: "Profil yuklanmoqda...", back: "Ortga", notFound: "Foydalanuvchi topilmadi", goBack: "Ortga qaytish",
    role: { teacher: "O'qituvchi", student: "O'quvchi", instructor: "Instruktor" },
    stats: { level: "Daraja", xp: "Jami XP", streak: "Kunlik Seriya", days: "kun" },
    labels: { email: "Pochta", location: "Manzil", birthDate: "Tug'ilgan sana", notProvided: "Kiritilmagan", info: "Shaxsiy Ma'lumotlar" },
    charts: { weekly: "Haftalik Natijalar (Siz vs U)", target: "Ular", you: "Siz" },
    genders: { male: "Erkak", female: "Ayol" },
    social: { followers: "Obunachilar", following: "Kuzatmoqda", follow: "Kuzatish", unfollow: "Kuzatishni to'xtatish", followBack: "Unga ham obuna bo'lish", loadMore: "Yana yuklash", emptyList: "Foydalanuvchilar topilmadi." }
  },
  en: {
    loading: "Loading profile...", back: "Back", notFound: "User not found", goBack: "Go Back",
    role: { teacher: "Teacher", student: "Student", instructor: "Instructor" },
    stats: { level: "Level", xp: "Total XP", streak: "Day Streak", days: "days" },
    labels: { email: "Email", location: "Location", birthDate: "Birth Date", notProvided: "Not provided", info: "Personal Info" },
    charts: { weekly: "Weekly Comparison (You vs Them)", target: "Them", you: "You" },
    genders: { male: "Male", female: "Female" },
    social: { followers: "Followers", following: "Following", follow: "Follow", unfollow: "Unfollow", followBack: "Follow Back", loadMore: "Load More", emptyList: "No users found." }
  },
  ru: {
    loading: "Загрузка профиля...", back: "Назад", notFound: "Пользователь не найден", goBack: "Вернуться",
    role: { teacher: "Учитель", student: "Ученик", instructor: "Инструктор" },
    stats: { level: "Уровень", xp: "Всего XP", streak: "Серия", days: "дн." },
    labels: { email: "Email", location: "Локация", birthDate: "Дата рождения", notProvided: "Не указано", info: "Личные данные" },
    charts: { weekly: "Сравнение за неделю (Вы vs Они)", target: "Они", you: "Вы" },
    genders: { male: "Мужской", female: "Женский" },
    social: { followers: "Подписчики", following: "Подписки", follow: "Подписаться", unfollow: "Отписаться", followBack: "Подписаться в ответ", loadMore: "Загрузить еще", emptyList: "Пользователи не найдены." }
  }
};

interface UserData {
  displayName?: string; username?: string; bio?: string; role?: string; gender?: string;
  location?: { region?: string, district?: string }; photoURL?: string; email?: string; birthDate?: string;
  totalXP: number; currentStreak: number; dailyHistory: Record<string, number>; 
  followersCount: number; followingCount: number;
}

const calculateTrueStreak = (dailyHistory: Record<string, number> | undefined) => {
  if (!dailyHistory) return 0;
  const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const formatDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  if (!dailyHistory[formatDate(today)] && !dailyHistory[formatDate(yesterday)]) return 0;
  let streakCount = 0; let checkDate = new Date(dailyHistory[formatDate(today)] ? today : yesterday);
  while (dailyHistory[formatDate(checkDate)] && dailyHistory[formatDate(checkDate)] > 0) { streakCount++; checkDate.setDate(checkDate.getDate() - 1); }
  return streakCount;
};

const generateComparisonData = (targetHistory: Record<string, number> | undefined, myHistory: Record<string, number> | undefined, lang: string, t: any) => {
  const data = []; const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(today.getDate() - i);
    const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' });
    data.push({ name: dayLabel.toUpperCase(), [t.charts.target]: targetHistory?.[dateStr] || 0, [t.charts.you]: myHistory?.[dateStr] || 0 });
  }
  return data;
};

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;
  
  const { lang } = useStudentLanguage();
  const t = PUBLIC_PROFILE_TRANSLATIONS[lang] || PUBLIC_PROFILE_TRANSLATIONS['en'];

  const [userData, setUserData] = useState<UserData | null>(null);
  const [myUserData, setMyUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  // 🟢 SOCIAL ENGINE STATES
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollower, setIsFollower] = useState(false); // Do they follow ME?
  const [isProcessingFollow, setIsProcessingFollow] = useState(false);

  // 🟢 PAGINATED MODAL STATES
  const [socialListType, setSocialListType] = useState<'followers' | 'following' | null>(null);
  const [socialUsers, setSocialUsers] = useState<any[]>([]);
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);
  const [lastSocialDoc, setLastSocialDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreSocial, setHasMoreSocial] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.uid === userId) {
      router.replace('/profile');
    }
  }, [currentUser, userId, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch the target user first (We need this to know if they exist)
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData({
            ...data,
            displayName: data.displayName || 'Student',
            totalXP: data.totalXP ?? data.xp ?? 0,
            currentStreak: calculateTrueStreak(data.dailyHistory),
            dailyHistory: data.dailyHistory || {},
            followersCount: data.followersCount || 0, 
            followingCount: data.followingCount || 0  
          } as UserData);
        } else {
          setUserData(null);
        }

        // 2. Fetch MY data and the Social Checks IN PARALLEL 🔥
        if (currentUser && currentUser.uid !== userId && docSnap.exists()) {
           const [myDocSnap, followDoc, followerDoc] = await Promise.all([
             getDoc(doc(db, 'users', currentUser.uid)),
             getDoc(doc(db, 'users', currentUser.uid, 'following', userId)),
             getDoc(doc(db, 'users', currentUser.uid, 'followers', userId))
           ]);

           if (myDocSnap.exists()) {
             setMyUserData({ ...myDocSnap.data(), dailyHistory: myDocSnap.data().dailyHistory || {} } as UserData);
           }
           setIsFollowing(followDoc.exists());
           setIsFollower(followerDoc.exists());
        }
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchData();
  }, [userId, currentUser]);

  // 🟢 FETCH PAGINATED USERS WHEN MODAL OPENS
  useEffect(() => {
    if (!socialListType) {
      setSocialUsers([]);
      setLastSocialDoc(null);
      setHasMoreSocial(false);
      return;
    }

    const loadInitialSocialUsers = async () => {
      setIsLoadingSocial(true);
      try {
        const q = query(
          collection(db, 'users', userId, socialListType),
          orderBy('followedAt', 'desc'),
          limit(10) // 🟢 Strict limit for 100k scale
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setLastSocialDoc(snap.docs[snap.docs.length - 1]);
          setHasMoreSocial(snap.docs.length === 10);
          
          // Fetch the actual profiles for these 10 edge documents
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
      } catch (error) {
        console.error("Error fetching social list", error);
      } finally {
        setIsLoadingSocial(false);
      }
    };

    loadInitialSocialUsers();
  }, [socialListType, userId]);

  // 🟢 LOAD MORE PAGINATION
  const handleLoadMoreSocialUsers = async () => {
    if (!lastSocialDoc || !socialListType) return;
    setIsLoadingSocial(true);
    try {
      const q = query(
        collection(db, 'users', userId, socialListType),
        orderBy('followedAt', 'desc'),
        startAfter(lastSocialDoc), // Start exactly where we left off
        limit(10)
      );
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
      } else {
        setHasMoreSocial(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingSocial(false);
    }
  };

  // 🟢 INFINITE SCROLL HANDLER
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    // If user scrolls within 50px of the bottom, load more!
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (hasMoreSocial && !isLoadingSocial) {
        handleLoadMoreSocialUsers();
      }
    }
  };

  // 🟢 THE TOGGLE FOLLOW FUNCTION
  const handleFollowToggle = async () => {
    if (!currentUser || !userData || isProcessingFollow) return;
    
    setIsProcessingFollow(true); 
    const previousState = isFollowing;
    
    setIsFollowing(!isFollowing);
    setUserData(prev => prev ? ({
      ...prev,
      followersCount: (prev.followersCount || 0) + (previousState ? -1 : 1) 
    }) : null);

    try {
      await toggleFollowUser(currentUser.uid, userId, previousState);
    } catch (error) {
      console.error("Follow failed", error);
      setIsFollowing(previousState);
      setUserData(prev => prev ? ({
        ...prev,
        followersCount: Math.max(0, (prev.followersCount || 0) + (previousState ? 1 : -1))
      }) : null);
    } finally {
      setIsProcessingFollow(false); 
    }
  };

  const currentLevel = Math.floor((userData?.totalXP || 0) / 1000) + 1;
  const comparisonData = useMemo(() => generateComparisonData(userData?.dailyHistory, myUserData?.dailyHistory, lang, t), [userData, myUserData, lang, t]);
  
  if (loading) {
    return (
      <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-12 animate-pulse">
        <div className="w-24 h-10 bg-zinc-200 rounded-xl mb-6"></div>
        <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 md:p-8 flex gap-6 md:gap-8 mb-6 h-48">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-zinc-200 shrink-0"></div>
          <div className="flex-1 space-y-4 pt-2">
            <div className="h-8 bg-zinc-200 rounded-lg w-1/3"></div>
            <div className="h-5 bg-zinc-200 rounded-lg w-1/4"></div>
            <div className="h-20 bg-zinc-200 rounded-xl w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!userData) return (
    <div className="w-full max-w-[800px] mx-auto px-4 py-20 text-center flex flex-col items-center">
      <div className="w-24 h-24 bg-zinc-100 rounded-3xl flex items-center justify-center text-zinc-400 mb-6 border-2 border-zinc-200"><UserIcon size={40} strokeWidth={3} /></div>
      <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight mb-2">{t.notFound}</h1>
      <button onClick={() => router.back()} className="mt-6 px-6 py-3 bg-white border-2 border-zinc-200 border-b-4 active:border-b-2 active:translate-y-[2px] rounded-xl text-zinc-600 font-black transition-all">
        {t.goBack}
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-12">
      
      {/* Back Button */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-black transition-all hover:-translate-x-1 mb-6 px-3 py-2 rounded-xl hover:bg-zinc-100 w-fit">
        <ArrowLeft size={18} strokeWidth={3} /> {t.back}
      </button>

      <div className="space-y-5 md:space-y-6">
        
        {/* ========================================= */}
        {/* 1. PREMIUM HEADER IDENTITY CARD */}
        {/* ========================================= */}
        <div className="bg-white border-2 border-zinc-200 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center md:items-stretch gap-8 md:gap-10 relative z-10">
            
            <div className="relative shrink-0 group">
              <div 
                onClick={() => userData?.photoURL ? setShowPhotoViewer(true) : null}
                className={`w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-1.5 shadow-xl flex items-center justify-center relative transition-transform ${userData?.photoURL ? 'cursor-pointer active:scale-95 hover:scale-105' : ''}`}
              >
                <div className="w-full h-full bg-white rounded-[2.2rem] flex items-center justify-center overflow-hidden border-4 border-white">
                  {userData?.photoURL ? (
                    <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl font-black text-violet-600 bg-violet-50 w-full h-full flex items-center justify-center">
                      {userData?.displayName?.charAt(0).toUpperCase() || 'S'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 w-full flex flex-col justify-between text-center md:text-left mt-2 md:mt-0">
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight mb-1 flex items-center justify-center md:justify-start gap-3">
                    {userData.displayName || 'Student'}
                  </h2>
                  {userData.username && <p className="text-[15px] font-bold text-zinc-500">@{userData.username}</p>}
                </div>
                
                {/* 🟢 DYNAMIC FOLLOW / FOLLOW BACK BUTTON */}
                {currentUser && currentUser.uid !== userId && (
                  <button 
                    onClick={handleFollowToggle}
                    disabled={isProcessingFollow}
                    className={`shrink-0 w-full lg:w-auto px-8 py-3.5 rounded-2xl font-black text-[14px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                      isFollowing 
                      ? 'bg-rose-50 text-rose-600 border-rose-200 border-b-4 hover:bg-rose-100 active:border-b-2 active:translate-y-[2px]' 
                      : 'bg-violet-600 text-white border-violet-800 border-b-4 hover:bg-violet-500 active:border-b-0 active:translate-y-[4px] shadow-sm'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <X size={18} strokeWidth={3} />
                        <span>{t.social.unfollow}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} strokeWidth={3} />
                        {/* THE FOLLOW BACK LOGIC */}
                        <span>{isFollower ? t.social.followBack : t.social.follow}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <div className="flex flex-col xl:flex-row gap-6 xl:items-end justify-between mt-auto">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 border-2 border-violet-100 rounded-xl font-black text-[11px] uppercase tracking-widest">
                      {userData.role === 'teacher' ? <Briefcase size={16} strokeWidth={3} /> : <GraduationCap size={16} strokeWidth={3} />} 
                      {userData.role === 'teacher' ? t.role.teacher : t.role.student}
                    </span>
                    
                    {userData.gender && (
                      <span title={userData.gender === 'male' ? t.genders.male : t.genders.female} className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 ${userData.gender === 'male' ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                        {userData.gender === 'male' ? <UserIcon size={16} strokeWidth={3}/> : <Smile size={16} strokeWidth={3}/>}
                      </span>
                    )}
                  </div>

                  {userData.bio ? (
                    <div className="bg-zinc-50 border-2 border-zinc-200/60 rounded-2xl p-5 text-[15px] font-bold text-zinc-600 max-w-lg mx-auto md:mx-0 text-center md:text-left relative inline-block">
                      <span className="absolute -top-4 -left-2 text-5xl font-serif text-zinc-300 select-none">"</span>
                      <span className="relative z-10 leading-relaxed block px-2 break-words">{userData.bio}</span>
                      <span className="absolute -bottom-6 -right-2 text-5xl font-serif text-zinc-300 select-none">"</span>
                    </div>
                  ) : (
                    <div className="text-[14px] font-bold text-zinc-400 italic">
                      {t.labels.notProvided} bio
                    </div>
                  )}
                </div>

                {/* 🟢 CLICKABLE SOCIAL STATS BOX */}
                <div className="bg-indigo-50 border-2 border-indigo-100 border-b-[6px] rounded-[1.5rem] p-5 shadow-sm flex items-center justify-around shrink-0 xl:w-72 mt-4 xl:mt-0">
                  <div 
                    onClick={() => setSocialListType('following')}
                    className="text-center w-1/2 cursor-pointer group hover:bg-indigo-100/50 p-2 rounded-xl transition-colors"
                  >
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">{t.social.following}</p>
                    <p className="text-3xl md:text-4xl font-black text-indigo-600 tracking-tight">{userData.followingCount || 0}</p>
                  </div>
                  <div className="w-1 h-12 bg-indigo-200/50 rounded-full shrink-0"></div>
                  <div 
                    onClick={() => setSocialListType('followers')}
                    className="text-center w-1/2 cursor-pointer group hover:bg-indigo-100/50 p-2 rounded-xl transition-colors"
                  >
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">{t.social.followers}</p>
                    <p className="text-3xl md:text-4xl font-black text-indigo-600 tracking-tight">{userData.followersCount || 0}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* 2. TACTILE STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border-2 border-zinc-200 p-5 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-[1rem] bg-amber-100 flex items-center justify-center text-amber-500 border-2 border-amber-200 mb-3"><Trophy size={24} strokeWidth={2.5}/></div>
            <p className="text-3xl font-black text-zinc-900 tracking-tight">{(userData.totalXP || 0).toLocaleString()}</p>
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t.stats.xp}</span>
          </div>
          <div className="bg-white rounded-3xl border-2 border-zinc-200 p-5 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-[1rem] bg-orange-100 flex items-center justify-center text-orange-500 border-2 border-orange-200 mb-3"><Flame size={24} strokeWidth={2.5}/></div>
            <p className={`text-3xl font-black tracking-tight ${userData.currentStreak > 0 ? 'text-orange-500' : 'text-zinc-900'}`}>{userData.currentStreak || 0}</p>
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t.stats.streak}</span>
          </div>
          <div className="bg-white rounded-3xl border-2 border-zinc-200 p-5 flex flex-col items-center text-center col-span-2 md:col-span-1">
            <div className="w-12 h-12 rounded-[1rem] bg-emerald-100 flex items-center justify-center text-emerald-500 border-2 border-emerald-200 mb-3"><Star size={24} strokeWidth={2.5}/></div>
            <p className="text-3xl font-black text-zinc-900 tracking-tight">{currentLevel}</p>
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t.stats.level}</span>
          </div>
        </div>

        {/* 3 & 4. CHARTS & INFO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* A. WEEKLY COMPARISON CHART */}
          <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-zinc-900 flex items-center gap-2 text-[16px] tracking-tight">
                <TrendingUp size={20} strokeWidth={3} className="text-blue-500" /> {t.charts.weekly}
              </h3>
            </div>
            
            {/* 🟢 RECHARTS FIX: Added style={{ minWidth: 0, minHeight: 0 }} */}
            <div className="w-full h-[220px] mt-2 relative" style={{ minWidth: 0, minHeight: 0 }}>
               <div className="absolute top-0 right-0 flex gap-4 z-10 bg-white/80 px-2 py-1 rounded-lg">
                 <div className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full bg-blue-500"></span><span className="text-[10px] font-black text-zinc-500 uppercase">{t.charts.target}</span></div>
                 {myUserData && <div className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full bg-zinc-300"></span><span className="text-[10px] font-black text-zinc-500 uppercase">{t.charts.you}</span></div>}
               </div>

              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={comparisonData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA', fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA', fontWeight: 900 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181B', borderRadius: '12px', border: 'none', color: '#fff', fontWeight: '900', fontSize: '13px', padding: '8px 12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }} cursor={{ stroke: '#E4E4E7', strokeWidth: 2, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey={t.charts.target} stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3 }} />
                  {myUserData && <Line type="monotone" dataKey={t.charts.you} stroke="#D4D4D8" strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={{ r: 5, fill: '#D4D4D8', stroke: '#fff', strokeWidth: 2 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* B. INFO CARD */}
          <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 flex flex-col shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-[14px] flex items-center justify-center text-emerald-500 border-2 border-emerald-100">
                <UserIcon size={20} strokeWidth={2.5}/>
              </div>
              <h3 className="font-black text-zinc-900 text-[16px] tracking-tight">{t.labels.info}</h3>
            </div>
            
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Mail size={16} strokeWidth={2.5}/> {t.labels.email}</span>
                <span className="text-zinc-900 font-black text-[14px] truncate max-w-[180px]">{userData.email || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}</span>
              </div>
              <div className="h-0.5 w-full bg-zinc-100"></div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={16} strokeWidth={2.5}/> {t.labels.location}</span>
                <span className="text-zinc-900 font-black text-[14px] text-right truncate max-w-[180px]">{[userData.location?.district, userData.location?.region].filter(Boolean).join(', ') || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}</span>
              </div>
              <div className="h-0.5 w-full bg-zinc-100"></div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={16} strokeWidth={2.5}/> {t.labels.birthDate}</span>
                <span className="text-zinc-900 font-black text-[14px]">{userData.birthDate || <span className="text-zinc-400 italic">{t.labels.notProvided}</span>}</span>
              </div>
            </div>
          </div>
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
              {/* HEADER */}
              <div className="px-6 py-5 border-b-2 border-zinc-100 flex justify-between items-center bg-white z-10 shrink-0">
                <h3 className="text-xl font-black text-zinc-900 tracking-tight capitalize">
                  {socialListType === 'followers' ? t.social.followers : t.social.following}
                </h3>
                <button onClick={() => setSocialListType(null)} className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 active:scale-95 transition-all">
                  <X size={20} strokeWidth={3}/>
                </button>
              </div>

              {/* 🟢 INFINITE SCROLL CONTAINER */}
              <div 
                onScroll={handleScroll} 
                className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-zinc-50/50"
              >
                {socialUsers.length === 0 && !isLoadingSocial ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                    <Users size={48} strokeWidth={2} className="mb-4 opacity-40"/>
                    <p className="font-bold text-[15px]">{t.social.emptyList}</p>
                  </div>
                ) : (
                  socialUsers.map((user) => (
                    
                    /* 🟢 NEW PREMIUM USER CARD */
                    <div 
                      key={user.id}
                      onClick={() => {
                        setSocialListType(null);
                        router.push(`/profile/${user.id}`);
                      }}
                      className="bg-white p-5 rounded-[1.5rem] border-2 border-zinc-100 flex items-center gap-4 cursor-pointer hover:border-violet-200 hover:shadow-md transition-all active:scale-95 group"
                    >
                      {/* Bigger Avatar */}
                      <div className="w-14 h-14 rounded-[1.2rem] bg-zinc-100 flex items-center justify-center overflow-hidden border-2 border-zinc-50 shrink-0 shadow-sm">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-black text-xl text-zinc-400">{user.displayName?.charAt(0).toUpperCase() || 'S'}</span>
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-zinc-900 text-[16px] leading-tight truncate group-hover:text-violet-600 transition-colors">
                          {user.displayName || 'Student'}
                        </p>
                        {user.username && <p className="text-[14px] font-bold text-zinc-400 truncate mt-0.5">@{user.username}</p>}
                      </div>

                      {/* 🟢 XP BADGE */}
                      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 border-2 border-amber-100 rounded-xl">
                         <Trophy size={16} strokeWidth={3} className="drop-shadow-sm" />
                         <span className="font-black text-[13px]">{user.totalXP?.toLocaleString() || 0}</span>
                      </div>
                    </div>

                  ))
                )}

                {/* Loading Spinner at the bottom while fetching next 10 */}
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
      <AnimatePresence>
        {showPhotoViewer && userData?.photoURL && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm" onClick={() => setShowPhotoViewer(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="relative w-full max-w-sm aspect-square rounded-[2.5rem] bg-zinc-100 overflow-hidden shadow-2xl border-4 border-white z-10">
              <img src={userData.photoURL} alt="Full Profile" className="w-full h-full object-cover" />
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-end items-center bg-gradient-to-b from-zinc-900/60 to-transparent">
                <button onClick={() => setShowPhotoViewer(false)} className="w-10 h-10 rounded-full bg-zinc-900/40 text-white flex items-center justify-center hover:bg-zinc-900/60 backdrop-blur-md transition-colors"><X size={20} strokeWidth={3}/></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}