"use client";

import { useState } from "react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  CreditCard, Calendar, Activity, Save, 
  RotateCcw, Loader2, ShieldAlert
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  teacher: any;
  onUpdated: () => void;
}

const formatForInput = (ts: any) => {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return date.toISOString().split('T')[0];
};

export default function MembershipTab({ teacher, onUpdated }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [planId, setPlanId] = useState(teacher.planId || "free");
  const [status, setStatus] = useState(teacher.subscriptionStatus || "trialing");
  const [trialEndsAt, setTrialEndsAt] = useState(formatForInput(teacher.trialEndsAt));
  const [subEndsAt, setSubEndsAt] = useState(formatForInput(teacher.subscriptionEndsAt));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        planId,
        subscriptionStatus: status,
      };

      if (trialEndsAt) {
        payload.trialEndsAt = Timestamp.fromDate(new Date(trialEndsAt));
      } else {
        payload.trialEndsAt = null;
      }

      if (subEndsAt) {
        payload.subscriptionEndsAt = Timestamp.fromDate(new Date(subEndsAt));
      } else {
        payload.subscriptionEndsAt = null;
      }

      await updateDoc(doc(db, "users", teacher.id), payload);
      toast.success("Membership updated successfully!");
      onUpdated();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update membership.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAI = async () => {
    if (!confirm("Reset this teacher's daily AI limit to 0?")) return;
    setIsResetting(true);
    try {
      await updateDoc(doc(db, "users", teacher.id), {
        aiRequestsToday: 0
      });
      toast.success("AI Limit reset to 0.");
      onUpdated();
    } catch (error) {
      console.error(error);
      toast.error("Failed to reset AI limit.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
      
      <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6 shadow-lg space-y-6">
        <h3 className="text-white font-bold flex items-center gap-2 mb-4">
          <CreditCard size={18} className="text-[#3B82F6]"/> Subscription Controls
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] uppercase mb-1">Membership Plan</label>
            <select 
              value={planId} 
              onChange={e => setPlanId(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3 outline-none focus:border-[#3B82F6] transition-colors"
            >
              <option value="free">Free (Basic)</option>
              <option value="pro">Pro Teacher</option>
              <option value="school_license">School License (B2B)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#94A3B8] uppercase mb-1">Status</label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3 outline-none focus:border-[#3B82F6] transition-colors"
            >
              <option value="trialing">Trialing</option>
              <option value="active">Active (Paid)</option>
              <option value="past_due">Past Due / Unpaid</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Trial Ends</label>
              <input 
                type="date" 
                value={trialEndsAt}
                onChange={e => setTrialEndsAt(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3 outline-none focus:border-[#3B82F6] [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Sub Ends</label>
              <input 
                type="date" 
                value={subEndsAt}
                onChange={e => setSubEndsAt(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl p-3 outline-none focus:border-[#3B82F6] [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#334155]">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Membership Data
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6 shadow-lg">
          <h3 className="text-white font-bold flex items-center gap-2 mb-4">
            <Activity size={18} className="text-emerald-400"/> Current Usage
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#334155]">
              <span className="text-[#94A3B8] text-sm font-medium">Active Classes</span>
              <span className="text-white font-black text-lg">{teacher.activeClassCount || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-[#334155]">
              <span className="text-[#94A3B8] text-sm font-medium">Custom Tests Built</span>
              <span className="text-white font-black text-lg">{teacher.customTestCount || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-[#334155]">
              <span className="text-[#94A3B8] text-sm font-medium">AI Requests Today</span>
              <span className="text-amber-400 font-black text-lg">{teacher.aiRequestsToday || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#94A3B8] text-sm font-medium">Last AI Request Date</span>
              <span className="text-white font-mono text-sm">{teacher.lastAiRequestDate || "Never"}</span>
            </div>
          </div>
        </div>

        <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-6 shadow-lg">
          <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
            <ShieldAlert size={18}/> Admin Overrides
          </h3>
          <p className="text-xs text-[#94A3B8] mb-4">
            If this teacher complains about hitting their AI limit due to a system error, you can reset their daily counter here.
          </p>
          <button 
            onClick={handleResetAI}
            disabled={isResetting}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-xl border border-red-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isResetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            Reset AI Limit to 0
          </button>
        </div>
      </div>

    </div>
  );
}