"use client";

import { useState } from "react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreditCard, Calendar, Save, Loader2, ShieldAlert, Bot, Zap, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

const formatForInput = (ts: any) => {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return date.toISOString().split('T')[0];
};

export default function MembershipTab({ teacher, onUpdated }: any) {
  const [isSavingSub, setIsSavingSub] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Sub States
  const [planId, setPlanId] = useState(teacher.planId || "free");
  const [status, setStatus] = useState(teacher.subscriptionStatus || "trialing");
  const [trialEndsAt, setTrialEndsAt] = useState(formatForInput(teacher.trialEndsAt));
  const [subEndsAt, setSubEndsAt] = useState(formatForInput(teacher.subscriptionEndsAt));

  // AI Limit States
  const [newAiLimit, setNewAiLimit] = useState<number>(teacher.aiDailyQuestionLimit || 50);

  const handleSaveSubscription = async () => {
    setIsSavingSub(true);
    try {
      const payload: any = { planId, subscriptionStatus: status };
      payload.trialEndsAt = trialEndsAt ? Timestamp.fromDate(new Date(trialEndsAt)) : null;
      payload.subscriptionEndsAt = subEndsAt ? Timestamp.fromDate(new Date(subEndsAt)) : null;
      
      await updateDoc(doc(db, "users", teacher.id), payload);
      toast.success("Membership updated successfully!");
      onUpdated();
    } catch (error) { toast.error("Failed to update membership."); } 
    finally { setIsSavingSub(false); }
  };

  const handleUpdateAiLimit = async () => {
    setIsSavingAI(true);
    try {
      await updateDoc(doc(db, "users", teacher.id), { aiDailyQuestionLimit: Number(newAiLimit) });
      toast.success(`AI Limit updated to ${newAiLimit}/day!`);
      onUpdated();
    } catch (error) { toast.error("Failed to update AI Limit."); } 
    finally { setIsSavingAI(false); }
  };

  const handleResetAiUsage = async () => {
    if (!confirm("Are you sure you want to refund this teacher's daily AI usage back to 0?")) return;
    setIsResetting(true);
    try {
      // Create today's date in YYYY-MM-DD for Tashkent timezone simulation
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
      await updateDoc(doc(db, "users", teacher.id), { 
        aiQuestionUsedToday: 0,
        aiQuestionLastResetDate: today 
      });
      toast.success("AI usage reset to 0!");
      onUpdated();
    } catch (error) { toast.error("Failed to reset usage."); } 
    finally { setIsResetting(false); }
  };

  const aiUsed = teacher.aiQuestionUsedToday || 0;
  const aiLimit = teacher.aiDailyQuestionLimit || 50;
  const aiPercentage = Math.min((aiUsed / aiLimit) * 100, 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* LEFT: SUBSCRIPTION CONTROLS */}
      <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-lg flex flex-col h-full">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-xl">
          <CreditCard size={22} className="text-[#3B82F6]"/> Subscription Plan
        </h3>

        <div className="space-y-5 flex-1">
          <div>
            <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Membership Plan</label>
            <select value={planId} onChange={e => setPlanId(e.target.value)} className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3.5 outline-none focus:border-[#3B82F6] transition-colors font-bold text-sm">
              <option value="free">Free (Basic)</option>
              <option value="pro">Pro Teacher</option>
              <option value="school_license">School License (B2B)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3.5 outline-none focus:border-[#3B82F6] transition-colors font-bold text-sm">
              <option value="trialing">Trialing</option>
              <option value="active">Active (Paid)</option>
              <option value="past_due">Past Due / Unpaid</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2 flex items-center gap-1.5"><Calendar size={14}/> Trial Ends</label>
              <input type="date" value={trialEndsAt} onChange={e => setTrialEndsAt(e.target.value)} className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3.5 outline-none focus:border-[#3B82F6] [color-scheme:dark] font-mono text-sm"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2 flex items-center gap-1.5"><Calendar size={14}/> Sub Ends</label>
              <input type="date" value={subEndsAt} onChange={e => setSubEndsAt(e.target.value)} className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3.5 outline-none focus:border-[#3B82F6] [color-scheme:dark] font-mono text-sm"/>
            </div>
          </div>
        </div>

        <button onClick={handleSaveSubscription} disabled={isSavingSub} className="w-full mt-8 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50">
          {isSavingSub ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Update Plan Data
        </button>
      </div>

      {/* RIGHT: AI LIMITS (THE GATEKEEPER SYSTEM) */}
      <div className="space-y-6">
        
        {/* AI Limit Editor Card */}
        <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
          
          <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-xl relative z-10">
            <Bot size={22} className="text-indigo-400"/> AI Generation Tracker
          </h3>
          
          <div className="space-y-6 relative z-10">
            {/* Progress Bar */}
            <div className="bg-[#0F172A] p-5 rounded-2xl border border-[#334155]">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-white font-bold text-lg">Usage Today</p>
                  <p className="text-xs text-[#94A3B8] font-mono mt-0.5">Last Reset: {teacher.aiQuestionLastResetDate || "Never"}</p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black ${aiUsed >= aiLimit ? 'text-red-400' : 'text-indigo-400'}`}>{aiUsed}</span>
                  <span className="text-[#94A3B8] font-bold"> / {aiLimit}</span>
                </div>
              </div>
              <div className="w-full bg-[#1E293B] rounded-full h-3 border border-[#334155] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${aiUsed >= aiLimit ? 'bg-red-500' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`} style={{ width: `${aiPercentage}%` }}></div>
              </div>
            </div>

            {/* Edit Limit */}
            <div className="flex items-end gap-3 pt-2">
              <div className="flex-1">
                <label className="text-[11px] uppercase font-bold text-[#94A3B8] mb-2 block tracking-widest">Adjust Daily Limit</label>
                <div className="relative">
                  <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={16}/>
                  <input type="number" min="0" value={newAiLimit} onChange={(e) => setNewAiLimit(Number(e.target.value))} className="w-full bg-[#0F172A] border border-[#334155] text-white font-black text-lg rounded-xl pl-12 pr-4 py-3 outline-none focus:border-indigo-500 transition-colors"/>
                </div>
              </div>
              <button onClick={handleUpdateAiLimit} disabled={isSavingAI} className="px-6 py-3.5 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition flex items-center justify-center min-w-[100px] shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                {isSavingAI ? <Loader2 size={18} className="animate-spin"/> : "Save"}
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone: Manual Reset */}
        <div className="bg-red-500/5 rounded-3xl border border-red-500/20 p-8 shadow-lg">
          <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2 text-lg">
            <ShieldAlert size={20}/> Emergency Refund
          </h3>
          <p className="text-sm text-[#94A3B8] mb-6 leading-relaxed">
            If this teacher lost AI credits due to a generation error or bug, use this to manually reset their <b>Usage Today</b> counter back to zero, allowing them to regenerate.
          </p>
          <button onClick={handleResetAiUsage} disabled={isResetting} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3.5 rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {isResetting ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />} Reset Today's Usage to 0
          </button>
        </div>

      </div>
    </div>
  );
}