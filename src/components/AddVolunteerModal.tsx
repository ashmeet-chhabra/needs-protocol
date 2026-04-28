import React, { useState } from "react";
import { X, UserPlus, Shield, MapPin, Clock, ChevronRight, ChevronLeft, Target } from "lucide-react";
import { VolunteerProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AddVolunteerModalProps {
  onClose: () => void;
  onAdd: (volunteer: VolunteerProfile) => void;
}

export default function AddVolunteerModal({ onClose, onAdd }: AddVolunteerModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    skills: "",
    availability: "Medium",
    travelRadius: 10
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const skillsArray = formData.skills.split(",").map(s => s.trim()).filter(Boolean);
    
    onAdd({
      name: formData.name,
      location: formData.location,
      skills: skillsArray.length > 0 ? skillsArray : ["General Support"],
      availability: formData.availability,
      travelRadius: formData.travelRadius
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden relative border border-slate-200"
      >
        <div className="p-5 border-b border-slate-100 bg-navy-900 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
              <UserPlus className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-display font-black text-white leading-none">Personnel Intake</h2>
              <p className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-widest mt-1">New Protocol Participant</p>
            </div>
          </div>
          <button onClick={onClose} title="Close modal" className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex gap-2 mb-8">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                step >= s ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.4)]' : 'bg-slate-100'
              }`}></div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 text-navy-900 font-display font-black uppercase tracking-tight text-xs mb-4 pb-2 border-b border-slate-100">
                  <Shield className="w-4 h-4 text-teal-600" />
                  Primary Identification
                </div>
                
                <div>
                  <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name / Alias</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 transition-all font-medium text-sm"
                    placeholder="Enter personnel name..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mb-1.5">Operational Zone (Location)</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input 
                      type="text" 
                      required
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 transition-all font-medium text-sm"
                      placeholder="e.g. Koramangala, Bengaluru"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => {
                      if (formData.name && formData.location) setStep(2);
                    }}
                    disabled={!formData.name || !formData.location}
                    className="px-6 py-2.5 bg-navy-900 text-white font-bold rounded-lg hover:bg-navy-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg"
                  >
                    Next Protocol <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 text-navy-900 font-display font-black uppercase tracking-tight text-xs mb-4 pb-2 border-b border-slate-100">
                  <Target className="w-4 h-4 text-teal-600" />
                  Capabilities & Readiness
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mb-1.5">Skill Inventory (Comma-separated)</label>
                  <input 
                    type="text" 
                    value={formData.skills}
                    onChange={e => setFormData({...formData, skills: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 transition-all font-medium text-sm"
                    placeholder="e.g. Medical, Logistics, Food Safety"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-mono italic">AI uses these tags for cross-zone mapping.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mb-3">Deployment Radius: <span className="text-navy-900 font-black">{formData.travelRadius} KM</span></label>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={formData.travelRadius}
                    onChange={e => setFormData({...formData, travelRadius: parseInt(e.target.value)})}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mb-3">Availability Priority</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['High', 'Medium', 'Low'].map(level => (
                      <div 
                        key={level}
                        onClick={() => setFormData({...formData, availability: level})}
                        className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${
                          formData.availability === level 
                            ? 'border-navy-900 bg-navy-50 text-navy-900 ring-1 ring-navy-900' 
                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-widest block">{level}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-between gap-3">
                  <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-all text-xs uppercase tracking-widest flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-5 py-2.5 bg-teal-500 text-navy-900 font-black rounded-lg hover:bg-teal-400 transition-all shadow-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"
                  >
                    Register Personnel <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}
