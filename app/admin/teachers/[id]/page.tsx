"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc, updateDoc, limit, startAfter, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { 
  ArrowLeft, ShieldCheck, ShieldAlert, Loader2, 
  Users, School, Lock, Unlock, FileText, Clock, Trash2, LayoutList,
  Eye, X, Settings, ListChecks, CreditCard, Ban, CheckCircle, ChevronDown,
  Copy // 🟢 IMPORTED COPY ICON
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

import MembershipTab from "./_components/MembershipTab";
import OverviewTab from "./_components/OverviewTab";

const PAGE_SIZE = 10;

// 🟢 NEW: Reusable Click-to-Copy Component for Admin IDs
function CopyIdButton({ id, label = "ID" }: { id: string, label?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success(`${label} copied!`, { id: 'copy-toast', duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 mt-1 group w-fit cursor-pointer" onClick={handleCopy} title={`Copy ${label}`}>
      <span className="text-[10px] font-mono text-[#64748B] group-hover:text-[#94A3B8] transition-colors">{label}: {id}</span>
      {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} className="text-[#334155] group-hover:text-[#3B82F6] transition-colors" />}
    </div>
  );
}

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Profile State
  const [teacher, setTeacher] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'tests' | 'membership'>('overview');
  
  // Classes Pagination State
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [lastClassDoc, setLastClassDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreClasses, setHasMoreClasses] = useState(true);

  // Tests Pagination State
  const [tests, setTests] = useState<any[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [lastTestDoc, setLastTestDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreTests, setHasMoreTests] = useState(true);

  const [selectedTestToView, setSelectedTestToView] = useState<any | null>(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

  // 1. Fetch Profile ONLY
  const fetchTeacherProfile = useCallback(async () => {
    try {
      const docRef = doc(db, "users", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().role === "teacher") {
        setTeacher({ id: docSnap.id, ...docSnap.data() });
      } else {
        setTeacher(null); 
      }
    } catch (error) {
      toast.error("Failed to fetch teacher profile.");
    } finally {
      setLoadingProfile(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchTeacherProfile();
  }, [id, fetchTeacherProfile]);

  // 2. Lazy Fetch Classes
  const fetchClasses = async (isLoadMore = false) => {
    if (!id || (!hasMoreClasses && isLoadMore)) return;
    setLoadingClasses(true);
    try {
      let q = query(collection(db, "classes"), where("teacherId", "==", id), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
      if (isLoadMore && lastClassDoc) q = query(q, startAfter(lastClassDoc));
      
      const snap = await getDocs(q);
      if (!snap.empty) {
        setLastClassDoc(snap.docs[snap.docs.length - 1]);
        const newClasses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClasses(prev => isLoadMore ? [...prev, ...newClasses] : newClasses);
        setHasMoreClasses(snap.docs.length === PAGE_SIZE);
      } else {
        setHasMoreClasses(false);
        if (!isLoadMore) setClasses([]);
      }
    } catch (error) { toast.error("Failed to load classes."); } 
    finally { setLoadingClasses(false); }
  };

  // 3. Lazy Fetch Tests
  const fetchTests = async (isLoadMore = false) => {
    if (!id || (!hasMoreTests && isLoadMore)) return;
    setLoadingTests(true);
    try {
      let q = query(collection(db, "custom_tests"), where("teacherId", "==", id), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
      if (isLoadMore && lastTestDoc) q = query(q, startAfter(lastTestDoc));

      const snap = await getDocs(q);
      if (!snap.empty) {
        setLastTestDoc(snap.docs[snap.docs.length - 1]);
        const newTests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTests(prev => isLoadMore ? [...prev, ...newTests] : newTests);
        setHasMoreTests(snap.docs.length === PAGE_SIZE);
      } else {
        setHasMoreTests(false);
        if (!isLoadMore) setTests([]);
      }
    } catch (error) { toast.error("Failed to load tests."); } 
    finally { setLoadingTests(false); }
  };

  // 4. Listen to Tab Changes for Lazy Loading
  useEffect(() => {
    if (activeTab === 'classes' && classes.length === 0 && hasMoreClasses) fetchClasses();
    if (activeTab === 'tests' && tests.length === 0 && hasMoreTests) fetchTests();
  }, [activeTab]);


  const handleToggleAccountStatus = async () => {
    if (!teacher) return;
    const newStatus = !teacher.isActive;
    const action = newStatus ? "activate" : "BAN";
    if(!confirm(`Are you sure you want to ${action} this teacher?`)) return;
    
    try {
      await updateDoc(doc(db, "users", id), { isActive: newStatus });
      setTeacher((prev: any) => ({ ...prev, isActive: newStatus }));
      toast.success(`Account ${newStatus ? 'activated' : 'banned'} successfully!`);
    } catch (error) { toast.error("Failed to update account status."); }
  };

  const handleDeleteTeacherAccount = async () => {
    if (!teacher) return;
    if (!confirm(`DANGER: Are you sure you want to COMPLETELY WIPE ${teacher.displayName}'s account and ALL their data? This CANNOT be undone.`)) return;
    
    const securityCheck = prompt(`To confirm deletion, type the word "DELETE" below:`);
    if (securityCheck !== "DELETE") {
      toast.error("Deletion cancelled. You did not type DELETE.");
      return;
    }

    setIsDeletingTeacher(true);
    const toastId = toast.loading("Wiping teacher account and all subcollections securely...");

    try {
      const functions = getFunctions();
      const deleteAccountAPI = httpsCallable(functions, 'deleteAccountAPI');
      await deleteAccountAPI({ targetUid: id });
      toast.success("Teacher account successfully purged.", { id: toastId });
      router.push('/admin/teachers'); 
    } catch (error: any) {
      toast.error(error?.message || "Deletion failed. Make sure you are a Super Admin.", { id: toastId });
      setIsDeletingTeacher(false); 
    }
  };

  const handleDeleteTest = async (testId: string, testTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete the test "${testTitle}"?`)) return;
    try {
      await deleteDoc(doc(db, 'custom_tests', testId));
      setTests(prev => prev.filter(t => t.id !== testId));
      if (selectedTestToView?.id === testId) setSelectedTestToView(null);
      setTeacher((prev: any) => ({ ...prev, customTestCount: Math.max(0, (prev.customTestCount || 1) - 1) }));
      toast.success("Test deleted successfully.");
    } catch (error) { toast.error("Failed to delete test."); }
  };

  if (loadingProfile) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="animate-spin text-[#3B82F6] w-12 h-12" /></div>;
  if (!teacher) return <div className="text-center py-20"><h2 className="text-2xl font-bold text-white mb-4">Teacher not found.</h2><Link href="/admin/teachers" className="text-[#3B82F6] hover:underline font-bold">Return to Directory</Link></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {selectedTestToView && (
        <AdminTestModal test={selectedTestToView} onClose={() => setSelectedTestToView(null)} onDelete={() => handleDeleteTest(selectedTestToView.id, selectedTestToView.title)}/>
      )}

      {/* Top Nav & God Mode */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Link href="/admin/teachers" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition font-medium w-fit bg-[#1E293B] px-4 py-2 rounded-xl border border-[#334155]">
          <ArrowLeft size={16} /> Back to Directory
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={handleToggleAccountStatus} disabled={isDeletingTeacher} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${teacher.isActive ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'} disabled:opacity-50`}>
            {teacher.isActive ? <><Ban size={18}/> Suspend Account</> : <><CheckCircle size={18}/> Activate Account</>}
          </button>
          <button onClick={handleDeleteTeacherAccount} disabled={isDeletingTeacher} className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 bg-red-600/10 text-red-500 border border-red-600/20 hover:bg-red-600/20 disabled:opacity-50">
            {isDeletingTeacher ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} Delete Teacher
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 flex flex-col md:flex-row gap-8 items-start md:items-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative shrink-0">
          {teacher.photoURL ? <img src={teacher.photoURL} alt="Profile" className="w-28 h-28 rounded-full object-cover border-4 border-[#0F172A] shadow-xl" /> : <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#3B82F6] to-indigo-500 flex items-center justify-center text-white text-4xl font-black border-4 border-[#0F172A] shadow-xl">{teacher.displayName?.charAt(0).toUpperCase() || 'T'}</div>}
          <div className="absolute -bottom-2 -right-2 bg-[#0F172A] rounded-full p-1.5 border border-[#334155]">
            {teacher.verifiedTeacher ? <ShieldCheck className="text-emerald-400" size={24} /> : <ShieldAlert className="text-amber-400" size={24} />}
          </div>
        </div>
        <div className="flex-1 relative z-10">
          <h1 className="text-3xl font-black text-white mb-1">{teacher.displayName}</h1>
          <p className="text-[#94A3B8] font-medium text-lg">@{teacher.username}</p>
          
          {/* 🟢 TEACHER ID COPY BADGE */}
          <div className="mb-4">
             <CopyIdButton id={teacher.id} label="User ID" />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${teacher.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {teacher.isActive ? 'Status: Active' : 'Status: Suspended'}
            </span>
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#0F172A] text-[#94A3B8] border border-[#334155]">Joined {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : 'Unknown'}</span>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${teacher.planId === 'pro' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : teacher.subscriptionStatus === 'trialing' ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              Plan: {teacher.planId === 'pro' ? 'PRO' : teacher.subscriptionStatus === 'trialing' ? 'TRIAL' : 'FREE'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1.5 bg-[#1E293B] rounded-2xl border border-[#334155] overflow-x-auto hide-scrollbar shadow-inner">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'classes', label: 'Classes', count: teacher.activeClassCount || 0 },
          { id: 'tests', label: 'Tests Library', count: teacher.customTestCount || 0 },
          { id: 'membership', label: 'Membership & AI', icon: CreditCard }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#3B82F6] text-white shadow-md' : 'text-[#94A3B8] hover:bg-[#0F172A] hover:text-white'}`}>
            {tab.icon && <tab.icon size={16} className={activeTab === tab.id ? 'text-white' : 'text-[#94A3B8]'} />}
            {tab.label}
            {tab.count !== undefined && <span className={`px-2 py-0.5 rounded-lg text-xs ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#0F172A] text-[#94A3B8] border border-[#334155]'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {activeTab === 'overview' && <OverviewTab teacher={teacher} onUpdated={fetchTeacherProfile} />}
        {activeTab === 'membership' && <MembershipTab teacher={teacher} onUpdated={fetchTeacherProfile} />}
        
        {activeTab === 'classes' && (
          <div className="bg-[#1E293B] rounded-2xl border border-[#334155] overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0F172A] text-[#94A3B8] text-xs font-bold uppercase tracking-wider border-b border-[#334155]">
                    <th className="p-5">Class Info & ID</th>
                    <th className="p-5">Join Code</th>
                    <th className="p-5 text-center">Students</th>
                    <th className="p-5 text-center">Status</th>
                    <th className="p-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]">
                  {classes.length === 0 && !loadingClasses ? (
                    <tr><td colSpan={5} className="p-10 text-center text-[#94A3B8] font-medium">No classes created yet.</td></tr>
                  ) : (
                    classes.map((cls) => (
                      <tr key={cls.id} className="hover:bg-[#0F172A]/50 transition-colors">
                        <td className="p-5">
                          <p className="text-white font-bold flex items-center gap-2.5"><School size={18} className="text-[#3B82F6]" />{cls.title}</p>
                          {/* 🟢 CLASS ID COPY BADGE */}
                          <CopyIdButton id={cls.id} label="Class ID" />
                        </td>
                        <td className="p-5"><span className="bg-[#0F172A] text-[#3B82F6] font-mono font-bold px-3 py-1.5 rounded-lg border border-[#334155]">{cls.joinCode}</span></td>
                        <td className="p-5 text-center"><div className="flex items-center justify-center gap-2 text-white font-bold text-lg"><Users size={16} className="text-[#94A3B8]"/> {cls.studentIds?.length || 0}</div></td>
                        <td className="p-5 text-center">
                          {cls.isLocked ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20"><Lock size={12} /> Locked</span> : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20"><Unlock size={12} /> Open</span>}
                        </td>
                        <td className="p-5 text-right">
                          <Link href={`/admin/classes/${cls.id}`} className="inline-flex px-4 py-2 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] font-bold hover:bg-[#3B82F6]/20 transition-all items-center text-sm border border-[#3B82F6]/20">View Class</Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {hasMoreClasses && (
              <div className="p-4 bg-[#0F172A] border-t border-[#334155] flex justify-center">
                <button onClick={() => fetchClasses(true)} disabled={loadingClasses} className="flex items-center gap-2 px-6 py-2.5 bg-[#1E293B] border border-[#334155] text-white text-sm font-bold rounded-xl hover:bg-[#334155] transition disabled:opacity-50">
                  {loadingClasses ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />} Load More Classes
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="bg-[#1E293B] rounded-2xl border border-[#334155] overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0F172A] text-[#94A3B8] text-xs font-bold uppercase tracking-wider border-b border-[#334155]">
                    <th className="p-5">Test Info & ID</th>
                    <th className="p-5 text-center">Questions</th>
                    <th className="p-5 text-center">Duration</th>
                    <th className="p-5">Created On</th>
                    <th className="p-5 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]">
                  {tests.length === 0 && !loadingTests ? (
                    <tr><td colSpan={5} className="p-10 text-center text-[#94A3B8] font-medium">No tests created yet.</td></tr>
                  ) : (
                    tests.map((test) => (
                      <tr key={test.id} className="hover:bg-[#0F172A]/50 transition-colors">
                        <td className="p-5">
                          <p className="text-white font-bold flex items-center gap-2.5 mb-1">
                            <LayoutList size={18} className="text-emerald-400" />
                            {test.title}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${test.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>{test.status || 'active'}</span>
                            <span className="text-[#334155]">•</span>
                            {/* 🟢 TEST ID COPY BADGE */}
                            <div className="-mt-1"><CopyIdButton id={test.id} label="Test ID" /></div>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <span className="text-white font-bold bg-[#0F172A] px-4 py-2 rounded-xl border border-[#334155]">
                            {test.questionCount || (test.questions ? test.questions.length : 0)}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          <span className="text-[#94A3B8] font-medium flex items-center justify-center gap-1.5">
                            <Clock size={16} />
                            {test.duration ? <span className="text-white">{test.duration} mins</span> : 'No Limit'}
                          </span>
                        </td>
                        <td className="p-5 text-white font-medium text-sm">
                          {test.createdAt ? new Date(test.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                        </td>
                        <td className="p-5 text-right space-x-3">
                          <button onClick={() => setSelectedTestToView(test)} className="px-4 py-2 bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 text-sm font-bold rounded-xl hover:bg-[#3B82F6]/20 transition inline-flex items-center gap-2">
                            <Eye size={16} /> Inspect
                          </button>
                          <button onClick={() => handleDeleteTest(test.id, test.title)} className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-bold rounded-xl hover:bg-red-500/20 transition inline-flex items-center gap-2">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {hasMoreTests && (
              <div className="p-4 bg-[#0F172A] border-t border-[#334155] flex justify-center">
                <button onClick={() => fetchTests(true)} disabled={loadingTests} className="flex items-center gap-2 px-6 py-2.5 bg-[#1E293B] border border-[#334155] text-white text-sm font-bold rounded-xl hover:bg-[#334155] transition disabled:opacity-50">
                  {loadingTests ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />} Load More Tests
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL SUB-COMPONENT
// ----------------------------------------------------------------------
function AdminTestModal({ test, onClose, onDelete }: { test: any, onClose: () => void, onDelete: () => void }) {
  const [tab, setTab] = useState<'questions' | 'settings'>('questions');
  const questions = test.questions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-[#1E293B] border border-[#334155] rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-8 py-5 border-b border-[#334155] flex justify-between items-center bg-[#0F172A]">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
               <FileText className="text-[#3B82F6]" size={24}/> {test.title}
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              <p className="text-sm text-[#94A3B8] font-mono bg-[#1E293B] px-3 py-1 rounded-lg border border-[#334155]">Code: <span className="text-white font-bold">{test.accessCode}</span></p>
              {/* 🟢 ADDED ID TO MODAL AS WELL */}
              <CopyIdButton id={test.id} label="Test ID" />
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-[#1E293B] rounded-xl text-[#94A3B8] transition-colors"><X size={24}/></button>
        </div>
        <div className="flex border-b border-[#334155] bg-[#0F172A] px-4 pt-4 gap-2">
          <button onClick={() => setTab('questions')} className={`px-6 py-3 text-sm font-bold rounded-t-xl transition-colors flex items-center gap-2 ${tab === 'questions' ? 'bg-[#1E293B] text-[#3B82F6] border-t border-l border-r border-[#334155]' : 'text-[#94A3B8] hover:text-white'}`}>
            <ListChecks size={18} /> Questions ({questions.length})
          </button>
          <button onClick={() => setTab('settings')} className={`px-6 py-3 text-sm font-bold rounded-t-xl transition-colors flex items-center gap-2 ${tab === 'settings' ? 'bg-[#1E293B] text-[#3B82F6] border-t border-l border-r border-[#334155]' : 'text-[#94A3B8] hover:text-white'}`}>
            <Settings size={18} /> Configuration
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0F172A]">
          {tab === 'questions' && (
            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-20 text-[#94A3B8] text-lg font-medium">No questions found in this test.</div>
              ) : (
                questions.map((q: any, idx: number) => (
                  <div key={q.id || idx} className="bg-[#1E293B] p-6 rounded-2xl border border-[#334155]">
                     <div className="flex items-start gap-4">
                        <span className="w-10 h-10 shrink-0 bg-[#0F172A] text-white rounded-xl flex items-center justify-center font-black border border-[#334155]">
                          {idx + 1}
                        </span>
                        <div>
                           <p className="text-white font-medium text-base leading-relaxed mb-4">
                             {q.text || (typeof q.question === 'object' ? q.question.uz : q.question) || "Question Text"}
                           </p>
                           <span className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider border ${
                             q.uiDifficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                             q.uiDifficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                             'bg-red-500/10 text-red-400 border-red-500/20'
                           }`}>
                             {q.uiDifficulty || "Unknown Difficulty"}
                           </span>
                        </div>
                     </div>
                  </div>
                ))
              )}
            </div>
          )}
          {tab === 'settings' && (
            <div className="space-y-6 max-w-2xl mx-auto">
               <div className="bg-[#1E293B] p-6 rounded-2xl border border-[#334155] space-y-5">
                  <div className="flex justify-between items-center pb-4 border-b border-[#334155]">
                    <span className="text-[#94A3B8] font-medium">Duration</span>
                    <span className="text-white font-black text-lg">{test.duration ? `${test.duration} Minutes` : "Unlimited"}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-[#334155]">
                    <span className="text-[#94A3B8] font-medium">Questions Shuffled</span>
                    <span className="text-white font-black text-lg">{test.shuffle ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-[#334155]">
                    <span className="text-[#94A3B8] font-medium">Results Visibility</span>
                    <span className="text-white font-black text-lg capitalize">{test.resultsVisibility?.replace('_', ' ') || "Never"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#94A3B8] font-medium">Status</span>
                    <span className="text-emerald-400 font-black text-lg capitalize">{test.status || "Active"}</span>
                  </div>
               </div>
               <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/20 mt-8">
                  <h3 className="text-red-400 font-bold mb-2 text-lg">Danger Zone</h3>
                  <p className="text-sm text-[#94A3B8] mb-6">If this test violates platform policies or contains inappropriate content, delete it permanently.</p>
                  <button onClick={onDelete} className="w-full py-3.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-bold transition flex items-center justify-center gap-2 border border-red-500/20">
                    <Trash2 size={18} /> Delete Test from Database
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}