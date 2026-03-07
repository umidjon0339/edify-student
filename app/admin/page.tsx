"use client";

import { auth } from "@/lib/firebase";
import Link from "next/link";
import { 
  Users, GraduationCap, School, BookOpen, 
  BarChart, ShieldCheck, ChevronRight 
} from "lucide-react";

export default function AdminDashboardPage() {
  const adminEmail = auth.currentUser?.email;

  // 🟢 Array of all our ecosystem modules
  const adminModules = [
    {
      title: "Teachers",
      description: "Manage teacher profiles, verifications, and subjects.",
      icon: <Users size={28} className="text-[#3B82F6]" />,
      href: "/admin/teachers",
      color: "from-[#3B82F6]/20 to-transparent",
      borderColor: "group-hover:border-[#3B82F6]"
    },
    {
      title: "Students",
      description: "View student progress, XP, and accounts.",
      icon: <GraduationCap size={28} className="text-emerald-400" />,
      href: "/admin/students", // We will build this later
      color: "from-emerald-400/20 to-transparent",
      borderColor: "group-hover:border-emerald-400"
    },
    {
      title: "Active Classes",
      description: "Monitor class sizes and teacher assignments.",
      icon: <School size={28} className="text-purple-400" />,
      href: "/admin/classes", // We will build this later
      color: "from-purple-400/20 to-transparent",
      borderColor: "group-hover:border-purple-400"
    },
    {
      title: "Test Library",
      description: "Review system-wide tests and questions.",
      icon: <BookOpen size={28} className="text-amber-400" />,
      href: "/admin/tests", // We will build this later
      color: "from-amber-400/20 to-transparent",
      borderColor: "group-hover:border-amber-400"
    },
    {
      title: "System Stats",
      description: "Platform analytics and user growth.",
      icon: <BarChart size={28} className="text-pink-400" />,
      href: "/admin/stats", // We will build this later
      color: "from-pink-400/20 to-transparent",
      borderColor: "group-hover:border-pink-400"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="rounded-3xl bg-[#1E293B] p-8 md:p-10 shadow-lg border border-[#334155] relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="text-[#3B82F6]" size={32} />
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Ecosystem Hub</h1>
          </div>
          <p className="text-[#94A3B8] text-lg">
            Welcome back, <span className="text-white font-bold">{adminEmail}</span>.
          </p>
        </div>
        
        {/* Background glow effect */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#3B82F6] opacity-10 blur-3xl rounded-full" />
      </div>

      {/* MODULE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((module) => (
          <Link href={module.href} key={module.title} className="block group">
            <div className={`h-full rounded-2xl bg-[#1E293B] border border-[#334155] p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${module.borderColor} relative overflow-hidden`}>
              
              {/* Subtle gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-[#0F172A] border border-[#334155] flex items-center justify-center mb-6 shadow-inner">
                  {module.icon}
                </div>
                
                <h2 className="text-xl font-black text-white mb-2 flex items-center justify-between">
                  {module.title}
                  <ChevronRight size={20} className="text-[#94A3B8] group-hover:text-white group-hover:translate-x-1 transition-all" />
                </h2>
                <p className="text-[#94A3B8] text-sm leading-relaxed">
                  {module.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}