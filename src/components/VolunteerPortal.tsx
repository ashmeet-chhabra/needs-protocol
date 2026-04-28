import React, { useEffect, useMemo, useRef, useState } from "react";
import { Need, VolunteerProfile } from "../types";
import { MapPin, Briefcase, CheckCircle2, CircleDashed, CheckSquare, ListTodo, User, Shield, Loader2, Clock, BadgeCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatTimeRemaining } from "../utils/volunteers";

interface VolunteerPortalProps {
  needs: Need[];
  setNeeds: React.Dispatch<React.SetStateAction<Need[]>>;
  volunteers: VolunteerProfile[];
  setVolunteers?: React.Dispatch<React.SetStateAction<VolunteerProfile[]>>;
  authUser?: any;
}

export default function VolunteerPortal({ needs, setNeeds, volunteers, setVolunteers, authUser }: VolunteerPortalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [customHours, setCustomHours] = useState("6");
  const [selectedHours, setSelectedHours] = useState<number | null>(null);
  const resetStatusTimeoutRef = useRef<number | null>(null);
  const isDemo = authUser?.isDemo;
  
  // Real check: Is this user in our verified NGO database?
  const verifiedProfile = useMemo(() => (
    authUser?.displayName
      ? volunteers.find(v => v.name.toLowerCase() === authUser.displayName.toLowerCase()) || null
      : null
  ), [authUser, volunteers]);

  const preferredDemoProfile = useMemo(() => {
    if (!isDemo) return null;
    return verifiedProfile
      || volunteers.find(v => v.name.toLowerCase() === "aarav sharma")
      || volunteers[0]
      || null;
  }, [isDemo, verifiedProfile, volunteers]);

  const [currentUser, setCurrentUser] = useState<VolunteerProfile | null>(
    verifiedProfile || preferredDemoProfile || volunteers[0] || null
  );

  useEffect(() => {
    const preferredUser = verifiedProfile || preferredDemoProfile || currentUser;
    if (!preferredUser && volunteers[0]) {
      setCurrentUser(volunteers[0]);
      return;
    }
    if (preferredUser && currentUser?.id !== preferredUser.id) {
      setCurrentUser(preferredUser);
      return;
    }
    if (currentUser) {
      const freshMatch = volunteers.find(v => v.id === currentUser.id || v.name === currentUser.name);
      if (freshMatch && freshMatch !== currentUser) {
        setCurrentUser(freshMatch);
      }
    }
  }, [currentUser, preferredDemoProfile, verifiedProfile, volunteers]);

  useEffect(() => {
    return () => {
      if (resetStatusTimeoutRef.current) window.clearTimeout(resetStatusTimeoutRef.current);
    };
  }, []);

  const [loginName, setLoginName] = useState("");
  const [loginAttempted, setLoginAttempted] = useState(false);

  const handleLogin = () => {
    if (!loginName.trim()) return;
    setLoginAttempted(true);
    const match = volunteers.find(v => v.name.toLowerCase() === loginName.trim().toLowerCase());
    if (match) setCurrentUser(match);
  };

  if (!currentUser) {
    const notFound = loginAttempted && loginName.trim().length > 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
          <User className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Volunteer Identity Check</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
          Enter the name registered with your NGO to access your mission portal.
        </p>
        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="text"
            value={loginName}
            onChange={e => { setLoginName(e.target.value); setLoginAttempted(false); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Your registered name…"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-900"
            autoFocus
          />
          <button
            onClick={handleLogin}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Access Portal
          </button>
        </div>
        {notFound && (
          <div className="mt-5 max-w-xs bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-sm font-semibold text-amber-800">Verification Pending</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              <strong>"{loginName}"</strong> is not in any NGO's verified database. Contact your local coordinator to be added before you can access the portal.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!verifiedProfile && !isDemo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100">
          <Shield className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Account Verification Pending</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-8">
          Welcome, <strong>{authUser?.displayName || "Volunteer"}</strong>! To protect community safety, your profile must be registered by a participating NGO before you can access the Protocol.
        </p>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left w-full max-w-sm">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">How to verify:</h3>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> Contact your local NGO coordinator.</li>
            <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> Provide your full name: <code className="font-bold text-slate-900">{authUser?.displayName}</code></li>
            <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> Once they add you to the database, your dashboard will activate.</li>
          </ul>
        </div>
      </div>
    );
  }

  // --- Helpers (only reach here if currentUser is confirmed) ---
  const myMissions = needs.filter(n => n.assignedTo === currentUser.name);
  const activeMissions = myMissions.filter(n => n.status === "Matched" || n.status === "In Progress");
  const completedMissions = myMissions.filter(n => n.status === "Completed" || n.status === "Fulfilled");
  const openMissions = needs.filter(n => n.status === "Open");

  const updateStatus = (id: string, newStatus: Need["status"]) => {
    setNeeds(prev => prev.map(n => n.id === id ? { ...n, status: newStatus } : n));
  };

  const claimMission = (id: string) => {
    setNeeds(prev => prev.map(n => n.id === id ? { ...n, status: "Matched", assignedTo: currentUser.name } : n));
  };

  const handleSetAvailable = (hours: number) => {
    if (!currentUser || !setVolunteers) return;
    setIsUpdating(true);
    setSelectedHours(hours);
    const expiry = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setVolunteers(prev => prev.map(v =>
      v.name === currentUser.name ? { ...v, status: "Available", availableUntil: expiry } : v
    ));
    setCurrentUser(prev => prev ? { ...prev, status: "Available", availableUntil: expiry } : null);
    if (resetStatusTimeoutRef.current) window.clearTimeout(resetStatusTimeoutRef.current);
    resetStatusTimeoutRef.current = window.setTimeout(() => setIsUpdating(false), 800);
  };

  const handleCustomAvailability = () => {
    const parsed = Number(customHours);
    if (!Number.isFinite(parsed)) return;

    const normalizedHours = Math.max(1, Math.min(168, Math.round(parsed)));
    setCustomHours(String(normalizedHours));
    handleSetAvailable(normalizedHours);
  };

  return (
    <div className="space-y-6">
      {/* Identity Bar - Mission Control Style */}
      <div className="bg-navy-900 rounded-xl p-4 shadow-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="dot-pattern dot-pattern-24 absolute inset-0"></div>
        <div className="flex items-center gap-4 relative z-10 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <User className="w-6 h-6 text-teal-400" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-display font-semibold text-white truncate flex items-center gap-2 leading-none">
              {currentUser.name}
              {verifiedProfile && <Shield className="w-4 h-4 text-teal-400" />}
            </div>
            <div className="text-[10px] font-mono font-medium text-teal-400/80 flex items-center gap-2 mt-1.5 uppercase tracking-widest flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{currentUser.location}</span>
              {currentUser.organization && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/30"></span>
                  <span className="flex items-center gap-1 text-white/80">
                    <BadgeCheck className="w-3 h-3 text-teal-400" />
                    {currentUser.organization}
                  </span>
                </>
              )}
              <span className="w-1 h-1 rounded-full bg-white/30"></span>
              <span className={currentUser.status === "Available" ? "text-emerald-400" : "text-amber-400"}>
                {currentUser.status?.toUpperCase() || "INACTIVE"}
              </span>
            </div>
            {(isDemo || currentUser.availableUntil) && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {isDemo && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-teal-400/30 bg-teal-400/10 px-2 py-1 text-[9px] font-mono font-semibold uppercase tracking-widest text-teal-300">
                    Demo Access
                  </span>
                )}
                {currentUser.availableUntil && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-mono font-semibold uppercase tracking-widest text-white/70">
                    <Clock className="w-3 h-3 text-teal-300" />
                    {formatTimeRemaining(currentUser.availableUntil)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Availability Controls */}
        <div className="flex flex-col gap-2 bg-white/5 p-1.5 rounded-lg border border-white/10 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-semibold text-white/40 uppercase px-2 tracking-widest">Update Status:</span>
            {[4, 12, 24].map(hrs => (
              <button
                key={hrs}
                disabled={isUpdating}
                onClick={() => handleSetAvailable(hrs)}
                className={`px-4 py-2 text-[10px] font-mono font-semibold border rounded-md transition-all duration-200 active:scale-95 disabled:opacity-50 uppercase tracking-tighter ${
                  selectedHours === hrs
                    ? "bg-teal-400 text-navy-900 border-teal-300 shadow-[0_0_0_1px_rgba(153,246,228,0.45),0_10px_24px_rgba(20,184,166,0.18)] -translate-y-0.5"
                    : "bg-white/10 hover:bg-white/18 hover:border-white/35 hover:-translate-y-0.5 hover:shadow-lg text-white border-white/20"
                }`}
              >
                {hrs}H
              </button>
            ))}
            {isUpdating && <Loader2 className="w-4 h-4 text-teal-400 animate-spin ml-2" />}
          </div>
          <div className="flex items-center gap-2 px-2">
            <input
              type="number"
              min="1"
              max="168"
              step="1"
              value={customHours}
              onChange={(e) => setCustomHours(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCustomAvailability();
                }
              }}
              disabled={isUpdating}
              className="w-20 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-mono font-semibold text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
              placeholder="Hours"
              aria-label="Custom availability in hours"
            />
            <button
              onClick={handleCustomAvailability}
              disabled={isUpdating || !customHours.trim()}
              className={`px-3 py-2 rounded-md border text-[10px] font-mono font-semibold uppercase tracking-widest transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                selectedHours !== null && ![4, 12, 24].includes(selectedHours)
                  ? "border-teal-300 bg-teal-400 text-navy-900 shadow-[0_0_0_1px_rgba(153,246,228,0.45),0_10px_24px_rgba(20,184,166,0.18)] -translate-y-0.5"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/18 hover:border-white/35 hover:-translate-y-0.5 hover:shadow-lg"
              }`}
            >
              Set Custom
            </button>
            <span className="text-[9px] font-mono font-medium uppercase tracking-widest text-white/35">
              1-168h
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* My Missions - Protocol List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-display font-semibold text-navy-900 uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-navy-900" />
              Active Ops
            </h2>
            <span className="text-[10px] font-mono font-semibold bg-navy-900 text-white px-2 py-0.5 rounded shadow-sm">
              {activeMissions.length}
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto min-h-[300px]">
            {activeMissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center mb-4">
                  <CheckSquare className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-500">No Active Missions</p>
                <p className="mt-2 text-xs text-slate-400 max-w-[220px]">
                  Claim an open protocol to start building your mission queue.
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {activeMissions.map(mission => (
                  <motion.div
                    key={mission.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="bg-white border border-slate-200 rounded-lg p-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                      mission.status === "In Progress" ? "bg-amber-500" : "bg-navy-900"
                    }`} />

                    <div className="flex justify-between items-start mb-2 pl-2">
                      <h3 className="text-sm font-display font-semibold text-navy-900 pr-2 truncate">{mission.title}</h3>
                      <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded border ${
                        mission.urgency === "High" ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-slate-50 text-slate-500 border-slate-100"
                      }`}>{mission.urgency.toUpperCase()}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-4 pl-2 line-clamp-2 leading-relaxed">{mission.description}</p>

                    <div className="flex items-center justify-between pl-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(currentUser.location)}&destination=${encodeURIComponent(mission.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono font-semibold text-navy-900 hover:text-teal-600 flex items-center gap-1 uppercase tracking-tighter transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Navigate
                      </a>

                      <div className="flex gap-2">
                        {mission.status === "Matched" && (
                          <button
                            onClick={() => updateStatus(mission.id, "In Progress")}
                            className="text-[9px] font-mono font-semibold px-3 py-1.5 bg-navy-900 text-white rounded hover:bg-navy-800 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1.5 uppercase shadow-lg hover:shadow-xl active:scale-95"
                          >
                            <CircleDashed className="w-3 h-3" /> Initiate
                          </button>
                        )}
                        {mission.status === "In Progress" && (
                          <button
                            onClick={() => updateStatus(mission.id, "Completed")}
                            className="text-[9px] font-mono font-semibold px-3 py-1.5 bg-teal-500 text-navy-900 rounded hover:bg-teal-400 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1.5 uppercase shadow-lg hover:shadow-xl active:scale-95"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Open Missions Board - Grid Style */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-display font-semibold text-navy-900 uppercase tracking-widest flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-navy-900" />
              Global Registry
            </h2>
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">{openMissions.length} Available protocols</span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[400px]">
            {openMissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center mb-4">
                  <ListTodo className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-500">No Protocols Outstanding</p>
                <p className="mt-2 text-xs text-slate-400 max-w-[240px]">
                  The network is currently covered. New community needs will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {openMissions.map(mission => {
                  const matchCount = mission.requiredSkills.filter(s => currentUser.skills.includes(s)).length;
                  const isGoodFit = matchCount >= Math.ceil(mission.requiredSkills.length * 0.5);

                  return (
                    <div
                      key={mission.id}
                      className={`p-4 transition-colors flex gap-4 items-center group ${
                        isGoodFit ? "bg-teal-50/40 hover:bg-teal-50/70" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-sm font-display font-semibold text-navy-900 truncate">{mission.title}</h3>
                          <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded border ${
                            mission.urgency === "High" ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-slate-50 text-slate-500 border-slate-100"
                          }`}>{mission.urgency.toUpperCase()}</span>
                          {isGoodFit && (
                            <span className="text-[8px] font-mono font-semibold bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">Optimal Fit</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-3 text-[10px] font-mono font-medium text-slate-400">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate uppercase tracking-tight">{mission.location}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {mission.requiredSkills.map(s => {
                            const have = currentUser.skills.includes(s);
                            return (
                              <span key={s} className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold uppercase tracking-tighter border ${
                                have ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-white text-slate-400 border-slate-200'
                              }`}>{s}</span>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => claimMission(mission.id)}
                        className={`shrink-0 h-12 px-6 rounded-lg text-xs font-mono font-semibold uppercase tracking-widest transition-all duration-200 active:scale-95 flex items-center justify-center border ${
                          isGoodFit
                            ? "bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100 hover:border-teal-300 hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 hover:text-navy-900 hover:-translate-y-0.5 shadow-sm hover:shadow-lg"
                        }`}
                      >
                        Claim Protocol
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
