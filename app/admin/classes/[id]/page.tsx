"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, getDocs, orderBy, updateDoc, arrayRemove, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  ArrowLeft, School, Users, Lock, Unlock, Key, Calendar, 
  User, ShieldAlert, Loader2, UserMinus, Trash2, FileText, Clock, AlertCircle
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  // 🟢 State
  const [classData, setClassData] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'assignments'>('overview');

  useEffect(() => {
    if (!classId) return;

    const fetchAllData = async () => {
      try {
        // 1. Fetch Class Data
        const classRef = doc(db, "classes", classId);
        const classSnap = await getDoc(classRef);

        if (!classSnap.exists()) {
          setClassData(null);
          setLoading(false);
          return;
        }

        const cls = { id: classSnap.id, ...classSnap.data() };
        setClassData(cls);

        // 2. Fetch Enrolled Students safely
        if (cls.studentIds && cls.studentIds.length > 0) {
          const studentPromises = cls.studentIds.map((sid: string) => getDoc(doc(db, "users", sid)));
          const studentSnaps = await Promise.all(studentPromises);
          const studentList = studentSnaps
            .filter(snap => snap.exists())
            .map(snap => ({ id: snap.id, ...snap.data() }));
          setStudents(studentList);
        }

        // 3. Fetch Assignments for this class
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
      
      // Update local class data count
      setClassData((prev: any) => ({ ...prev, studentIds: prev.studentIds.filter((id: string) => id !== studentId) }));
      toast.success(`${studentName} removed from class.`);
    } catch (error) {
      console.error(error);
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
      console.error(error);
      toast.error("Failed to delete assignment.");
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#3B82F6] w-12 h-12" /></div>;

  if (!classData) {
    return (
      <div className="text-center p-20">
        <h2 className="text-2xl font-bold text-white">Class not found</h2>
        <button onClick={() => router.push("/admin/classes")} className="mt-4 text-[#3B82F6] hover:underline">Go back to Classes</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Top Nav */}
      <Link href="/admin/classes" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition font-medium">
        <ArrowLeft size={18} /> Back to All Classes
      </Link>

      {/* Class Header Card */}
      <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-8 shadow-lg relative overflow-hidden flex flex-col md:flex-row gap-6 justify-between items-start">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <School size={24} />
            </div>
            <h1 className="text-3xl font-black text-white">{classData.title}</h1>
          </div>
          <p className="text-[#94A3B8] max-w-xl leading-relaxed mt-2">
            {classData.description || "No description provided by the teacher."}
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-3 min-w-[200px] w-full md:w-auto">
          <div className="bg-[#0F172A] p-4 rounded-xl border border-[#334155]">
            <p className="text-xs text-[#94A3B8] font-bold uppercase mb-1">Join Code</p>
            <div className="flex items-center gap-2 text-white font-mono text-xl font-bold">
              <Key size={18} className="text-purple-400" />
              {classData.joinCode}
            </div>
          </div>
          <div className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold ${classData.isLocked ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            {classData.isLocked ? <><Lock size={18}/> Class Locked</> : <><Unlock size={18}/> Class Open</>}
          </div>
        </div>
      </div>

      {/* 🟢 TABS NAVIGATION */}
      <div className="flex gap-4 border-b border-[#334155]">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'overview' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('students')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'students' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          Students
          <span className="bg-[#334155] text-white px-2 py-0.5 rounded-full text-xs">{students.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('assignments')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'assignments' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          Assignments
          <span className="bg-[#334155] text-white px-2 py-0.5 rounded-full text-xs">{assignments.length}</span>
        </button>
      </div>

      {/* 🟢 TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6 shadow-lg space-y-4">
             <h3 className="text-white font-bold mb-4">Class Details</h3>
             <StatRow label="Teacher" value={
               <Link href={`/admin/teachers/${classData.teacherId}`} className="text-[#3B82F6] hover:underline flex items-center gap-1">
                 <User size={14}/> {classData.teacherName}
               </Link>
             } />
             <StatRow label="Created On" value={classData.createdAt ? new Date(classData.createdAt.toDate?.() || classData.createdAt).toLocaleDateString() : 'Unknown'} />
             <StatRow label="Total Students" value={classData.studentIds?.length || 0} />
             <StatRow label="Total Assignments" value={assignments.length} />
          </div>

          <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-6 shadow-lg">
             <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2"><ShieldAlert size={18}/> Admin Danger Zone</h3>
             <p className="text-sm text-[#94A3B8] mb-6">
               Permanently delete this class. This will unenroll all students and destroy all assignment records. This action cannot be undone.
             </p>
             <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-xl border border-red-500/20 transition flex items-center justify-center gap-2">
               <Trash2 size={18} /> Force Delete Class
             </button>
          </div>
        </div>
      )}

      {/* 🟢 TAB CONTENT: STUDENTS */}
      {activeTab === 'students' && (
        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] shadow-lg overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#0F172A] text-[#94A3B8] text-xs uppercase tracking-wider border-b border-[#334155]">
                  <th className="p-4 font-semibold">Student Name</th>
                  <th className="p-4 font-semibold text-center">Platform XP</th>
                  <th className="p-4 font-semibold text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-10 text-center text-[#94A3B8]">No students enrolled yet.</td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-[#0F172A]/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                          {student.displayName?.charAt(0).toUpperCase() || "S"}
                        </div>
                        <div>
                          <p className="text-white font-bold">{student.displayName}</p>
                          <p className="text-xs text-[#94A3B8]">@{student.username}</p>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <p className="text-white font-bold">{student.totalXP || 0} XP</p>
                        <p className="text-xs text-emerald-400 font-medium">Lvl {student.level || 1}</p>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleForceUnenroll(student.id, student.displayName)}
                          className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition flex items-center gap-1 ml-auto"
                        >
                          <UserMinus size={14} /> Force Unenroll
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

      {/* 🟢 TAB CONTENT: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {assignments.length === 0 ? (
            <div className="text-center py-16 bg-[#1E293B] rounded-2xl border border-[#334155] flex flex-col items-center">
              <FileText size={32} className="text-[#334155] mb-4" />
              <h3 className="text-[#94A3B8] font-bold">No assignments posted yet</h3>
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
                <div key={a.id} className="bg-[#1E293B] p-5 rounded-xl border border-[#334155] flex flex-col sm:flex-row gap-6 relative overflow-hidden">
                  {/* Status Indicator Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${status === 'active' ? 'bg-emerald-500' : status === 'scheduled' ? 'bg-amber-400' : 'bg-slate-500'}`}></div>

                  <div className="flex-1 pl-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white text-lg">{a.testTitle}</h3>
                        <div className="flex gap-3 text-xs text-[#94A3B8] mt-1 font-medium">
                          {dueDate ? (
                            <span className={`flex items-center gap-1 ${status === 'closed' ? 'text-red-400' : ''}`}>
                              <Calendar size={12}/> Due: {dueDate.toLocaleDateString()}
                            </span>
                          ) : <span className="text-emerald-400">No Deadline</span>}
                          <span>•</span>
                          <span>{a.questionCount} Questions</span>
                        </div>
                      </div>
                      
                      {/* Delete Button for Admin Moderation */}
                      <button 
                        onClick={() => handleDeleteAssignment(a.id, a.testTitle)}
                        className="p-2 text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Assignment"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Progress Bar (Dark Mode) */}
                    <div className="mt-4">
                       <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-[#94A3B8]">{submitted}/{totalReq} Submitted</span>
                          <span className="text-white">{percent}%</span>
                       </div>
                       <div className="w-full h-2 bg-[#0F172A] rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-[#3B82F6]'}`} 
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
  );
}

// Reusable Stat Row component
function StatRow({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center pb-3 border-b border-[#334155] last:border-0 last:pb-0">
      <span className="text-[#94A3B8] font-medium text-sm">{label}</span>
      <span className="text-white font-black text-lg">{value}</span>
    </div>
  );
}