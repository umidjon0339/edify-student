"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TeacherUser } from "@/types/user";
import { 
  ArrowLeft, Mail, Phone, MapPin, Building2, BookOpen, 
  Award, Briefcase, Calendar, ShieldCheck, ShieldAlert, Loader2, 
  Users, School, Lock, Unlock, FileText, Clock, Trash2, LayoutList,
  Eye, X, Settings, ListChecks, CreditCard
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import MembershipTab from "./_components/MembershipTab"; // 🟢 IMPORTED COMPONENT

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // 🟢 States
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingSubData, setLoadingSubData] = useState(true);
  
  // 🟢 Tab & Modal State (Added 'membership')
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'tests' | 'membership'>('overview');
  const [selectedTestToView, setSelectedTestToView] = useState<any | null>(null);

  // 🟢 Extracted Fetch Logic (So we can refresh data after editing membership)
  const fetchTeacherData = useCallback(async () => {
    setLoadingSubData(true);
    try {
      // 1. Fetch Teacher Profile
      const docRef = doc(db, "users", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().role === "teacher") {
        setTeacher({ id: docSnap.id, ...docSnap.data() } as TeacherUser);
      } else {
        setTeacher(null); 
      }

      // 2. Fetch Classes
      const qClasses = query(collection(db, "classes"), where("teacherId", "==", id));
      const classSnap = await getDocs(qClasses);
      setClasses(classSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 3. Fetch Tests
      const qTests = query(
        collection(db, "custom_tests"), 
        where("teacherId", "==", id),
        orderBy("createdAt", "desc")
      );
      const testSnap = await getDocs(qTests);
      setTests(testSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setLoadingSubData(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchTeacherData();
    }
  }, [id, fetchTeacherData]);

  // --- ADMIN ACTIONS ---
  const handleDeleteTest = async (testId: string, testTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete the test "${testTitle}"? This cannot be undone.`)) return;
    
    try {
      await deleteDoc(doc(db, 'custom_tests', testId));
      setTests(prev => prev.filter(t => t.id !== testId));
      if (selectedTestToView?.id === testId) setSelectedTestToView(null);
      toast.success("Test deleted successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete test.");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#3B82F6] w-12 h-12" /></div>;
  }

  if (!teacher) {
    return (
      <div className="text-center p-20">
        <h2 className="text-2xl font-bold text-white">Teacher not found</h2>
        <button onClick={() => router.push("/admin/teachers")} className="mt-4 text-[#3B82F6] hover:underline">Go back to teachers</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* AUDIT TEST MODAL */}
      {selectedTestToView && (
        <AdminTestModal 
          test={selectedTestToView} 
          onClose={() => setSelectedTestToView(null)} 
          onDelete={() => handleDeleteTest(selectedTestToView.id, selectedTestToView.title)}
        />
      )}

      {/* Top Nav */}
      <Link href="/admin/teachers" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition font-medium">
        <ArrowLeft size={18} /> Back to Teachers
      </Link>

      {/* Profile Header */}
      <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-8 flex flex-col md:flex-row gap-6 items-start md:items-center shadow-lg">
        {teacher.photoURL ? (
          <img src={teacher.photoURL} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-[#0F172A]" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] text-3xl font-black border-4 border-[#0F172A]">
            {teacher.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white">{teacher.displayName}</h1>
            {teacher.verifiedTeacher ? (
              <ShieldCheck className="text-emerald-400" size={28} title="Verified Teacher" />
            ) : (
              <ShieldAlert className="text-amber-400" size={28} title="Unverified" />
            )}
          </div>
          <p className="text-[#3B82F6] font-medium text-lg">@{teacher.username}</p>
          <div className="mt-3 flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${teacher.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {teacher.isActive ? 'Account Active' : 'Account Banned'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#334155] text-white">
              Joined {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : 'Unknown'}
            </span>
            {/* 🟢 Status Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              teacher.planId === 'pro' ? 'bg-amber-500/10 text-amber-400' : 
              teacher.subscriptionStatus === 'trialing' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 
              'bg-slate-500/10 text-slate-400'
            }`}>
              {teacher.planId === 'pro' ? 'PRO' : teacher.subscriptionStatus === 'trialing' ? 'TRIAL' : 'FREE'}
            </span>
          </div>
        </div>
      </div>

      {/* 🟢 TABS NAVIGATION */}
      <div className="flex gap-4 border-b border-[#334155] overflow-x-auto hide-scrollbar">
        <button onClick={() => setActiveTab('overview')} className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}>Overview</button>
        <button onClick={() => setActiveTab('classes')} className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'classes' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}>
          Classes <span className="bg-[#334155] text-white px-2 py-0.5 rounded-full text-xs">{classes.length}</span>
        </button>
        <button onClick={() => setActiveTab('tests')} className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'tests' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}>
          Tests Library <span className="bg-[#334155] text-white px-2 py-0.5 rounded-full text-xs">{tests.length}</span>
        </button>
        {/* NEW MEMBERSHIP TAB */}
        <button onClick={() => setActiveTab('membership')} className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'membership' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}>
          <CreditCard size={16} className={activeTab === 'membership' ? 'text-[#3B82F6]' : 'text-[#94A3B8]'}/> Membership
        </button>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="space-y-6">
            <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6 shadow-lg">
               <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Award size={18} className="text-[#3B82F6]"/> Platform Stats</h3>
               <div className="space-y-4">
                  <StatRow label="Active Classes" value={classes.length} />
                  <StatRow label="Total Students" value={classes.reduce((acc, curr) => acc + (curr.studentIds?.length || 0), 0)} />
                  <StatRow label="Tests Created" value={tests.length} />
               </div>
            </div>

            <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6 shadow-lg">
               <h3 className="text-white font-bold mb-4 flex items-center gap-2"><MapPin size={18} className="text-[#3B82F6]"/> Location</h3>
               <p className="text-white font-medium">{teacher.location?.district || "N/A"}</p>
               <p className="text-[#94A3B8] text-sm">{teacher.location?.region || "N/A"}, {teacher.location?.country}</p>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6 shadow-lg">
              <h3 className="text-white font-bold mb-4">Professional Background</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoBlock icon={<BookOpen/>} label="Subject" value={teacher.subject} className="capitalize" />
                <InfoBlock icon={<Building2/>} label="Institution" value={teacher.institution} />
                <InfoBlock icon={<Briefcase/>} label="Experience" value={`${teacher.experience} Years`} />
                <InfoBlock icon={<Award/>} label="Qualification" value={teacher.qualification} />
                <InfoBlock icon={<BookOpen/>} label="Education" value={teacher.education} />
              </div>
              {teacher.bio && (
                <div className="mt-6 p-4 bg-[#0F172A] rounded-xl border border-[#334155]">
                  <p className="text-xs text-[#94A3B8] font-bold uppercase mb-2">Biography</p>
                  <p className="text-white text-sm leading-relaxed">{teacher.bio}</p>
                </div>
              )}
            </div>

            <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6 shadow-lg">
              <h3 className="text-white font-bold mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoBlock icon={<Mail/>} label="Email Address" value={teacher.email} />
                <InfoBlock icon={<Phone/>} label="Phone Number" value={teacher.phone} />
                <InfoBlock icon={<Calendar/>} label="Date of Birth" value={teacher.birthDate} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CLASSES */}
      {activeTab === 'classes' && (
        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] overflow-hidden shadow-lg animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#0F172A] text-[#94A3B8] text-sm uppercase tracking-wide border-b border-[#334155]">
                  <th className="p-5 font-semibold">Class Name</th>
                  <th className="p-5 font-semibold">Join Code</th>
                  <th className="p-5 font-semibold text-center">Students</th>
                  <th className="p-5 font-semibold text-center">Status</th>
                  <th className="p-5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {loadingSubData ? (
                  <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-[#3B82F6]" size={24} /></td></tr>
                ) : classes.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-[#94A3B8]">This teacher has not created any classes yet.</td></tr>
                ) : (
                  classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-[#0F172A]/50 transition-colors">
                      <td className="p-4">
                        <p className="text-white font-bold flex items-center gap-2"><School size={16} className="text-[#3B82F6]" />{cls.title}</p>
                      </td>
                      <td className="p-4"><span className="bg-[#0F172A] text-[#3B82F6] font-mono font-bold px-3 py-1.5 rounded-lg border border-[#334155]">{cls.joinCode}</span></td>
                      <td className="p-4 text-center"><div className="flex items-center justify-center gap-2 text-white font-bold text-lg"><Users size={16} className="text-[#94A3B8]"/> {cls.studentIds ? cls.studentIds.length : 0}</div></td>
                      <td className="p-4 text-center">
                        {cls.isLocked ? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold"><Lock size={12} /> Locked</span> : <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold"><Unlock size={12} /> Open</span>}
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/admin/classes/${cls.id}`} className="inline-flex px-4 py-2 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] font-bold hover:bg-[#3B82F6]/20 transition-all items-center gap-1 text-sm">View Class</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TESTS LIBRARY */}
      {activeTab === 'tests' && (
        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] overflow-hidden shadow-lg animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#0F172A] text-[#94A3B8] text-sm uppercase tracking-wide border-b border-[#334155]">
                  <th className="p-5 font-semibold">Test Title</th>
                  <th className="p-5 font-semibold text-center">Questions</th>
                  <th className="p-5 font-semibold text-center">Duration</th>
                  <th className="p-5 font-semibold">Created On</th>
                  <th className="p-5 font-semibold text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {loadingSubData ? (
                  <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-emerald-400" size={24} /></td></tr>
                ) : tests.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-[#94A3B8]">This teacher has not created any tests yet.</td></tr>
                ) : (
                  tests.map((test) => (
                    <tr key={test.id} className="hover:bg-[#0F172A]/50 transition-colors">
                      <td className="p-4">
                        <p className="text-white font-bold flex items-center gap-2">
                          <LayoutList size={16} className="text-emerald-400" />
                          {test.title}
                        </p>
                        <p className="text-xs text-[#94A3B8] mt-1">Status: <span className="capitalize">{test.status || 'active'}</span></p>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-white font-bold bg-[#0F172A] px-3 py-1.5 rounded-lg border border-[#334155]">
                          {test.questionCount || (test.questions ? test.questions.length : 0)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-[#94A3B8] font-medium flex items-center justify-center gap-1">
                          <Clock size={14} />
                          {test.duration ? `${test.duration} mins` : 'No Limit'}
                        </span>
                      </td>
                      <td className="p-4 text-white font-medium text-sm">
                        {test.createdAt ? new Date(test.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => setSelectedTestToView(test)}
                          className="px-3 py-1.5 bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-bold rounded-lg hover:bg-[#3B82F6]/20 transition inline-flex items-center gap-1"
                        >
                          <Eye size={14} /> Inspect
                        </button>
                        <button 
                          onClick={() => handleDeleteTest(test.id, test.title)}
                          className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition inline-flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🟢 TAB CONTENT: MEMBERSHIP */}
      {activeTab === 'membership' && (
        <MembershipTab 
          teacher={teacher} 
          onUpdated={fetchTeacherData} 
        />
      )}

    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------

function AdminTestModal({ test, onClose, onDelete }: { test: any, onClose: () => void, onDelete: () => void }) {
  const [tab, setTab] = useState<'settings' | 'questions'>('questions');
  const questions = test.questions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#334155] flex justify-between items-center bg-[#0F172A]">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
               <FileText className="text-[#3B82F6]" size={20}/> 
               {test.title}
            </h2>
            <p className="text-xs text-[#94A3B8] font-mono mt-1">Access Code: {test.accessCode}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1E293B] rounded-lg text-[#94A3B8]"><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#334155] bg-[#0F172A]">
          <button 
            onClick={() => setTab('questions')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${tab === 'questions' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
          >
            <ListChecks size={16} /> Questions Audit ({questions.length})
          </button>
          <button 
            onClick={() => setTab('settings')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${tab === 'settings' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
          >
            <Settings size={16} /> Configuration
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {tab === 'questions' && (
            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-10 text-[#94A3B8]">No questions found in this test.</div>
              ) : (
                questions.map((q: any, idx: number) => (
                  <div key={q.id || idx} className="bg-[#0F172A] p-4 rounded-xl border border-[#334155]">
                     <div className="flex items-start gap-3">
                        <span className="w-8 h-8 shrink-0 bg-[#1E293B] text-[#94A3B8] rounded-lg flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </span>
                        <div>
                           <p className="text-white font-medium text-sm leading-relaxed mb-3">
                             {q.text || (typeof q.question === 'object' ? q.question.uz : q.question) || "Question Text"}
                           </p>
                           <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                             q.uiDifficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                             q.uiDifficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                             'bg-red-500/10 text-red-400'
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
            <div className="space-y-4">
               <div className="bg-[#0F172A] p-5 rounded-xl border border-[#334155] space-y-4">
                  <StatRow label="Duration" value={test.duration ? `${test.duration} Minutes` : "Unlimited"} />
                  <StatRow label="Questions Shuffled" value={test.shuffle ? "Yes" : "No"} />
                  <StatRow label="Results Visibility" value={<span className="capitalize">{test.resultsVisibility?.replace('_', ' ') || "Never"}</span>} />
                  <StatRow label="Status" value={<span className="capitalize">{test.status || "Active"}</span>} />
               </div>

               <div className="bg-red-500/5 p-5 rounded-xl border border-red-500/20 mt-8">
                  <p className="text-red-400 font-bold mb-2">Admin Override</p>
                  <p className="text-xs text-[#94A3B8] mb-4">If this test contains inappropriate content, you can delete it from the teacher's library permanently.</p>
                  <button onClick={onDelete} className="w-full py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-bold transition flex items-center justify-center gap-2">
                    <Trash2 size={16} /> Delete Test
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, value, className = "" }: { icon: React.ReactNode, label: string, value: string | null | undefined, className?: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0F172A] border border-[#334155]">
      <div className="text-[#3B82F6] mt-0.5">{icon}</div>
      <div>
        <p className="text-[10px] uppercase font-bold text-[#94A3B8]">{label}</p>
        <p className={`text-white font-medium text-sm ${className}`}>{value || "Not provided"}</p>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string, value: number | string | React.ReactNode }) {
  return (
    <div className="flex justify-between items-center pb-3 border-b border-[#334155] last:border-0 last:pb-0">
      <span className="text-[#94A3B8] font-medium text-sm">{label}</span>
      <span className="text-white font-black text-lg">{value}</span>
    </div>
  );
}