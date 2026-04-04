"use client";

import { useState, useEffect } from "react";
import { 
  collection, query, getDocs, limit, startAfter, 
  endBefore, orderBy, limitToLast, QueryDocumentSnapshot 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  ChevronRight, Loader2, ArrowLeft, School, Lock, 
  Unlock, Users, ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown, User,
  Copy, CheckCircle
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;
type SortField = 'createdAt' | 'studentCount';
type SortOrder = 'asc' | 'desc';

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

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 Pagination States
  const [page, setPage] = useState(1);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  
  // 🟢 Sort States (Defaults to highest student count)
  // Note: Your database MUST have a 'studentCount' integer field on the class document to sort by it!
  const [sortField, setSortField] = useState<SortField>('studentCount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    setPage(1);
    setFirstVisible(null);
    setLastVisible(null);
    fetchClasses("initial", sortField, sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField, sortOrder]);

  const fetchClasses = async (
    direction: "initial" | "next" | "prev", 
    currentSortField = sortField, 
    currentSortOrder = sortOrder
  ) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, "classes"),
        orderBy(currentSortField, currentSortOrder) 
      );

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

        setClasses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (direction === "next") setPage((p) => p + 1);
        if (direction === "prev") setPage((p) => Math.max(1, p - 1));
      } else {
        if (direction === "next") setHasNextPage(false);
        if (direction === "initial") setClasses([]); 
      }
    } catch (error: any) {
      console.error("Error fetching paginated classes:", error);
      
      // 🟢 MAGIC INDEX CATCHER
      if (error.message && error.message.includes("The query requires an index")) {
        const urlMatch = error.message.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        if (urlMatch && urlMatch[0]) {
          const indexUrl = urlMatch[0];
          toast((t) => (
            <div className="flex flex-col gap-2 p-1">
              <span className="font-black text-slate-800 text-lg">Index Required</span>
              <span className="text-sm text-slate-600 font-medium">
                Firebase needs a new index to sort classes by <strong className="text-slate-800">{currentSortField}</strong>.
              </span>
              <a 
                href={indexUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-purple-500 text-white px-4 py-2 rounded-xl text-center text-sm font-bold mt-2 hover:bg-purple-600 transition"
                onClick={() => toast.dismiss(t.id)}
              >
                Build Index Automatically
              </a>
            </div>
          ), { duration: 15000, position: "bottom-right" });
        }
      } else {
        toast.error("Failed to load classes. Check database fields.");
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
      setSortOrder('desc'); // Default to highest/newest first
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-[#334155]" />;
    return sortOrder === 'asc' ? <ArrowUp size={14} className="text-purple-400" /> : <ArrowDown size={14} className="text-purple-400" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition font-medium mb-2">
            <ArrowLeft size={18} /> Back to Hub
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-inner">
              <School size={24} />
            </div>
            Platform Classes
          </h1>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] px-4 py-2 rounded-xl text-[#94A3B8] font-bold text-sm shadow-sm">
          Showing: {loading ? "..." : classes.length} on page
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-3xl bg-[#1E293B] border border-[#334155] overflow-hidden shadow-xl flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#0F172A] text-[#94A3B8] text-xs font-bold uppercase tracking-wider border-b border-[#334155]">
                <th className="p-5">Class Info & ID</th>
                <th className="p-5">Join Code</th>
                <th className="p-5">Teacher Info</th>
                
                {/* Sortable Columns */}
                <th 
                  className={`p-5 cursor-pointer transition group ${sortField === 'studentCount' ? 'text-white bg-[#1E293B]' : 'hover:text-white'}`} 
                  onClick={() => handleSort('studentCount')}
                >
                  <div className="flex items-center justify-center gap-2">Students {renderSortIcon('studentCount')}</div>
                </th>
                <th 
                  className={`p-5 cursor-pointer transition group ${sortField === 'createdAt' ? 'text-white bg-[#1E293B]' : 'hover:text-white'}`} 
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">Created {renderSortIcon('createdAt')}</div>
                </th>

                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-[#94A3B8]">
                    <Loader2 className="animate-spin mx-auto text-purple-400 mb-3" size={28} />
                    <span className="font-medium">Loading page {page}...</span>
                  </td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-[#94A3B8] font-medium text-lg">No classes found on the platform.</td>
                </tr>
              ) : (
                classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-[#0F172A]/50 transition-colors">
                    
                    {/* Class Info */}
                    <td className="p-5">
                      <p className="text-white font-bold text-[15px] mb-1">{cls.title}</p>
                      <CopyIdButton id={cls.id} label="Class ID" />
                    </td>
                    
                    {/* Join Code */}
                    <td className="p-5">
                      <span className="bg-[#0F172A] text-purple-400 font-mono font-bold px-3 py-1.5 rounded-lg border border-[#334155] shadow-sm">
                        {cls.joinCode}
                      </span>
                    </td>
                    
                    {/* Teacher Info */}
                    <td className="p-5">
                      <div className="flex items-center gap-2 mb-1">
                        <User size={14} className="text-[#94A3B8]" />
                        <Link href={`/admin/teachers/${cls.teacherId}`} className="text-white font-bold text-sm hover:text-[#3B82F6] transition-colors">
                          {cls.teacherName || "Unknown Teacher"}
                        </Link>
                      </div>
                      <CopyIdButton id={cls.teacherId} label="Teacher ID" />
                    </td>
                    
                    {/* Stats */}
                    <td className="p-5 text-center">
                      <div className="inline-flex items-center justify-center gap-2 bg-[#0F172A] border border-[#334155] px-4 py-1.5 rounded-xl">
                        <Users size={16} className="text-[#94A3B8]"/> 
                        <span className="text-white font-black text-lg">{cls.studentCount || cls.studentIds?.length || 0}</span>
                      </div>
                    </td>
                    <td className="p-5 text-[#94A3B8] font-medium text-sm">
                      {cls.createdAt ? new Date(cls.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
                    </td>

                    {/* Status Badge */}
                    <td className="p-5 text-center">
                      {cls.isLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                          <Lock size={14} /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                          <Unlock size={14} /> Open
                        </span>
                      )}
                    </td>
                    
                    {/* Action Button */}
                    <td className="p-5 text-right">
                      <Link 
                        href={`/admin/classes/${cls.id}`}
                        className="inline-flex px-5 py-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold hover:bg-purple-500/20 transition-all items-center gap-1.5 text-sm shadow-sm"
                      >
                        View Class <ChevronRight size={16} />
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
              onClick={() => fetchClasses("prev")} 
              disabled={page === 1 || loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1E293B] border border-[#334155] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#334155] transition shadow-sm"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button 
              onClick={() => fetchClasses("next")} 
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