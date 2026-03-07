"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ArrowLeft, School, Lock, Unlock, Users, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllClasses = async () => {
      try {
        // Fetching the 50 most recently created classes
        const q = query(collection(db, "classes"), orderBy("createdAt", "desc"), limit(50));
        const snapshot = await getDocs(q);
        
        setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllClasses();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition font-medium mb-2">
            <ArrowLeft size={18} /> Back to Hub
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <School className="text-purple-400" size={32} /> Platform Classes
          </h1>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] px-4 py-2 rounded-xl text-[#94A3B8] font-bold text-sm">
          Showing: {loading ? "..." : classes.length} Recent
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#0F172A] text-[#94A3B8] text-sm uppercase tracking-wide border-b border-[#334155]">
                <th className="p-5 font-semibold">Class Name</th>
                <th className="p-5 font-semibold">Join Code</th>
                <th className="p-5 font-semibold">Teacher</th>
                <th className="p-5 font-semibold text-center">Students</th>
                <th className="p-5 font-semibold text-center">Status</th>
                <th className="p-5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[#94A3B8]">
                    <Loader2 className="animate-spin mx-auto text-purple-400 mb-2" size={24} />
                    Loading platform classes...
                  </td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[#94A3B8]">No classes found on the platform.</td>
                </tr>
              ) : (
                classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-[#0F172A]/50 transition-colors">
                    <td className="p-4">
                      <p className="text-white font-bold text-base">{cls.title}</p>
                      <p className="text-xs text-[#94A3B8] truncate max-w-[200px]">{cls.description || "No description"}</p>
                    </td>
                    <td className="p-4">
                      <span className="bg-[#0F172A] text-purple-400 font-mono font-bold px-3 py-1.5 rounded-lg border border-[#334155]">
                        {cls.joinCode}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-white font-medium">{cls.teacherName}</p>
                      <Link href={`/admin/teachers/${cls.teacherId}`} className="text-xs text-[#3B82F6] hover:underline">
                        View Profile
                      </Link>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-white font-bold text-lg">
                        <Users size={16} className="text-[#94A3B8]"/> {cls.studentIds?.length || 0}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {cls.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold">
                          <Lock size={12} /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                          <Unlock size={12} /> Open
                        </span>
                      )}
                    </td>
                    {/* 🟢 NEW ACTION BUTTON */}
                    <td className="p-4 text-right">
                      <Link 
                        href={`/admin/classes/${cls.id}`}
                        className="inline-flex px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 font-bold hover:bg-purple-500/20 transition-all items-center gap-1 text-sm"
                      >
                        View Class <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}