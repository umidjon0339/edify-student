"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreditCard, Calendar, Save, Loader2, Bot, Zap, RotateCcw, Layout, Users, CheckSquare, Square } from "lucide-react";
import toast from "react-hot-toast";

// YOUR PLANS CONFIG
import { PLANS_CONFIG, FEATURE_REGISTRY, PlanId, FeatureKey } from "@/app/teacher/subscription/plansData";

const formatForInput = (ts: any) => {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  
  // Safely extract local Year, Month, and Day to avoid UTC timezone shifts
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export default function MembershipTab({ teacher, onUpdated }: any) {
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // 1. STATE INITIALIZATION
  const sub = teacher.subscription || {};
  const limits = teacher.currentLimits || {};
  const usage = teacher.usage || {};

  const [planId, setPlanId] = useState<PlanId | 'custom'>((sub.planId as PlanId) || teacher.planId || "free");
  const [billingCycle, setBillingCycle] = useState(sub.billingCycle || "monthly");
  const [status, setStatus] = useState(sub.status || teacher.subscriptionStatus || "active");
  const [expiresAt, setExpiresAt] = useState(formatForInput(sub.expiresAt || teacher.subscriptionEndsAt));

  const [maxClasses, setMaxClasses] = useState<number>(limits.maxClasses ?? 1);
  const [maxStudents, setMaxStudents] = useState<number>(limits.maxStudents ?? 20);
  const [monthlyAiQuestions, setMonthlyAiQuestions] = useState<number>(limits.monthlyAiQuestions ?? teacher.aiDailyQuestionLimit ?? 100);

  const [includedFeatures, setIncludedFeatures] = useState<FeatureKey[]>(teacher.includedFeatures || ['ONLINE_LIBRARY']);

  // 🟢 NEW: State for AI Reset Date
  const [aiResetDate, setAiResetDate] = useState(usage.aiLimitResetDate || "");

  // Read-Only Usage
  const usedClasses = usage.activeClassCount ?? teacher.activeClassCount ?? 0;
  const usedStudents = usage.totalStudents ?? teacher.totalStudents ?? 0;
  const usedAi = usage.aiQuestionsUsed ?? teacher.aiQuestionUsedToday ?? 0;

  // 2. SYNC EFFECT (Prevents React Stale State)
  useEffect(() => {
    const freshSub = teacher.subscription || {};
    const freshLimits = teacher.currentLimits || {};
    const freshUsage = teacher.usage || {};
    
    setPlanId((freshSub.planId as PlanId) || teacher.planId || "free");
    setBillingCycle(freshSub.billingCycle || "monthly");
    setStatus(freshSub.status || teacher.subscriptionStatus || "active");
    setExpiresAt(formatForInput(freshSub.expiresAt || teacher.subscriptionEndsAt));
    
    setMaxClasses(freshLimits.maxClasses ?? 1);
    setMaxStudents(freshLimits.maxStudents ?? 20);
    setMonthlyAiQuestions(freshLimits.monthlyAiQuestions ?? teacher.aiDailyQuestionLimit ?? 100);
    setIncludedFeatures(teacher.includedFeatures || ['ONLINE_LIBRARY']);
    
    // 🟢 NEW: Sync AI Reset Date
    setAiResetDate(freshUsage.aiLimitResetDate || "");
  }, [teacher]);

  // SMART AUTO-FILL
  const handlePlanChange = (newPlanId: PlanId | 'custom') => {
    setPlanId(newPlanId);
    
    if (newPlanId !== 'custom' && PLANS_CONFIG[newPlanId as PlanId]) {
      const plan = PLANS_CONFIG[newPlanId as PlanId];
      
      // 1. Limitlarni yangilash
      setMaxClasses(plan.limits.maxClasses);
      setMaxStudents(plan.limits.maxStudents);
      setMonthlyAiQuestions(plan.limits.monthlyAiQuestions);
      setIncludedFeatures(plan.includedFeatures);

      // 2. 🟢 SMART STATUS UPDATE
      // Agar admin qo'lda tarifni o'zgartirsa, status "Expired" bo'lsa uni "Active"ga qaytaramiz
      if (status === "expired" || status === "canceled" || status === "past_due") {
        setStatus("active");
      }

      // 3. Expiry Date mantiqi
      if (newPlanId === 'free') {
        setExpiresAt("");
      } else {
        // Agar pullik tarifga o'tsa va sana bo'sh bo'lsa, avtomatik 1 oy qo'shish (ixtiyoriy)
        if (!expiresAt) {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          setExpiresAt(nextMonth.toISOString().split('T')[0]);
        }
      }

      toast.success(`Loaded defaults for ${plan.ui.name}`);
    }
  };

  const toggleFeature = (featureKey: FeatureKey) => {
    setIncludedFeatures(prev => prev.includes(featureKey) ? prev.filter(f => f !== featureKey) : [...prev, featureKey]);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Safe Date parsing to prevent Firebase crashes
      let validExpiryTimestamp = null;
      if (expiresAt && expiresAt.trim() !== "") {
        const dateObj = new Date(expiresAt);
        if (!isNaN(dateObj.getTime())) {
          validExpiryTimestamp = Timestamp.fromDate(dateObj);
        }
      }

      await updateDoc(doc(db, "users", teacher.id), {
        "subscription.planId": planId,
        "subscription.billingCycle": billingCycle,
        "subscription.status": status,
        "subscription.expiresAt": validExpiryTimestamp,
        "currentLimits.maxClasses": Number(maxClasses),
        "currentLimits.maxStudents": Number(maxStudents),
        "currentLimits.monthlyAiQuestions": Number(monthlyAiQuestions),
        "includedFeatures": includedFeatures,
        
        // 🟢 NEW: Save the AI Reset Date directly to the usage object
        "usage.aiLimitResetDate": aiResetDate
      });
      
      toast.success("Teacher SaaS Plan updated successfully!");
      onUpdated();
    } catch (error) { 
      toast.error("Failed to update membership."); 
      console.error(error);
    } 
    finally { setIsSaving(false); }
  };

  const handleResetAiUsage = async () => {
    if (!confirm("Are you sure you want to refund this teacher's AI usage to 0?")) return;
    setIsResetting(true);
    try {
      await updateDoc(doc(db, "users", teacher.id), { "usage.aiQuestionsUsed": 0 });
      toast.success("AI usage reset to 0!");
      onUpdated();
    } catch (error) { toast.error("Failed to reset usage."); } 
    finally { setIsResetting(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* 1. USAGE VS LIMITS OVERVIEW */}
      <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-6 shadow-lg">
        <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-lg">
          <Zap size={20} className="text-emerald-400"/> Current Usage vs Limits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UsageBar icon={<Layout size={16}/>} label="Classes" used={usedClasses} limit={maxClasses} color="emerald" />
          <UsageBar icon={<Users size={16}/>} label="Students" used={usedStudents} limit={maxStudents} color="blue" />
          <UsageBar icon={<Bot size={16}/>} label="AI Questions" used={usedAi} limit={monthlyAiQuestions} color="indigo" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* 2. SUBSCRIPTION CONTROLS */}
        <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-lg flex flex-col">
          <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-xl">
            <CreditCard size={22} className="text-[#3B82F6]"/> Subscription State
          </h3>
          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Base Plan</label>
              
              {/* 🟢 100% DYNAMIC DROPDOWN */}
              <select value={planId} onChange={e => handlePlanChange(e.target.value as any)} className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3.5 outline-none focus:border-[#3B82F6] font-bold text-sm">
                {Object.values(PLANS_CONFIG).map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.ui.name} ({plan.id.toUpperCase()})</option>
                ))}
                <option value="custom">Custom Override (B2B)</option>
              </select>

            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Cycle</label>
                <select value={billingCycle} onChange={e => setBillingCycle(e.target.value)} className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3.5 outline-none focus:border-[#3B82F6] font-bold text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="sixMonth">6-Months</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3.5 outline-none focus:border-[#3B82F6] font-bold text-sm">
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2 flex items-center gap-1.5"><Calendar size={14}/> Expiry Date</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3.5 outline-none focus:border-[#3B82F6] [color-scheme:dark] font-mono text-sm"/>
            </div>
          </div>
        </div>

        {/* 3. LIMITS & FEATURES */}
        <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-lg">
          <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-xl">
            <Layout size={22} className="text-amber-400"/> Hard Limits & Entitlements
          </h3>
          <div className="space-y-4 mb-6">
            <LimitInput label="Max Classes" value={maxClasses} onChange={setMaxClasses} />
            <LimitInput label="Max Students" value={maxStudents} onChange={setMaxStudents} />
            <LimitInput label="Monthly AI Questions" value={monthlyAiQuestions} onChange={setMonthlyAiQuestions} />
            
            {/* 🟢 NEW: AI RESET DATE INPUT */}
            <div className="flex items-center justify-between p-2.5 bg-[#0F172A] rounded-xl border border-[#334155]">
              <span className="text-[13px] font-bold text-[#94A3B8] pl-2 flex items-center gap-1.5">
                <RotateCcw size={14}/> Next AI Reset Date
              </span>
              <input 
                type="date" 
                value={aiResetDate} 
                onChange={(e) => setAiResetDate(e.target.value)} 
                className="w-36 p-2 bg-[#1E293B] border border-[#334155] text-white rounded-lg text-sm font-black text-center outline-none focus:border-[#3B82F6] [color-scheme:dark]" 
              />
            </div>
          </div>
          <div className="pt-6 border-t border-[#334155]">
             <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Enabled Features</label>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {(Object.keys(FEATURE_REGISTRY) as FeatureKey[]).map(key => {
                 const isEnabled = includedFeatures.includes(key);
                 return (
                   <div key={key} onClick={() => toggleFeature(key)} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${isEnabled ? 'bg-[#3B82F6]/10 border-[#3B82F6]/30 text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B] hover:border-[#94A3B8]/30'}`}>
                     <div className="mt-0.5">{isEnabled ? <CheckSquare size={16} className="text-[#3B82F6]" /> : <Square size={16} />}</div>
                     <span className="text-xs font-bold leading-snug">{FEATURE_REGISTRY[key].label}</span>
                   </div>
                 )
               })}
             </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-[#0F172A] rounded-3xl border border-[#334155]">
        <button onClick={handleResetAiUsage} disabled={isResetting} className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold border border-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          {isResetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Refund AI Usage
        </button>
        <button onClick={handleSaveAll} disabled={isSaving} className="w-full sm:w-auto px-8 py-3.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save All Master Settings
        </button>
      </div>
    </div>
  );
}

// Subcomponents
function UsageBar({ icon, label, used, limit, color }: any) {
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isDanger = percent >= 90;
  const colorMap: any = { emerald: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]', blue: 'bg-[#3B82F6] shadow-[0_0_10px_rgba(59,130,246,0.5)]', indigo: 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]', danger: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' };
  return (
    <div className="bg-[#0F172A] p-4 rounded-2xl border border-[#334155]">
      <div className="flex justify-between items-end mb-2.5">
        <div className="flex items-center gap-1.5 text-[#94A3B8] font-bold text-xs uppercase tracking-wider">{icon} {label}</div>
        <div className="text-right"><span className={`text-xl font-black ${isDanger ? 'text-red-400' : 'text-white'}`}>{used}</span><span className="text-[#64748B] font-bold text-sm"> / {limit >= 5000 ? '∞' : limit}</span></div>
      </div>
      <div className="w-full bg-[#1E293B] rounded-full h-2 border border-[#334155] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${isDanger ? colorMap.danger : colorMap[color]}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function LimitInput({ label, value, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-2.5 bg-[#0F172A] rounded-xl border border-[#334155]">
      <span className="text-[13px] font-bold text-[#94A3B8] pl-2">{label}</span>
      <input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-24 p-2 bg-[#1E293B] border border-[#334155] text-white rounded-lg text-sm font-black text-center outline-none focus:border-[#3B82F6]" />
    </div>
  );
}