"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  ChevronRight, Loader2, ShieldCheck, ArrowLeft, 
  MapPin, Search, ShieldAlert, Users, School, Bot 
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. 🟢 FETCH ALL TEACHERS (NO PAGINATION, NO INDEXES NEEDED)
  useEffect(() => {
    const fetchAllTeachers = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "users"), where("role", "==", "teacher"));
        const querySnapshot = await getDocs(q);
        
        // 🟢 FIX: Explicitly type teacherList as any[] so TS knows it can have other properties
        const teacherList: any[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Alfavit bo'yicha tartiblash (Client-side sorting - Indeks so'ramaydi!)
        teacherList.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
        
        setTeachers(teacherList);
      } catch (error: any) {
        console.error("Error fetching teachers:", error);
        toast.error("Failed to load teachers.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllTeachers();
  }, []);

  // 2. 🟢 CLIENT-SIDE SEARCH FILTER
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    
    const lowerQ = searchQuery.toLowerCase();
    return teachers.filter(t => {
      const name = (t.displayName || "").toLowerCase();
      const email = (t.email || "").toLowerCase();
      const username = (t.username || "").toLowerCase();
      return name.includes(lowerQ) || email.includes(lowerQ) || username.includes(lowerQ);
    });
  }, [searchQuery, teachers]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 p-4 md:p-6">
      
      {/* 🟢 HEADER & SEARCH BAR */}
      <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-6 shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        
        <div className="relative z-10">
          <Link href="/admin" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition font-medium mb-3 bg-[#0F172A] px-4 py-2 rounded-xl border border-[#334155] w-fit">
            <ArrowLeft size={16} /> Back to Hub
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">Teachers Directory</h1>
          <p className="text-[#94A3B8] font-medium text-sm">
            Managing <strong className="text-white">{filteredTeachers.length}</strong> teachers out of {teachers.length} total.
          </p>
        </div>

        <div className="relative w-full lg:w-[400px] z-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, email, or @username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-[#0F172A] border border-[#334155] rounded-xl text-white font-medium focus:outline-none focus:border-[#3B82F6] transition-colors shadow-inner placeholder:text-[#64748B]"
          />
        </div>
      </div>

      {/* 🟢 DATA TABLE */}
      <div className="rounded-3xl bg-[#1E293B] border border-[#334155] overflow-hidden shadow-xl flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#0F172A] text-[#94A3B8] text-xs font-bold uppercase tracking-wider border-b border-[#334155]">
                <th className="p-5 pl-8">Teacher Profile</th>
                <th className="p-5">Location</th>
                <th className="p-5 text-center">Status & Plan</th>
                <th className="p-5 text-center">Platform Usage</th>
                <th className="p-5 text-right pr-8">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-[#94A3B8]">
                    <Loader2 className="animate-spin mx-auto text-[#3B82F6] mb-4" size={32} />
                    <span className="font-medium tracking-wide">Loading teacher database...</span>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-[#94A3B8] font-medium text-lg">
                    {searchQuery ? `No teachers found matching "${searchQuery}"` : "No teachers registered yet."}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const safeId = teacher.id || teacher.uid;
                  const planId = teacher.subscription?.planId || teacher.planId || 'free';
                  
                  return (
                    <tr key={safeId} className="hover:bg-[#0F172A]/60 transition-colors group">
                      
                      {/* 1. Name & Avatar & Email */}
                      <td className="p-5 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {teacher.photoURL ? (
                              <img src={teacher.photoURL} alt={teacher.displayName} className="w-12 h-12 rounded-full object-cover border-2 border-[#334155] group-hover:border-[#3B82F6] transition-colors" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#3B82F6] to-indigo-500 flex items-center justify-center text-white font-black text-xl border-2 border-[#334155] shadow-sm">
                                {teacher.displayName?.charAt(0).toUpperCase() || "T"}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-[#1E293B] rounded-full p-0.5">
                              {teacher.verifiedTeacher ? <ShieldCheck size={14} className="text-emerald-400" /> : <ShieldAlert size={14} className="text-amber-400" />}
                            </div>
                          </div>
                          <div>
                            <p className="text-white font-bold flex items-center gap-1.5 text-[15px] mb-0.5">
                              {teacher.displayName || "Unknown Teacher"}
                            </p>
                            <p className="text-xs text-[#94A3B8] font-medium font-mono">@{teacher.username || "no_username"}</p>
                            <p className="text-xs text-[#64748B] mt-0.5">{teacher.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* 2. Location */}
                      <td className="p-5">
                        <div className="flex items-center gap-1.5 text-white font-medium text-sm bg-[#0F172A] w-fit px-3 py-2 rounded-xl border border-[#334155]">
                          <MapPin size={14} className="text-[#3B82F6]" />
                          {teacher.location?.district ? `${teacher.location.district}, ${teacher.location.region}` : (teacher.location?.region || "Unknown")}
                        </div>
                      </td>

                      {/* 3. Status & Plan Badge */}
                      <td className="p-5 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${teacher.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {teacher.isActive ? 'Account Active' : 'Suspended'}
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                            planId === 'pro' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                            planId === 'vip' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                            planId === 'custom' ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' : 
                            'bg-[#0F172A] text-[#94A3B8] border-[#334155]'
                          }`}>
                            Plan: {planId.toUpperCase()}
                          </span>
                        </div>
                      </td>

                      {/* 4. ALL USAGES (Classes, Students, AI) */}
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-4 bg-[#0F172A] p-2 rounded-xl border border-[#334155] w-fit mx-auto">
                           <div className="text-center px-2">
                             <p className="text-white font-black text-lg leading-none mb-1">
                               {teacher.usage?.activeClassCount ?? teacher.activeClassCount ?? 0}
                             </p>
                             <p className="text-[#64748B] text-[9px] uppercase font-bold flex items-center justify-center gap-1"><School size={10}/> Classes</p>
                           </div>
                           <div className="w-px h-8 bg-[#334155]"></div>
                           <div className="text-center px-2">
                             <p className="text-white font-black text-lg leading-none mb-1">
                               {teacher.usage?.totalStudents ?? teacher.totalStudents ?? 0}
                             </p>
                             <p className="text-[#64748B] text-[9px] uppercase font-bold flex items-center justify-center gap-1"><Users size={10}/> Students</p>
                           </div>
                           <div className="w-px h-8 bg-[#334155]"></div>
                           <div className="text-center px-2">
                             <p className="text-indigo-400 font-black text-lg leading-none mb-1">
                               {teacher.usage?.aiQuestionsUsed ?? teacher.aiQuestionUsedToday ?? 0}
                             </p>
                             <p className="text-[#64748B] text-[9px] uppercase font-bold flex items-center justify-center gap-1"><Bot size={10}/> AI Calls</p>
                           </div>
                        </div>
                      </td>
                      
                      {/* 5. Action Link */}
                      <td className="p-5 text-right pr-8">
                        <Link 
                          href={`/admin/teachers/${safeId}`} 
                          className="inline-flex px-5 py-2.5 rounded-xl bg-[#3B82F6] text-white font-bold hover:bg-blue-600 transition-all items-center gap-2 text-sm shadow-lg shadow-blue-500/20"
                        >
                          Manage Plan <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}