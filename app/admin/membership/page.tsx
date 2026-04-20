'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldAlert, TrendingUp, Users, Crown, Settings2, X, Save, UserCircle, MapPin, BookOpen, Phone, Calendar, Loader2 } from 'lucide-react';

// 🔥 FIREBASE IMPORTS (Adjust this path to your actual firebase config file)
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // <--- CHANGE THIS TO YOUR DB IMPORT

export default function AdminMembershipPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // Modal State
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 🟢 1. FETCH TEACHERS FROM FIREBASE
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "teacher"));
        const querySnapshot = await getDocs(q);
        
        const fetchedTeachers: any[] = [];
        querySnapshot.forEach((doc) => {
          fetchedTeachers.push({ uid: doc.id, ...doc.data() });
        });
        
        setTeachers(fetchedTeachers);
      } catch (error) {
        console.error("Error fetching teachers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  // 🟢 2. FILTER LOGIC
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const name = t.displayName || '';
      const email = t.email || '';
      const planId = t.subscription?.planId || 'free';
      
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'all' || planId === activeTab;
      
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab, teachers]);

  // 🟢 3. OPEN MODAL & INIT FORM
  const handleOpenProfile = (teacher: any) => {
    setSelectedTeacher(teacher);
    setEditForm({
      planId: teacher.subscription?.planId || 'free',
      maxClasses: teacher.currentLimits?.maxClasses || 1,
      maxStudents: teacher.currentLimits?.maxStudents || 20,
      monthlyAiQuestions: teacher.currentLimits?.monthlyAiQuestions || 100
    });
  };

  // 🟢 4. SAVE TO FIREBASE
  const handleSaveChanges = async () => {
    if (!selectedTeacher) return;
    setIsSaving(true);
    
    try {
      const userRef = doc(db, "users", selectedTeacher.uid);
      
      // Update the database
      await updateDoc(userRef, {
        "subscription.planId": editForm.planId,
        "currentLimits.maxClasses": Number(editForm.maxClasses),
        "currentLimits.maxStudents": Number(editForm.maxStudents),
        "currentLimits.monthlyAiQuestions": Number(editForm.monthlyAiQuestions)
      });

      // Update local state instantly so UI reflects changes without reloading
      setTeachers(prev => prev.map(t => {
        if (t.uid === selectedTeacher.uid) {
          return {
            ...t,
            subscription: { ...t.subscription, planId: editForm.planId },
            currentLimits: { 
              ...t.currentLimits, 
              maxClasses: Number(editForm.maxClasses), 
              maxStudents: Number(editForm.maxStudents),
              monthlyAiQuestions: Number(editForm.monthlyAiQuestions)
            }
          };
        }
        return t;
      }));

      setSelectedTeacher(null); // Close modal
      alert("✅ Teacher profile updated successfully!");

    } catch (error) {
      console.error("Error updating teacher:", error);
      alert("❌ Failed to update teacher. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 md:p-10">
      
      {/* HEADER STATS */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-black text-slate-900 mb-6">Membership & Users</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={<Users />} title="Total Teachers" value={teachers.length.toString()} />
          <StatCard icon={<Crown className="text-amber-500" />} title="Paid Subscribers" value={teachers.filter(t => t.subscription?.planId !== 'free').length.toString()} />
          <StatCard icon={<TrendingUp className="text-emerald-500" />} title="Database Health" value="100%" />
          <StatCard icon={<ShieldAlert className="text-rose-500" />} title="Pending Reviews" value="0" />
        </div>
      </div>

      {/* MAIN DASHBOARD AREA */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {['all', 'free', 'pro', 'vip', 'custom'].map(tab => (
              <button 
                key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search by name or email..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[12px] uppercase tracking-wider font-bold">
                <th className="p-4 pl-6">Teacher Profile</th>
                <th className="p-4">Plan Status</th>
                <th className="p-4">Class Usage</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((teacher) => {
                const planId = teacher.subscription?.planId || 'free';
                const usedClasses = teacher.usage?.activeClassCount || teacher.activeClassCount || 0;
                const limitClasses = teacher.currentLimits?.maxClasses || 1;

                return (
                  <tr key={teacher.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 pl-6 flex items-center gap-3">
                      {teacher.photoURL ? (
                        <img src={teacher.photoURL} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                          <UserCircle size={24} />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900">{teacher.displayName || "Unknown"}</div>
                        <div className="text-[13px] text-slate-500">{teacher.email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <PlanBadge planId={planId} />
                    </td>
                    <td className="p-4">
                      <ProgressBar used={usedClasses} limit={limitClasses} label="Classes" />
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button 
                        onClick={() => handleOpenProfile(teacher)}
                        className="px-4 py-2 text-[13px] font-bold text-indigo-700 bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white shadow-sm"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-500 font-medium">No teachers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟢 VIEW PROFILE & MANAGE MODAL */}
      <AnimatePresence>
        {selectedTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <UserCircle className="text-indigo-600" /> User Profile & Membership
                </h2>
                <button onClick={() => setSelectedTeacher(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-rose-500 shadow-sm border border-slate-200 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body - 2 Columns */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* LEFT COLUMN: PROFILE DETAILS */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">Personal Information</h3>
                    
                    <div className="flex flex-col items-center mb-6 text-center">
                      {selectedTeacher.photoURL ? (
                        <img src={selectedTeacher.photoURL} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-indigo-50 shadow-md mb-3" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 border border-slate-200 mb-3"><UserCircle size={48} /></div>
                      )}
                      <h4 className="text-xl font-black text-slate-900">{selectedTeacher.displayName || "No Name"}</h4>
                      <p className="text-sm font-medium text-slate-500">@{selectedTeacher.username || "username"}</p>
                    </div>

                    <div className="space-y-4">
                      <ProfileField icon={<Phone />} label="Phone" value={selectedTeacher.phone} />
                      <ProfileField icon={<MapPin />} label="Location" value={selectedTeacher.location ? `${selectedTeacher.location.region}, ${selectedTeacher.location.district}` : null} />
                      <ProfileField icon={<BookOpen />} label="Subject" value={selectedTeacher.subject} />
                      <ProfileField icon={<Calendar />} label="Joined" value={selectedTeacher.createdAt ? new Date(selectedTeacher.createdAt).toLocaleDateString() : 'Unknown'} />
                      
                      <div className="pt-2">
                        <span className="text-[12px] font-bold text-slate-400 block mb-1">Bio</span>
                        <p className="text-[13px] text-slate-700 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {selectedTeacher.bio || "No bio provided."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: SUBSCRIPTION MANAGEMENT */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">Subscription & Limits</h3>
                    
                    <div className="space-y-6">
                      {/* Plan Dropdown */}
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 mb-2">Current Plan</label>
                        <select 
                          value={editForm.planId}
                          onChange={(e) => setEditForm({...editForm, planId: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="free">Start (Free)</option>
                          <option value="pro">Pro Teacher</option>
                          <option value="vip">VIP Teacher</option>
                          <option value="custom">Custom B2B License</option>
                        </select>
                      </div>

                      <div className="h-px bg-slate-100 w-full"></div>

                      {/* Manual Limit Inputs */}
                      <div>
                        <label className="block text-[12px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Settings2 size={16} /> Hard Limit Adjustments
                        </label>
                        <div className="space-y-4">
                          <LimitInput label="Max Classes" value={editForm.maxClasses} onChange={(val) => setEditForm({...editForm, maxClasses: val})} />
                          <LimitInput label="Max Students" value={editForm.maxStudents} onChange={(val) => setEditForm({...editForm, maxStudents: val})} />
                          <LimitInput label="Monthly AI Questions" value={editForm.monthlyAiQuestions} onChange={(val) => setEditForm({...editForm, monthlyAiQuestions: val})} />
                        </div>
                        <p className="text-[11px] font-medium text-slate-400 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <strong>Note:</strong> Editing limits manually forces the teacher into a Custom override. It ignores default plan limitations.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setSelectedTeacher(null)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSaveChanges} 
                  disabled={isSaving}
                  className="px-8 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// --- SUBCOMPONENTS ---

function StatCard({ icon, title, value }: { icon: any, title: string, value: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
      <div className="flex items-center gap-3 text-slate-500 mb-3">
        {icon} <span className="text-[13px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      <span className="text-2xl font-black text-slate-900">{value}</span>
    </div>
  );
}

function PlanBadge({ planId }: { planId: string }) {
  switch (planId) {
    case 'pro': return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[11px] font-black uppercase tracking-wider rounded-md">PRO</span>;
    case 'vip': return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-black uppercase tracking-wider rounded-md">VIP</span>;
    case 'custom': return <span className="px-2.5 py-1 bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider rounded-md">CUSTOM</span>;
    default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-wider rounded-md">FREE</span>;
  }
}

function ProgressBar({ used, limit, label }: { used: number, limit: number, label: string }) {
  const percent = Math.min(Math.round((used / limit) * 100), 100);
  const isDanger = percent >= 90;
  
  return (
    <div className="w-full min-w-[120px]">
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-[11px] font-bold text-slate-500">{label}</span>
        <span className={`text-[12px] font-bold ${isDanger ? 'text-rose-500' : 'text-slate-900'}`}>{used} / {limit > 5000 ? '∞' : limit}</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${isDanger ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function ProfileField({ icon, label, value }: { icon: any, label: string, value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="text-slate-400">{icon}</div>
      <div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-1">{label}</span>
        <span className="text-[14px] font-bold text-slate-900 leading-none">{value}</span>
      </div>
    </div>
  );
}

function LimitInput({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
      <span className="text-[13px] font-bold text-slate-700">{label}</span>
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 p-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" 
      />
    </div>
  );
}