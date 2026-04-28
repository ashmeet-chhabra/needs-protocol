import React from "react";
import { VolunteerProfile } from "../types";
import { Users, MapPin, Shield, Activity, X, Briefcase } from "lucide-react";
import { motion } from "motion/react";

interface OrganizationProfileModalProps {
  organizationName: string;
  volunteers: VolunteerProfile[];
  onClose: () => void;
}

export default function OrganizationProfileModal({ organizationName, volunteers, onClose }: OrganizationProfileModalProps) {
  // Find all volunteers belonging to this org
  const orgVols = volunteers.filter(v => v.organization === organizationName);
  
  // Aggregate skills
  const allSkills = orgVols.flatMap(v => v.skills);
  const topSkills = Array.from(new Set(allSkills)).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] border border-slate-200"
      >
        {/* Cover Photo / Header Area */}
        <div className="h-28 bg-navy-900 relative p-6 flex items-end">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-white border-4 border-white shadow-lg flex items-center justify-center text-navy-900 font-display font-black text-2xl">
              {organizationName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-white flex items-center gap-2">
                {organizationName}
                <Shield className="w-4 h-4 text-teal-400" />
              </h2>
              <p className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-widest">Authorized Protocol Entity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-mono font-black text-navy-900 leading-none mb-1">{orgVols.length}</div>
              <div className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Users className="w-3 h-3" /> Personnel
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-mono font-black text-navy-900 leading-none mb-1">{topSkills.length}</div>
              <div className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Activity className="w-3 h-3" /> Capabilities
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Core Competencies</h3>
            <div className="flex flex-wrap gap-1.5">
              {topSkills.map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-white border border-slate-200 text-navy-900 rounded shadow-sm text-[9px] font-mono font-black uppercase tracking-tight">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Active Roster</h3>
            <div className="space-y-2">
              {orgVols.map(v => (
                <div key={v.id || v.name} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-navy-50 flex items-center justify-center text-navy-900 font-mono font-black text-[10px]">
                      {v.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-display font-black text-navy-900 leading-none mb-1">{v.name}</div>
                      <div className="text-[9px] font-mono font-bold text-slate-400 flex items-center gap-1 uppercase">
                        <MapPin className="w-2.5 h-2.5" /> {v.location}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2 py-1 rounded border ${
                    v.availability === "High" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    v.availability === "Medium" ? "bg-amber-50 text-amber-600 border-amber-100" :
                    "bg-slate-50 text-slate-500 border-slate-100"
                  }`}>{v.availability}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-navy-900 text-white text-[10px] font-mono font-black uppercase tracking-widest rounded-lg hover:bg-navy-800 transition-all shadow-lg active:scale-95"
          >
            Dismiss Profile
          </button>
        </div>
      </motion.div>
    </div>
  );
}
