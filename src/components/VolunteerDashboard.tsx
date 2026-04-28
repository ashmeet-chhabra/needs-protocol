import React, { useState, useEffect } from "react";
import { Need, VolunteerProfile, MatchResult } from "../types";
import { matchVolunteerToNeeds, optimizeAssignments } from "../services/ai";
import {
  Sparkles, Loader2, User, MapPin, CheckCircle2, ChevronRight,
  Activity, Plus, AlertCircle, Zap, Users, ArrowRight, Shield, Trash2, Clock, Wand2, XCircle, CheckSquare, Info, Target
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AddVolunteerModal from "./AddVolunteerModal";
import OrganizationProfileModal from "./OrganizationProfileModal";
import { getUrgencyStyles, getMatchScoreColor, BUTTON_STYLES } from "../styles/colors";
import { formatTimeRemaining, getAvailableVolunteers } from "../utils/volunteers";

interface VolunteerDashboardProps {
  needs: Need[];
  setNeeds: React.Dispatch<React.SetStateAction<Need[]>>;
  volunteers: VolunteerProfile[];
  setVolunteers?: React.Dispatch<React.SetStateAction<VolunteerProfile[]>>;
}

export default function VolunteerDashboard({ needs, setNeeds, volunteers, setVolunteers }: VolunteerDashboardProps) {
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerProfile | null>(volunteers[0] || null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeOrganization, setActiveOrganization] = useState<string | null>(null);
  
  // Smart Draft States
   const [draftAssignments, setDraftAssignments] = useState<Record<string, string> | null>(null);
   const [isDrafting, setIsDrafting] = useState(false);
   const [showAllAssignments, setShowAllAssignments] = useState(false);

  useEffect(() => {
    if (volunteers.length > 0 && !selectedVolunteer) {
      setSelectedVolunteer(volunteers[0]);
    } else if (volunteers.length > 0 && selectedVolunteer) {
      const exists = volunteers.find(v => v.name === selectedVolunteer.name);
      if (!exists) setSelectedVolunteer(volunteers[0]);
    }
    
    // Try to restore cached match results if available
    if (selectedVolunteer?.id) {
      const cached = sessionStorage.getItem(`match_${selectedVolunteer.id}`);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          // Only restore if data is recent (less than 10 minutes old)
          if (Date.now() - data.timestamp < 10 * 60 * 1000) {
            setMatchResults(data.results);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [volunteers, selectedVolunteer]);

  const openNeeds = needs.filter(n => n.status === "Open");
  const availableVolunteers = getAvailableVolunteers(volunteers);

  const handleSmartDraft = async () => {
    // Validation with clear error messages
    if (openNeeds.length === 0) {
      setError("No open needs available to assign");
      return;
    }
    if (availableVolunteers.length === 0) {
      setError("No available volunteers for assignment");
      return;
    }

    setIsDrafting(true);
    setError(null);
    try {
      const draft = await optimizeAssignments(openNeeds, availableVolunteers);
      setDraftAssignments(draft);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleApproveDraft = () => {
    if (!draftAssignments) return;
    
    const assignedVols = new Set(Object.values(draftAssignments));
    
    // Update needs status
    setNeeds(prev => prev.map(n => {
      const volunteerName = draftAssignments[n.id];
      if (volunteerName) {
        return { ...n, status: "Matched", assignedTo: volunteerName };
      }
      return n;
    }));

    // Update volunteers status
    if (setVolunteers) {
      setVolunteers(prev => prev.map(v => 
        assignedVols.has(v.name) ? { ...v, status: "On Mission" } : v
      ));
    }

    setDraftAssignments(null);
    setMatchResults([]);
  };

  const handleMatch = async () => {
    if (!selectedVolunteer || openNeeds.length === 0) return;
    setIsMatching(true);
    setError(null);
    try {
      const results = await matchVolunteerToNeeds(selectedVolunteer, openNeeds);
      results.sort((a, b) => b.matchScore - a.matchScore);
      setMatchResults(results);
      // Persist match results to localStorage for resilience
      sessionStorage.setItem(`match_${selectedVolunteer.id}`, JSON.stringify({
        timestamp: Date.now(),
        results,
        volunteerId: selectedVolunteer.id
      }));
    } catch (err: any) {
      setError("Failed to run matching engine. Check your connection.");
    } finally {
      setIsMatching(false);
    }
  };

  const combinedData = matchResults
    .map(match => ({ match, need: needs.find(n => n.id === match.needId) }))
    .filter(item => item.need !== undefined) as { match: MatchResult; need: Need }[];

  const handleAssign = (needId: string) => {
    if (!selectedVolunteer) return;
    
    // Update need status
    setNeeds(prev => prev.map(n => n.id === needId ? { ...n, status: "Matched", assignedTo: selectedVolunteer.name } : n));
    
    // Update volunteer status to 'On Mission'
    if (setVolunteers) {
      setVolunteers(prev => prev.map(v => v.name === selectedVolunteer.name ? { ...v, status: "On Mission" } : v));
    }
    
    setMatchResults(prev => prev.filter(m => m.needId !== needId));
    // Clear selection after assignment to keep it clean
    setSelectedVolunteer(null);
  };

  // stat: how many above 70%
  const strongMatches = combinedData.filter(d => d.match.matchScore >= 70).length;
  const crossZoneMatches = combinedData.filter(d => d.match.isCrossZone).length;

  const displayData = draftAssignments 
    ? openNeeds.map(n => ({ need: n, suggestion: draftAssignments[n.id] }))
    : combinedData;

  return (
    <div className="grid lg:grid-cols-12 gap-5 items-start">
      {/* ─── Left: Volunteer Selector ─── */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-display font-bold text-slate-900 flex items-center gap-1.5">
            <User className="w-4 h-4 text-teal-700" />
            Select Volunteer
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-[10px] font-bold text-teal-700 hover:text-teal-800 flex items-center gap-0.5 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-xl transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {/* Volunteer List — scrollable pills instead of a dropdown */}
        <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          {getAvailableVolunteers(Array.from(new Map(volunteers.map(v => [v.name, v])).values()))
            .map(v => {
              const isSelected = selectedVolunteer?.name === v.name;
              
              const timeText = formatTimeRemaining(v.availableUntil);

              return (
                <div
                  key={v.name}
                  onClick={() => { setSelectedVolunteer(v); setMatchResults([]); setError(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-2xl transition-all text-xs cursor-pointer ${
                    isSelected
                      ? "bg-teal-50 ring-1 ring-teal-200 text-teal-900"
                      : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="font-semibold text-sm mb-0.5 truncate flex items-center justify-between group/vol">
                    <span className="truncate">{v.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {v.availableUntil && (
                        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {timeText}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (setVolunteers) {
                            setVolunteers(prev => prev.filter(vol => vol.name !== v.name));
                          }
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/vol:opacity-100 transition-all rounded"
                        title="Remove volunteer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {v.organization && (
                    <div 
                      onClick={(e) => { e.stopPropagation(); setActiveOrganization(v.organization!); }}
                      className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-colors w-fit px-1.5 py-0.5 rounded mb-1 cursor-pointer"
                    >
                      <Shield className="w-2.5 h-2.5" />
                      {v.organization}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <MapPin className="w-2.5 h-2.5" />{v.location}
                      {v.travelRadius && <span className="bg-slate-100 px-1 rounded text-[9px]">{v.travelRadius}km</span>}
                    </div>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           setSelectedVolunteer(v);
                           setMatchResults([]);
                           setTimeout(() => handleMatch(), 50);
                         }}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-[10px] font-bold rounded-lg hover:bg-teal-700 transition-all shadow-md active:scale-95"
                         title="Find best matches for this volunteer"
                       >
                         <Zap className="w-3 h-3" />
                         Find Match
                       </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {v.skills.slice(0, 3).map(s => (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">{s}</span>
                    ))}
                  {v.skills.length > 3 && <span className="text-[9px] text-slate-500">+{v.skills.length - 3}</span>}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                    v.availability === "High" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    v.availability === "Medium" ? "bg-amber-50 text-amber-700 border-amber-100" :
                    "bg-slate-50 text-slate-500 border-slate-200"
                  }`}>{v.availability} Availability</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action */}
        <div className="p-3 border-t border-slate-100 shrink-0 space-y-3">

          {/* Global Draft Allocation */}
          <div className="bg-navy-50/50 p-3 rounded-xl border border-navy-100/50">
            <div className="text-[9px] font-mono font-semibold text-navy-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              Smart Assignment
            </div>
            <button
              onClick={handleSmartDraft}
              disabled={isDrafting || isMatching || openNeeds.length === 0 || availableVolunteers.length === 0}
              className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${BUTTON_STYLES.primary.bg} ${BUTTON_STYLES.primary.hover} ${BUTTON_STYLES.primary.text}`}
            >
               {isDrafting ? (
                 <><Loader2 className="w-4 h-4 animate-spin" /> Computing… </>
               ) : (
                 <><Wand2 className="w-4 h-4" /> Run Max Utilization Mode</>
               )}
            </button>
          </div>

          {openNeeds.length === 0 && (
            <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-[11px] text-emerald-800 font-medium">All needs are allocated. No open tasks.</p>
            </div>
          )}
          {error && <p className="text-[11px] text-center text-rose-500 font-medium mt-2">{error}</p>}
        </div>
      </div>

      {/* ─── Right: Match Results ─── */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[400px] overflow-hidden relative">

        {/* Sticky Draft Bar */}
        <AnimatePresence>
          {draftAssignments && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              className="absolute top-0 inset-x-0 z-20 bg-navy-900 text-white px-5 py-3.5 flex items-center justify-between shadow-2xl border-b border-white/10"
            >
              <div className="flex items-center gap-4">
                <div className="bg-teal-500/20 p-2 rounded-lg ring-1 ring-teal-500/30">
                  <Wand2 className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-semibold text-teal-400 uppercase tracking-widest leading-none mb-1">Assignment Preview</div>
                  <div className="flex items-center gap-4">
                    <div>
                       <div className="text-sm font-display font-semibold tracking-tight">{Object.keys(draftAssignments).length} / {openNeeds.length} needs assigned</div>
                       <div className="text-[9px] text-slate-300 mt-0.5">Using {new Set(Object.values(draftAssignments)).size} volunteers</div>
                       {Object.keys(draftAssignments).length > 0 && (
                         <div className="mt-2 p-1.5 bg-white/10 rounded text-[9px] max-w-[200px] cursor-pointer hover:bg-white/15 transition-colors"
                              onClick={() => setShowAllAssignments(!showAllAssignments)}>
                           <div className="font-semibold text-white mb-0.5 flex items-center gap-1">
                             Key Assignments:
                             <Info className="w-3 h-3" />
                           </div>
                           {Object.entries(draftAssignments).slice(0, 3).map(([needId, volunteerName]) => {
                             const need = openNeeds.find(n => n.id === needId);
                             return need ? (
                               <div key={needId} className="flex justify-between mt-0.5">
                                 <span className="truncate max-w-[100px] text-slate-200">{need.title}</span>
                                 <span className="font-bold text-teal-400 ml-1">→ {volunteerName}</span>
                               </div>
                             ) : null;
                           })}
                           {Object.entries(draftAssignments).length > 3 && (
                             <div className="text-center text-slate-300 font-medium mt-0.5">
                               +{Object.entries(draftAssignments).length - 3} more
                             </div>
                           )}
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDraftAssignments(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-all border border-white/10 flex items-center gap-2"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Discard
                </button>
                <button
                  onClick={handleApproveDraft}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-navy-900 text-xs font-semibold rounded-lg transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Deploy All
                </button>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
                 
                 {/* All Assignments Popup */}
                 {showAllAssignments && draftAssignments && (
                   <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAllAssignments(false)}>
                     <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}>
                       <div className="flex items-center justify-between mb-4">
                         <h3 className="text-lg font-display font-bold text-navy-900">All Assignments</h3>
                         <button onClick={() => setShowAllAssignments(false)}
                                 className="text-slate-400 hover:text-slate-600 transition-colors">
                           <XCircle className="w-5 h-5" />
                         </button>
                       </div>
                       <div className="space-y-3">
                         {Object.entries(draftAssignments).map(([needId, volunteerName]) => {
                           const need = openNeeds.find(n => n.id === needId);
                           const volunteer = volunteers.find(v => v.name === volunteerName);
                           return need ? (
                             <div key={needId} className="p-3 border border-slate-100 rounded-lg">
                               <div className="flex items-start gap-3">
                                 <div className="w-8 h-8 bg-navy-900 rounded-lg flex items-center justify-center flex-shrink-0">
                                   <Zap className="w-4 h-4 text-teal-400" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center justify-between mb-1">
                                     <h4 className="font-semibold text-navy-900 truncate">{need.title}</h4>
                                     <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ml-2 ${
                                       need.urgency === "High" ? "bg-rose-50 text-rose-700 border-rose-100" :
                                       need.urgency === "Medium" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                       "bg-emerald-50 text-emerald-700 border-emerald-100"
                                     }`}>
                                       {need.urgency}
                                     </span>
                                   </div>
                                   <div className="text-sm text-slate-600 mb-2">
                                     <MapPin className="w-3 h-3 inline-block mr-1" />
                                     {need.location}
                                   </div>
                                   <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-2">
                                       <User className="w-4 h-4 text-teal-600" />
                                       <span className="font-bold text-teal-700">{volunteerName}</span>
                                     </div>
                                     {volunteer?.organization && (
                                       <div className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                         <Shield className="w-3 h-3" />
                                         {volunteer.organization}
                                       </div>
                                     )}
                                   </div>
                                   {volunteer?.skills?.length > 0 && (
                                     <div className="mt-2 flex flex-wrap gap-1">
                                       {volunteer.skills.slice(0, 3).map(skill => (
                                         <span key={skill} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                           {skill}
                                         </span>
                                       ))}
                                     </div>
                                   )}
                                 </div>
                               </div>
                             </div>
                           ) : null;
                         })}
                       </div>
                       <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                         <div className="text-sm font-display font-semibold text-navy-900">
                           {Object.keys(draftAssignments).length} / {openNeeds.length} needs assigned
                         </div>
                         <div className="text-xs text-slate-500 mt-1">
                           Using {new Set(Object.values(draftAssignments)).size} volunteers
                         </div>
                       </div>
                     </div>
                   </div>
                 )}

        {/* Results Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-display font-semibold text-navy-900">
                {draftAssignments ? "Suggested Assignments" : (selectedVolunteer ? `${selectedVolunteer.name}` : "Results")}
              </h2>
              <p className="text-[10px] font-mono font-semibold text-navy-400 uppercase tracking-widest">
                {selectedVolunteer ? "Matching Analysis" : "Smart Matching"}
              </p>
            </div>
          </div>
        </div>

        {displayData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200">
              <Wand2 className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">No matches found yet</h3>
            <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">
              Select a volunteer and run the <strong>Smart Matcher</strong> or use the <strong>Global Draft</strong> to calculate optimal task allocation.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence>
              {displayData.map((item: any, index: number) => {
                const need = item.need;
                const match = item.match;
                const suggestion = item.suggestion;

                const score = match?.matchScore || 0;
                const scoreColor = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-slate-500";

                return (
                  <motion.div
                    key={need.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex items-stretch border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group h-32"
                  >
                    {/* Score Module */}
                    <div className={`w-20 shrink-0 flex flex-col items-center justify-center border-r border-slate-100 p-2 ${
                      score >= 80 ? "bg-emerald-50/20" : score >= 50 ? "bg-amber-50/20" : "bg-slate-50/20"
                    }`}>
                      <div className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest mb-1">Score</div>
                      <div className={`text-2xl font-mono font-bold ${
                        score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-navy-900"
                      }`}>
                        {score}
                      </div>
                      {suggestion && (
                        <div className="mt-2 w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center shadow-lg ring-2 ring-white">
                          <Zap className="w-4 h-4 text-teal-400" />
                        </div>
                      )}
                    </div>

                    {/* Content Module */}
                    <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-navy-50 text-navy-600 border border-navy-100">
                          {need.category}
                        </span>
                        {match?.isCrossZone && (
                          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">
                            ↗ CROSS-ZONE
                          </span>
                        )}
                        <span className={`ml-auto text-[9px] font-mono font-semibold px-2 py-0.5 rounded border ${
                          need.urgency === "High" ? "bg-rose-50 text-rose-700 border-rose-100" :
                          need.urgency === "Medium" ? "bg-amber-50 text-amber-700 border-amber-100" :
                          "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}>
                          {need.urgency}
                        </span>
                      </div>

                      <h3 className="text-sm font-display font-semibold text-navy-900 mb-1 truncate">{need.title}</h3>
                       <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                         <span className="text-navy-900 font-semibold">Assignment: </span>
                         {suggestion ? (
                           <>
                             <span className="font-bold text-teal-700">{suggestion}</span> assigned via global optimization
                             {volunteers.find(v => v.name === suggestion)?.skills?.length > 0 && (
                               <span className="block text-[10px] text-slate-400 mt-0.5">
                                 Skills: {volunteers.find(v => v.name === suggestion)?.skills?.join(', ')}
                               </span>
                             )}
                           </>
                         ) : match?.reasoning}
                       </p>
                       {suggestion && volunteers.find(v => v.name === suggestion)?.organization && (
                         <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5">
                           <Shield className="w-2.5 h-2.5" />
                           <span className="truncate max-w-[150px]">
                             {volunteers.find(v => v.name === suggestion)?.organization}
                           </span>
                         </div>
                       )}

                      <div className="flex items-center gap-3 text-[10px] font-mono font-medium text-slate-400">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {need.location}
                        </div>
                        <div className="flex items-center gap-1 uppercase tracking-wider">
                          <Target className="w-3 h-3" /> {need.requiredSkills.join(" • ")}
                        </div>
                      </div>
                    </div>

                    {/* Deployment Module */}
                    {!draftAssignments && (
                      <button
                        onClick={() => handleAssign(need.id)}
                        className="w-20 shrink-0 flex flex-col items-center justify-center border-l border-slate-100 hover:bg-navy-900 hover:text-white transition-all group/btn"
                      >
                        <ArrowRight className="w-6 h-6 mb-1 transition-transform group-hover/btn:translate-x-1" />
                        <span className="text-[9px] font-mono font-semibold uppercase tracking-widest">Deploy</span>
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add Volunteer Modal */}
      {showAddModal && (
        <AddVolunteerModal
          onClose={() => setShowAddModal(false)}
          onAdd={(vol) => {
            if (setVolunteers) {
              setVolunteers(prev => [vol, ...prev]);
            }
            setSelectedVolunteer(vol);
            setMatchResults([]);
            setShowAddModal(false);
          }}
        />
      )}

      {/* Organization Profile Modal */}
      <AnimatePresence>
        {activeOrganization && (
          <OrganizationProfileModal
            organizationName={activeOrganization}
            volunteers={volunteers}
            onClose={() => setActiveOrganization(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
