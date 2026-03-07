"use client";

import { useState, useEffect } from "react";
import { 
  collection, query, where, getDocs, limit, startAfter, 
  endBefore, orderBy, limitToLast, QueryDocumentSnapshot 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  ChevronRight, Loader2, ShieldCheck, ArrowLeft, 
  ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown, MapPin 
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { TeacherUser } from "@/types/user";

const PAGE_SIZE = 10;
type SortField = 'createdAt' | 'activeClassCount' | 'totalStudents';
type SortOrder = 'asc' | 'desc';

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 Pagination & Sorting States
  const [page, setPage] = useState(1);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Fetch when sorting changes or on initial load
  useEffect(() => {
    // Reset pagination when sorting changes
    setPage(1);
    setFirstVisible(null);
    setLastVisible(null);
    fetchTeachers("initial", sortField, sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField, sortOrder]);

  const fetchTeachers = async (
    direction: "initial" | "next" | "prev", 
    currentSortField = sortField, 
    currentSortOrder = sortOrder
  ) => {
    setLoading(true);
    try {
      // Base query: Filter by teacher, order dynamically
      let q = query(
        collection(db, "users"),
        where("role", "==", "teacher"),
        orderBy(currentSortField, currentSortOrder) 
      );

      // Apply pagination cursors
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
      
      // 🟢 MAGIC INDEX CATCHER
      if (error.message && error.message.includes("The query requires an index")) {
        const urlMatch = error.message.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        
        if (urlMatch && urlMatch[0]) {
          const indexUrl = urlMatch[0];
          
          toast((t) => (
            <div className="flex flex-col gap-2 p-1">
              <span className="font-black text-slate-800 text-lg">Index Required</span>
              <span className="text-sm text-slate-600 font-medium">
                Firebase needs a new database index to sort by <strong className="text-slate-800">{currentSortField}</strong>.
              </span>
              <a 
                href={indexUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-[#3B82F6] text-white px-4 py-2 rounded-xl text-center text-sm font-bold mt-2 hover:bg-blue-600 transition"
                onClick={() => toast.dismiss(t.id)}
              >
                Build Index Automatically
              </a>
            </div>
          ), { duration: 15000, position: "bottom-right" });
        }
      } else {
        toast.error("Failed to load teachers.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to highest first
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-[#334155]" />;
    return sortOrder === 'asc' ? <ArrowUp size={14} className="text-[#3B82F6]" /> : <ArrowDown size={14} className="text-[#3B82F6]" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition font-medium mb-2">
            <ArrowLeft size={18} /> Back to Hub
          </Link>
          <h1 className="text-3xl font-black text-white">Manage Teachers</h1>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] px-4 py-2 rounded-xl text-[#94A3B8] font-bold text-sm">
          Showing: {loading ? "..." : teachers.length} on page
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden shadow-lg flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#0F172A] text-[#94A3B8] text-sm uppercase tracking-wide border-b border-[#334155]">
                <th className="p-5 font-semibold">Name</th>
                <th className="p-5 font-semibold">Location</th>
                
                {/* Sortable Columns */}
                <th className="p-5 font-semibold cursor-pointer hover:text-white transition group" onClick={() => handleSort('activeClassCount')}>
                  <div className="flex items-center gap-2">Classes <SortIcon field="activeClassCount" /></div>
                </th>
                <th className="p-5 font-semibold cursor-pointer hover:text-white transition group" onClick={() => handleSort('totalStudents')}>
                  <div className="flex items-center gap-2">Students <SortIcon field="totalStudents" /></div>
                </th>
                
                <th className="p-5 font-semibold text-center">Status</th>
                <th className="p-5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[#94A3B8]">
                    <Loader2 className="animate-spin mx-auto text-[#3B82F6] mb-2" size={24} />
                    Loading page {page}...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[#94A3B8]">No teachers found.</td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-[#0F172A]/50 transition-colors">
                    
                    {/* Name & Avatar */}
                    <td className="p-4 flex items-center gap-4">
                      {teacher.photoURL ? (
                        <img src={teacher.photoURL} alt={teacher.displayName} className="w-10 h-10 rounded-full object-cover border-2 border-[#334155]" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] font-black border-2 border-[#334155]">
                          {teacher.displayName?.charAt(0).toUpperCase() || "T"}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-bold flex items-center gap-1.5">
                          {teacher.displayName}
                          {teacher.verifiedTeacher && <ShieldCheck size={16} className="text-emerald-400" />}
                        </p>
                        <p className="text-xs text-[#94A3B8]">@{teacher.username} • <span className="capitalize">{teacher.subject || "No subject"}</span></p>
                      </div>
                    </td>
                    
                    {/* Combined Location */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-white font-medium text-sm">
                        <MapPin size={14} className="text-[#94A3B8]" />
                        {teacher.location?.district ? `${teacher.location.district}, ${teacher.location.region}` : (teacher.location?.region || "N/A")}
                      </div>
                    </td>

                    {/* Stats */}
                    <td className="p-4 text-white font-bold text-lg">{teacher.activeClassCount || 0}</td>
                    <td className="p-4 text-white font-bold text-lg">{teacher.totalStudents || 0}</td>
                    
                    {/* Status Badge */}
                    <td className="p-4 text-center">
                       <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${teacher.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                         {teacher.isActive ? 'Active' : 'Banned'}
                       </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="p-4 text-right">
                      <Link href={`/admin/teachers/${teacher.id}`} className="inline-flex px-4 py-2 rounded-xl bg-[#3B82F6] text-white font-bold hover:bg-[#2563EB] transition-all items-center gap-1 text-sm">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 🟢 Pagination Controls */}
        <div className="bg-[#0F172A] p-4 border-t border-[#334155] flex items-center justify-between">
          <p className="text-[#94A3B8] text-sm">Page <span className="text-white font-bold">{page}</span></p>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchTeachers("prev")} 
              disabled={page === 1 || loading}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#1E293B] border border-[#334155] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#334155] transition"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button 
              onClick={() => fetchTeachers("next")} 
              disabled={!hasNextPage || loading}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#1E293B] border border-[#334155] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#334155] transition"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}