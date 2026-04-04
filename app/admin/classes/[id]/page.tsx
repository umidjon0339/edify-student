"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, getDocs, orderBy, updateDoc, arrayRemove, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions"; // 🟢 IMPORTED FUNCTIONS
import { 
  ArrowLeft, School, Users, Lock, Unlock, Key, Calendar, 
  User, ShieldAlert, Loader2, UserMinus, Trash2, FileText, 
  Copy, CheckCircle // 🟢 IMPORTED COPY & CHECK ICONS
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// 🟢 REUSABLE COPY ID BUTTON
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

export default function AdminClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classData, setClassData] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeletingClass, setIsDeletingClass] = useState(false); // 🟢 NEW: Deletion State
  
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'assignments'>('overview');

  useEffect(() => {
    if (!classId) return;

    const fetchAllData = async () => {
      try {
        const classRef = doc(db, "classes", classId);
        const classSnap = await getDoc(classRef);

        if (!classSnap.exists()) {
          setClassData(null);
          setLoading(false);
          return;
        }

        const cls = { id: classSnap.id, ...classSnap.data() } as any;
        setClassData(cls);

        if (cls.studentIds && cls.studentIds.length > 0) {
          const studentPromises = cls.studentIds.map((sid: string) => getDoc(doc(db, "users", sid)));
          const studentSnaps = await Promise.all(studentPromises);
          const studentList = studentSnaps
            .filter(snap => snap.exists())
            .map(snap => ({ id: snap.id, ...snap.data() }));
          setStudents(studentList);
        }

        const assignQuery = query(collection(db, 'classes', classId, 'assignments'), orderBy('createdAt', 'desc'));
        const assignSnap = await getDocs(assignQuery);
        setAssignments(assignSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error("Error fetching class details:", error);
        toast.error("Failed to load class data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [classId]);

  // --- ADMIN ACTIONS ---
  
  const handleForceUnenroll = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to force remove ${studentName} from this class?`)) return;
    try {
      await updateDoc(doc(db, 'classes', classId), { 
        studentIds: arrayRemove(studentId) 
      });
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setClassData((prev: any) => ({ ...prev, studentIds: prev.studentIds.filter((id: string) => id !== studentId) }));
      toast.success(`${studentName} removed from class.`);
    } catch (error) {
      toast.error("Failed to remove student.");
    }
  };

  const handleDeleteAssignment = async (assignmentId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete the assignment "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'classes', classId, 'assignments', assignmentId));
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast.success("Assignment deleted.");
    } catch (error) {
      toast.error("Failed to delete assignment.");
    }
  };

  // 🟢 NEW: Enterprise Class Deletion Trigger
  const handleDeleteClass = async () => {
    if (!classData) return;

    if (!confirm(`DANGER: Are you sure you want to COMPLETELY WIPE "${classData.title}" and all its subcollections (assignments, materials, etc.)? This CANNOT be undone.`)) return;
    
    const securityCheck = prompt(`To confirm deletion, type the word "DELETE" below:`);
    if (securityCheck !== "DELETE") {
      toast.error("Deletion cancelled. You did not type DELETE.");
      return;
    }

    setIsDeletingClass(true);
    const toastId = toast.loading("Wiping class and all subcollections securely...");

    try {
      const functions = getFunctions();
      const deleteClassAPI = httpsCallable(functions, 'deleteClassAPI');
      
      await deleteClassAPI({ classId: classData.id });
      
      toast.success("Class successfully purged from database.", { id: toastId });
      router.push('/admin/classes'); 
    } catch (error: any) {
      console.error("Deletion error:", error);
      toast.error(error?.message || "Deletion failed. Make sure you have Super Admin permissions.", { id: toastId });
      setIsDeletingClass(false); 
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="animate-spin text-[#3B82F6] w-12 h-12" /></div>;

  if (!classData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">Class not found</h2>
        <Link href="/admin/classes" className="text-[#3B82F6] hover:underline font-bold">Return to Classes Directory</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* Top Nav */}
      <Link href="/admin/classes" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition font-medium w-fit bg-[#1E293B] px-4 py-2 rounded-xl border border-[#334155]">
        <ArrowLeft size={16} /> Back to All Classes
      </Link>

      {/* Class Header Card */}
      <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row gap-8 justify-between items-start">
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-inner">
              <School size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">{classData.title}</h1>
              {/* 🟢 ADDED CLASS ID HERE */}
              <CopyIdButton id={classData.id} label="Class ID" />
            </div>
          </div>
          <p className="text-[#94A3B8] max-w-xl leading-relaxed mt-4 font-medium text-sm">
            {classData.description || "No description provided by the teacher."}
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-3 min-w-[200px] w-full md:w-auto mt-2 md:mt-0">
          <div className="bg-[#0F172A] p-4 rounded-2xl border border-[#334155] shadow-inner">
            <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-widest mb-1.5">Join Code</p>
            <div className="flex items-center gap-2.5 text-white font-mono text-2xl font-black">
              <Key size={20} className="text-purple-400" />
              {classData.joinCode}
            </div>
          </div>
          <div className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2 font-bold shadow-sm ${classData.isLocked ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            {classData.isLocked ? <><Lock size={18}/> Class Locked</> : <><Unlock size={18}/> Class Open</>}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1.5 bg-[#1E293B] rounded-2xl border border-[#334155] overflow-x-auto hide-scrollbar shadow-inner">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'students', label: 'Students', count: students.length },
          { id: 'assignments', label: 'Assignments', count: assignments.length }
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.id 
              ? 'bg-[#3B82F6] text-white shadow-md' 
              : 'text-[#94A3B8] hover:bg-[#0F172A] hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-lg text-xs ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#0F172A] text-[#94A3B8] border border-[#334155]'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-lg">
               <h3 className="text-white font-bold mb-6 text-xl">Class Details</h3>
               <div className="space-y-2">
                 {/* 🟢 ENHANCED TEACHER ROW WITH ID */}
                 <div className="flex justify-between items-start py-4 border-b border-[#334155]">
                   <span className="text-[#94A3B8] font-medium text-[15px]">Teacher</span>
                   <div className="text-right">
                     <Link href={`/admin/teachers/${classData.teacherId}`} className="text-[#3B82F6] hover:underline flex items-center justify-end gap-1.5 font-bold text-lg">
                       <User size={16}/> {classData.teacherName}
                     </Link>
                     <div className="flex justify-end"><CopyIdButton id={classData.teacherId} label="Teacher ID" /></div>
                   </div>
                 </div>
                 
                 <StatRow label="Created On" value={classData.createdAt ? new Date(classData.createdAt.toDate?.() || classData.createdAt).toLocaleDateString() : 'Unknown'} />
                 <StatRow label="Total Enrolled" value={<span className="bg-[#0F172A] px-3 py-1 rounded-lg border border-[#334155]">{classData.studentIds?.length || 0}</span>} />
                 <StatRow label="Assignments" value={<span className="bg-[#0F172A] px-3 py-1 rounded-lg border border-[#334155]">{assignments.length}</span>} />
               </div>
            </div>

            {/* 🟢 WIRED UP DANGER ZONE */}
            <div className="bg-red-500/5 rounded-3xl border border-red-500/20 p-8 shadow-lg flex flex-col justify-between">
               <div>
                 <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2 text-xl"><ShieldAlert size={22}/> Admin Danger Zone</h3>
                 <p className="text-sm text-[#94A3B8] mb-6 leading-relaxed">
                   Permanently delete this class. This will unenroll all students and trigger a server job to destroy all assignment and material records. This action cannot be undone.
                 </p>
               </div>
               <button 
                 onClick={handleDeleteClass}
                 disabled={isDeletingClass}
                 className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
               >
                 {isDeletingClass ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} 
                 Force Delete Class
               </button>
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {activeTab === 'students' && (
          <div className="bg-[#1E293B] rounded-3xl border border-[#334155] shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0F172A] text-[#94A3B8] text-xs font-bold uppercase tracking-wider border-b border-[#334155]">
                    <th className="p-5">Student Info & ID</th>
                    <th className="p-5 text-center">Platform XP</th>
                    <th className="p-5 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-16 text-center text-[#94A3B8] font-medium text-lg">No students enrolled yet.</td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id} className="hover:bg-[#0F172A]/50 transition-colors">
                        <td className="p-5 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xl border border-emerald-500/20">
                            {student.displayName?.charAt(0).toUpperCase() || "S"}
                          </div>
                          <div>
                            <p className="text-white font-bold text-[15px]">{student.displayName}</p>
                            <p className="text-xs text-[#94A3B8] font-medium mt-0.5">@{student.username}</p>
                            {/* 🟢 ADDED STUDENT ID */}
                            <CopyIdButton id={student.id} label="Student ID" />
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <p className="text-white font-black text-lg bg-[#0F172A] px-3 py-1 rounded-lg border border-[#334155] w-fit mx-auto">{student.totalXP || 0} XP</p>
                          <p className="text-xs text-emerald-400 font-bold mt-1.5 uppercase tracking-wider">Lvl {student.level || 1}</p>
                        </td>
                        <td className="p-5 text-right">
                          <button 
                            onClick={() => handleForceUnenroll(student.id, student.displayName)}
                            className="px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl hover:bg-red-500/20 transition flex items-center gap-1.5 ml-auto shadow-sm"
                          >
                            <UserMinus size={16} /> Force Unenroll
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

        {/* ASSIGNMENTS */}
        {activeTab === 'assignments' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {assignments.length === 0 ? (
              <div className="text-center py-20 bg-[#1E293B] rounded-3xl border border-[#334155] flex flex-col items-center shadow-lg">
                <FileText size={40} className="text-[#334155] mb-5" />
                <h3 className="text-[#94A3B8] font-bold text-lg">No assignments posted yet</h3>
              </div>
            ) : (
              assignments.map(a => {
                const now = new Date();
                const openDate = a.openAt?.seconds ? new Date(a.openAt.seconds * 1000) : null;
                const dueDate = a.dueAt?.seconds ? new Date(a.dueAt.seconds * 1000) : null;
                
                let status = 'active';
                if (openDate && now < openDate) status = 'scheduled';
                else if (dueDate && now > dueDate) status = 'closed';

                const targetIds = Array.isArray(a.assignedTo) ? a.assignedTo : students.map(s => s.id);
                const totalReq = targetIds.length;
                const submitted = (a.completedBy || []).length;
                const percent = totalReq > 0 ? Math.round((submitted / totalReq) * 100) : 0;

                return (
                  <div key={a.id} className="bg-[#1E293B] p-6 rounded-2xl border border-[#334155] flex flex-col sm:flex-row gap-6 relative overflow-hidden shadow-lg">
                    {/* Status Indicator Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${status === 'active' ? 'bg-emerald-500' : status === 'scheduled' ? 'bg-amber-400' : 'bg-slate-500'}`}></div>

                    <div className="flex-1 pl-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-black text-white text-xl">{a.testTitle}</h3>
                          
                          {/* 🟢 ADDED ASSIGNMENT ID */}
                          <div className="mt-1 mb-3"><CopyIdButton id={a.id} label="Assignment ID" /></div>

                          <div className="flex flex-wrap gap-3 text-xs text-[#94A3B8] font-bold">
                            {dueDate ? (
                              <span className={`flex items-center gap-1.5 bg-[#0F172A] px-2 py-1 rounded-md border border-[#334155] ${status === 'closed' ? 'text-red-400 border-red-500/20' : ''}`}>
                                <Calendar size={14}/> Due: {dueDate.toLocaleDateString()}
                              </span>
                            ) : <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">No Deadline</span>}
                            <span className="bg-[#0F172A] px-2 py-1 rounded-md border border-[#334155]">{a.questionCount} Questions</span>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleDeleteAssignment(a.id, a.testTitle)}
                          className="p-2.5 text-[#94A3B8] bg-[#0F172A] border border-[#334155] hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 rounded-xl transition-all shadow-sm" title="Delete Assignment"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-5">
                         <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-1.5">
                            <span className="text-[#94A3B8]">{submitted}/{totalReq} Submitted</span>
                            <span className="text-white">{percent}%</span>
                         </div>
                         <div className="w-full h-3 bg-[#0F172A] rounded-full overflow-hidden border border-[#334155]">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-[#3B82F6]'}`} 
                              style={{ width: `${percent}%` }}
                            ></div>
                         </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable Stat Row component
function StatRow({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-[#334155] last:border-0 last:pb-0">
      <span className="text-[#94A3B8] font-medium text-[15px]">{label}</span>
      <span className="text-white font-black text-lg">{value}</span>
    </div>
  );
}