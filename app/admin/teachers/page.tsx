"use client";

import { useState, useEffect } from "react";
import { 
  collection, query, where, getDocs, limit, startAfter, 
  endBefore, orderBy, limitToLast, QueryDocumentSnapshot 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  ChevronRight, Loader2, ShieldCheck, ArrowLeft, 
  ChevronLeft, ArrowDown, MapPin 
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { TeacherUser } from "@/types/user";

const PAGE_SIZE = 10;
type SortField = 'createdAt' | 'activeClassCount' | 'totalStudents';

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  
  // 🟢 LOCKED TO DESCENDING: Matches your exact Firebase Indexes
  const [sortField, setSortField] = useState<SortField>('totalStudents');

  // Fetch when sorting changes
  useEffect(() => {
    setPage(1);
    setFirstVisible(null);
    setLastVisible(null);
    fetchTeachers("initial", sortField);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField]);

  const fetchTeachers = async (
    direction: "initial" | "next" | "prev", 
    currentSortField = sortField
  ) => {
    setLoading(true);
    try {
      // 🟢 This query now PERFECTLY matches your composite indexes
      let q = query(
        collection(db, "users"),
        where("role", "==", "teacher"),
        orderBy(currentSortField, "desc") // Locked to desc
      );

      // Apply pagination cursors (Highly optimized for 100k users)
      if (direction === "next" && lastVisible) {
        q = query(q, startAfter(lastVisible), limit(PAGE_SIZE));
      } else if (direction === "prev" && firstVisible) {
        q = query(q, endBefore(firstVisible), limitToLast(PAGE_SIZE));
      } else {
        q = query(q, limit(PAGE_SIZE));
      }

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setFirstVisible(querySnapshot.docs[0]);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasNextPage(querySnapshot.docs.length === PAGE_SIZE);

        const teacherList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeacherUser[];
        
        setTeachers(teacherList);

        if (direction === "next") setPage((p) => p + 1);
        if (direction === "prev") setPage((p) => Math.max(1, p - 1));
      } else {
        if (direction === "next") setHasNextPage(false);
        if (direction === "initial") setTeachers([]); 
      }
    } catch (error: any) {
      console.error("Error fetching paginated teachers:", error);
      toast.error("Failed to load teachers. Check database indexes.");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition font-medium mb-2">
            <ArrowLeft size={18} /> Back to Hub
          </Link>
          <h1 className="text-3xl font-black text-white">Teacher Directory</h1>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] px-4 py-2 rounded-xl text-[#94A3B8] font-bold text-sm">
          Showing: {loading ? "..." : teachers.length} on page
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-3xl bg-[#1E293B] border border-[#334155] overflow-hidden shadow-xl flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#0F172A] text-[#94A3B8] text-xs font-bold uppercase tracking-wider border-b border-[#334155]">
                <th className="p-5">Name & Info</th>
                <th className="p-5">Location</th>
                
                {/* 🟢 Clickable Headers (Descending Only) */}
                <th 
                  className={`p-5 cursor-pointer transition group ${sortField === 'activeClassCount' ? 'text-white bg-[#1E293B]' : 'hover:text-white'}`} 
                  onClick={() => handleSort('activeClassCount')}
                >
                  <div className="flex items-center gap-2">
                    Active Classes {sortField === 'activeClassCount' && <ArrowDown size={14} className="text-[#3B82F6]" />}
                  </div>
                </th>
                
                <th 
                  className={`p-5 cursor-pointer transition group ${sortField === 'totalStudents' ? 'text-white bg-[#1E293B]' : 'hover:text-white'}`} 
                  onClick={() => handleSort('totalStudents')}
                >
                  <div className="flex items-center gap-2">
                    Total Students {sortField === 'totalStudents' && <ArrowDown size={14} className="text-[#3B82F6]" />}
                  </div>
                </th>

                <th 
                  className={`p-5 cursor-pointer transition group ${sortField === 'createdAt' ? 'text-white bg-[#1E293B]' : 'hover:text-white'}`} 
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Joined Date {sortField === 'createdAt' && <ArrowDown size={14} className="text-[#3B82F6]" />}
                  </div>
                </th>
                
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-[#94A3B8]">
                    <Loader2 className="animate-spin mx-auto text-[#3B82F6] mb-3" size={28} />
                    <span className="font-medium">Loading page {page}...</span>
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-[#94A3B8] font-medium text-lg">No teachers found in this category.</td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-[#0F172A]/50 transition-colors">
                    
                    {/* Name & Avatar */}
                    <td className="p-5 flex items-center gap-4">
                      {teacher.photoURL ? (
                        <img src={teacher.photoURL} alt={teacher.displayName} className="w-12 h-12 rounded-full object-cover border-2 border-[#334155]" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#3B82F6] to-indigo-500 flex items-center justify-center text-white font-black text-xl border-2 border-[#334155] shadow-sm">
                          {teacher.displayName?.charAt(0).toUpperCase() || "T"}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-bold flex items-center gap-1.5 text-[15px]">
                          {teacher.displayName}
                          {teacher.verifiedTeacher && <ShieldCheck size={16} className="text-emerald-400" />}
                        </p>
                        <p className="text-xs text-[#94A3B8] font-medium mt-0.5">@{teacher.username} • <span className="capitalize">{teacher.subject || "No subject"}</span></p>
                      </div>
                    </td>
                    
                    {/* Location */}
                    <td className="p-5">
                      <div className="flex items-center gap-1.5 text-white font-medium text-sm bg-[#0F172A] w-fit px-3 py-1.5 rounded-lg border border-[#334155]">
                        <MapPin size={14} className="text-[#3B82F6]" />
                        {teacher.location?.district ? `${teacher.location.district}, ${teacher.location.region}` : (teacher.location?.region || "N/A")}
                      </div>
                    </td>

                    {/* Stats */}
                    <td className="p-5 text-white font-black text-lg">{teacher.activeClassCount || 0}</td>
                    <td className="p-5 text-white font-black text-lg">{teacher.totalStudents || 0}</td>
                    <td className="p-5 text-[#94A3B8] font-medium text-sm">{teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : "N/A"}</td>
                    
                    {/* Status Badge */}
                    <td className="p-5 text-center">
                       <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${teacher.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                         {teacher.isActive ? 'Active' : 'Banned'}
                       </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="p-5 text-right">
                      <Link href={`/admin/teachers/${teacher.id}`} className="inline-flex px-5 py-2.5 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] font-bold hover:bg-[#3B82F6]/20 transition-all items-center text-sm border border-[#3B82F6]/20">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="bg-[#0F172A] p-5 border-t border-[#334155] flex items-center justify-between">
          <p className="text-[#94A3B8] text-sm font-medium">Page <span className="text-white font-bold bg-[#1E293B] px-2 py-1 rounded-md ml-1">{page}</span></p>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchTeachers("prev")} 
              disabled={page === 1 || loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1E293B] border border-[#334155] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#334155] transition shadow-sm"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button 
              onClick={() => fetchTeachers("next")} 
              disabled={!hasNextPage || loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1E293B] border border-[#334155] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#334155] transition shadow-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}