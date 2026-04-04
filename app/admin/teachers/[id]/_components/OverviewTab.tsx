"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BookOpen, Building2, Briefcase, Phone, Mail, Calendar, Edit2, Save, Loader2, Award, MapPin, Bot, User } from "lucide-react";
import toast from "react-hot-toast";

export default function OverviewTab({ teacher, classes, tests, onUpdated }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    subject: teacher.subject || '',
    institution: teacher.institution || '',
    experience: teacher.experience || 0,
    phone: teacher.phone || '',
    gender: teacher.gender || '',
    bio: teacher.bio || '',
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", teacher.id), {
        subject: editForm.subject,
        institution: editForm.institution,
        experience: Number(editForm.experience),
        phone: editForm.phone,
        gender: editForm.gender,
        bio: editForm.bio
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      onUpdated();
    } catch (error) {
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* LEFT COLUMN: STATS & LOCATIONS */}
      <div className="space-y-6">
        <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-6 shadow-lg">
           <h3 className="text-white font-bold mb-5 flex items-center gap-2 text-lg"><Award size={20} className="text-[#3B82F6]"/> Platform Stats</h3>
           <div className="space-y-1">
              <StatRow label="Active Classes" value={teacher.activeClassCount || 0} />
<StatRow label="Total Students" value={teacher.totalStudents || 0} />
<StatRow label="Tests Created" value={teacher.customTestCount || 0} />
           </div>
        </div>

        <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-6 shadow-lg">
           <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg"><MapPin size={20} className="text-[#3B82F6]"/> Location</h3>
           <div className="bg-[#0F172A] p-4 rounded-2xl border border-[#334155]">
             <p className="text-white font-bold text-lg mb-1">{teacher.location?.district || "N/A"}</p>
             <p className="text-[#94A3B8] font-medium">{teacher.location?.region || "N/A"}, {teacher.location?.country || "Uzbekistan"}</p>
           </div>
        </div>
      </div>

      {/* RIGHT COLUMN: PROFESSIONAL DETAILS & CONTACT */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Professional Details Editor */}
        <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-bold text-xl">Professional Details</h3>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-[#3B82F6] bg-[#3B82F6]/10 px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#3B82F6]/20 transition-all">
                <Edit2 size={16}/> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => setIsEditing(false)} className="text-[#94A3B8] hover:text-white text-sm font-bold px-3">Cancel</button>
                <button onClick={handleSaveProfile} disabled={isSaving} className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg disabled:opacity-50">
                  {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save Changes
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoBlock 
              icon={<BookOpen/>} label="Subject" 
              value={isEditing ? <input value={editForm.subject} onChange={e => setEditForm({...editForm, subject: e.target.value})} className="w-full bg-[#0F172A] border border-[#3B82F6] text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B82F6]/30 transition-all" placeholder="E.g. Matematika"/> : <span className="capitalize">{teacher.subject || "Not set"}</span>} 
            />
            <InfoBlock 
              icon={<Building2/>} label="Institution" 
              value={isEditing ? <input value={editForm.institution} onChange={e => setEditForm({...editForm, institution: e.target.value})} className="w-full bg-[#0F172A] border border-[#3B82F6] text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B82F6]/30 transition-all" placeholder="School Name"/> : teacher.institution} 
            />
            <InfoBlock 
              icon={<Briefcase/>} label="Experience (Years)" 
              value={isEditing ? <input type="number" min="0" value={editForm.experience} onChange={e => setEditForm({...editForm, experience: Number(e.target.value)})} className="w-full bg-[#0F172A] border border-[#3B82F6] text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B82F6]/30 transition-all"/> : `${teacher.experience || 0} Years`} 
            />
            <InfoBlock 
              icon={<User/>} label="Gender" 
              value={isEditing ? (
                <select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="w-full bg-[#0F172A] border border-[#3B82F6] text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B82F6]/30 transition-all">
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              ) : <span className="capitalize">{teacher.gender || "Not set"}</span>} 
            />
          </div>

          <div className="mt-6">
            <label className="text-xs uppercase font-bold text-[#94A3B8] mb-2 block">Biography</label>
            {isEditing ? (
              <textarea rows={4} value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} className="w-full bg-[#0F172A] border border-[#3B82F6] text-white rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-[#3B82F6]/30 transition-all resize-none" placeholder="Teacher's biography..."/>
            ) : (
              <div className="bg-[#0F172A] p-5 rounded-2xl border border-[#334155]">
                <p className="text-white text-sm leading-relaxed">{teacher.bio || <span className="text-[#94A3B8] italic">No biography provided.</span>}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Info (Read Only) */}
        <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-lg">
          <h3 className="text-white font-bold text-xl mb-6">Contact Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoBlock icon={<Mail/>} label="Email Address" value={teacher.email} />
            <InfoBlock 
              icon={<Phone/>} label="Phone Number" 
              value={isEditing ? <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-[#0F172A] border border-[#3B82F6] text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B82F6]/30 transition-all" placeholder="+998..."/> : teacher.phone} 
            />
            <InfoBlock icon={<Calendar/>} label="Date of Birth" value={teacher.birthDate} />
          </div>
        </div>

      </div>
    </div>
  );
}

// Sub-components for Overview Tab
function InfoBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | React.ReactNode | null | undefined }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#0F172A] border border-[#334155]">
      <div className="text-[#3B82F6] mt-1 p-2 bg-[#1E293B] rounded-lg border border-[#334155]">{icon}</div>
      <div className="flex-1 w-full">
        <p className="text-[11px] uppercase font-bold text-[#94A3B8] mb-1">{label}</p>
        <div className="text-white font-medium text-[15px]">{value || <span className="text-slate-500">N/A</span>}</div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string, value: number | string | React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-[#334155] last:border-0 last:pb-0">
      <span className="text-[#94A3B8] font-medium text-[15px]">{label}</span>
      <span className="text-white font-black text-xl bg-[#0F172A] px-3 py-1 rounded-lg border border-[#334155]">{value}</span>
    </div>
  );
}