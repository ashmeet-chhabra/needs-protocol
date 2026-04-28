import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Need, VolunteerProfile } from "./types";
import ErrorBoundary from "./components/ErrorBoundary";
import NgoDashboard from "./components/NgoDashboard";
import VolunteerDashboard from "./components/VolunteerDashboard";
import VolunteerPortal from "./components/VolunteerPortal";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import NeedsHeatmap from "./components/NeedsHeatmap";
import { DEMO_NEEDS, DEMO_VOLUNTEERS } from "./data/demo";
import {
  saveNeedsBatch, saveVolunteersBatch, updateNeedInDb, updateVolunteerInDb,
  deleteNeedFromDb, deleteVolunteerFromDb,
  subscribeToNeeds, subscribeToVolunteers, hasFirebaseConfig,
  auth, provider
} from "./services/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  Network, HelpCircle, X, Shield, User, AlertCircle,
  BarChart3, Database, Layers, ArrowRight,
  MapPin, Users, Activity, Zap, ChevronRight, LogOut, LogIn, FlaskConical
} from "lucide-react";

function ensureVolunteerId(volunteer: VolunteerProfile): VolunteerProfile {
  if (volunteer.id) return volunteer;

  const safeName = volunteer.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : Date.now().toString(36);

  return {
    ...volunteer,
    id: `vol-${safeName || "volunteer"}-${suffix}`,
  };
}

export default function App() {
  const [authUser, setAuthUser] = useState<FirebaseUser | { displayName: string, isDemo: boolean, photoURL: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<"organization" | "volunteer">("organization");
  const [activeTab, setActiveTab] = useState<"ingest" | "match" | "heatmap" | "analytics">("ingest");
  const [showHelp, setShowHelp] = useState(false);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>(DEMO_VOLUNTEERS);

  // --- Firebase Race Condition Prevention ---
  // Track IDs of recently written items to avoid re-syncing from Firebase immediately after local write
  const recentlyWrittenNeeds = useRef<Set<string>>(new Set());
  const recentlyWrittenVols = useRef<Set<string>>(new Set());
  const needsSyncTimeoutRef = useRef<number | null>(null);
  const volsSyncTimeoutRef = useRef<number | null>(null);
  const seedTimeoutRef = useRef<number | null>(null);

  // --- Firebase Auth & Realtime Sync ---
  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      setAuthLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });

    const unsubNeeds = subscribeToNeeds((firebaseNeeds) => {
      // Merge Firebase data with any local-only needs (unsaved items)
      setNeeds(prev => {
        // Deduplicate: Firebase data takes priority, but keep unsaved local needs
        const firebaseIds = new Set(firebaseNeeds.map(n => n.id));
        const localOnlyNeeds = prev.filter(n => !firebaseIds.has(n.id));
        return [...firebaseNeeds, ...localOnlyNeeds];
      });
    });
    const unsubVols = subscribeToVolunteers((firebaseVols) => {
      // Always merge Firebase data with local-only volunteers
      setVolunteers(prev => {
        // Keep local volunteers that aren't in Firebase yet, merge with Firebase data
        const firebaseIds = new Set(firebaseVols.map(v => v.id));
        const localOnlyVols = prev.filter(v => !firebaseIds.has(v.id));
        // Merge: Firebase data (authoritative) + local-only volunteers
        return [...firebaseVols.map(ensureVolunteerId), ...localOnlyVols];
      });
    });
    return () => {
      unsubAuth();
      unsubNeeds?.();
      unsubVols?.();
      if (needsSyncTimeoutRef.current) window.clearTimeout(needsSyncTimeoutRef.current);
      if (volsSyncTimeoutRef.current) window.clearTimeout(volsSyncTimeoutRef.current);
    };
  }, []);

  const handleSignIn = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  const handleDemoLogin = () => {
    setAuthUser({
      displayName: "Aarav Sharma",
      isDemo: true,
      photoURL: ""
    });
  };

  const handleSignOut = async () => {
    setAuthUser(null);
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };


  // Wrap setNeeds / setVolunteers to persist to Firebase
  const handleSetNeeds: typeof setNeeds = (action) => {
    setNeeds((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      if (hasFirebaseConfig) {
        const prevIds = new Set(prev.map(n => n.id));
        const nextIds = new Set(next.map(n => n.id));
        
        const newNeeds = next.filter(n => !prevIds.has(n.id));
        const deletedNeeds = prev.filter(n => !nextIds.has(n.id));

        if (newNeeds.length > 0) {
          saveNeedsBatch(newNeeds);
          newNeeds.forEach(n => recentlyWrittenNeeds.current.add(n.id));
        }
        
        deletedNeeds.forEach(n => {
          deleteNeedFromDb(n.id);
          recentlyWrittenNeeds.current.add(n.id);
        });

        next.forEach(n => {
          const old = prev.find(p => p.id === n.id);
          if (old && old.status !== n.status) {
            updateNeedInDb(n.id, { status: n.status, assignedTo: n.assignedTo });
            recentlyWrittenNeeds.current.add(n.id);
            
            // If task is completed, free up the volunteer
            if ((n.status === "Completed" || n.status === "Fulfilled") && n.assignedTo) {
              setVolunteers(vPrev => vPrev.map(v => 
                v.name === n.assignedTo ? { ...v, status: "Available" } : v
              ));
            }
          }
        });
      }
      return next;
    });
  };

  const handleSetVolunteers: typeof setVolunteers = (action) => {
    setVolunteers((prev) => {
      const normalizedPrev = prev.map(ensureVolunteerId);
      const rawNext = typeof action === "function" ? action(normalizedPrev) : action;
      const next = rawNext.map(ensureVolunteerId);
      
      // Deduplicate using both ID and name+location for resilience
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();
      const deduped: VolunteerProfile[] = [];
      
      // Process prev first (preserve existing data), then next (new data)
      // When there's a conflict, prev wins (existing data is more stable)
      for (const vol of [...normalizedPrev, ...next]) {
        // Skip if we've already seen this exact ID
        if (vol.id && seenIds.has(vol.id)) {
          continue;
        }
        
        // Create a dedup key from name and location
        const dedupeKey = `${vol.name.toLowerCase().trim()}|${(vol.location || '').toLowerCase().trim()}`;
        if (seenNames.has(dedupeKey)) {
          continue;
        }
        
        // This volunteer is unique - add it
        if (vol.id) seenIds.add(vol.id);
        seenNames.add(dedupeKey);
        deduped.push(vol);
      }
      
      if (hasFirebaseConfig) {
        const prevIds = new Set(normalizedPrev.map(v => v.id));
        const dedupIds = new Set(deduped.map(v => v.id));

        const newVols = deduped.filter(v => !prevIds.has(v.id));
        const deletedVols = normalizedPrev.filter(v => !dedupIds.has(v.id));

        if (newVols.length > 0) {
          saveVolunteersBatch(newVols);
          newVols.forEach(v => {
            if (v.id) recentlyWrittenVols.current.add(v.id);
          });
        }
        
        deletedVols.forEach(v => {
          if (v.id) {
            deleteVolunteerFromDb(v.id);
            recentlyWrittenVols.current.add(v.id);
          }
        });

        // Handle updates (status, availableUntil, etc)
        deduped.forEach(v => {
          const old = normalizedPrev.find(p => p.id === v.id);
          if (old && (old.status !== v.status || old.availableUntil !== v.availableUntil)) {
            if (v.id) {
              updateVolunteerInDb(v.id, { status: v.status, availableUntil: v.availableUntil });
              recentlyWrittenVols.current.add(v.id);
            }
          }
        });
      }
      return deduped;
    });
  };

  // --- Demo State Seeder ---
  const [isSeeding, setIsSeeding] = useState(false);
  const handleLoadDemoState = async () => {
    setIsSeeding(true);
    const demoNeeds = DEMO_NEEDS;
    const demoVols = DEMO_VOLUNTEERS.map(ensureVolunteerId);
    const demoNeedIds = new Set(demoNeeds.map(n => n.id));
    const demoVolIds = new Set(demoVols.map(v => v.id));
    
    try {
      if (hasFirebaseConfig) {
        // STEP 1: Delete all non-demo items from Firebase
        // Get current state at this moment
        const currentNeeds = [...needs];
        const currentVols = [...volunteers];
        
        const deleteNeedsPromises = currentNeeds
          .filter(n => !demoNeedIds.has(n.id))
          .map(n => deleteNeedFromDb(n.id));
          
        const deleteVolsPromises = currentVols
          .filter(v => !demoVolIds.has(v.id))
          .map(v => v.id ? deleteVolunteerFromDb(v.id) : Promise.resolve());
        
        // Wait for all deletions to complete
        await Promise.all([...deleteNeedsPromises, ...deleteVolsPromises]);
        
        // Brief pause to ensure Firebase has processed deletions
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      
      // STEP 2: Now set exactly the demo state
      // Mark them as recently written so Firebase sync doesn't override
      demoNeeds.forEach(n => recentlyWrittenNeeds.current.add(n.id));
      demoVols.forEach(v => {
        if (v.id) recentlyWrittenVols.current.add(v.id);
      });
      
      // Set the state directly to demo data
      setNeeds(demoNeeds);
      setVolunteers(demoVols);
      
    } catch (err) {
      console.error("Failed to load demo state:", err);
    } finally {
      if (seedTimeoutRef.current) window.clearTimeout(seedTimeoutRef.current);
      seedTimeoutRef.current = window.setTimeout(() => {
        setIsSeeding(false);
        // Clear the recently written flags after a delay
        recentlyWrittenNeeds.current.clear();
        recentlyWrittenVols.current.clear();
      }, 1500);
    }
  };

  useEffect(() => {
    return () => {
      if (seedTimeoutRef.current) window.clearTimeout(seedTimeoutRef.current);
    };
  }, []);

  // Derived stats
  const openNeeds = needs.filter(n => n.status === "Open").length;
  const criticalNeeds = needs.filter(n => n.status === "Open" && n.urgency === "High").length;
  const resolvedNeeds = needs.filter(n => n.status === "Fulfilled" || n.status === "Completed").length;
  const inPipeline = needs.filter(n => n.status === "Matched" || n.status === "In Progress").length;
  const totalVolunteers = volunteers.length;

  // Location deficit analysis
  const locationCounts = needs.filter(n => n.status === "Open").reduce((acc, need) => {
    acc[need.location] = (acc[need.location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const hotspots = Object.entries(locationCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3)
    .map(e => e[0]);

  const hasData = needs.length > 0;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F7F8FA] font-sans text-slate-800 flex flex-col">

      {/* ═══ Navigation ═══ */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50" role="navigation" aria-label="Main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">

            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-600 to-navy-900 rounded-lg flex items-center justify-center shadow-md">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-display font-black tracking-tight text-navy-900 leading-none block">Needs Protocol</span>
                <span className="text-[9px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Command Center</span>
              </div>
            </div>

            {/* Role Switcher & Auth */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                hasFirebaseConfig
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}>
                <Database className="w-2.5 h-2.5" />
                {hasFirebaseConfig ? "Synced" : "Local"}
              </div>

              {authUser ? (
                <>
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl h-10 border border-slate-200 shadow-inner">
                    <button
                      onClick={() => setCurrentRole("organization")}
                      className={`flex items-center gap-2 px-3 h-full rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                        currentRole === "organization"
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 hidden sm:block" />
                      <span>Coordinator</span>
                    </button>
                    <button
                      onClick={() => setCurrentRole("volunteer")}
                      className={`flex items-center gap-2 px-3 h-full rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                        currentRole === "volunteer"
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <User className="w-3.5 h-3.5 hidden sm:block" />
                      <span>Volunteer</span>
                    </button>
                  </div>
                  
                  <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                    <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      {authUser.photoURL ? (
                        <img src={authUser.photoURL} alt={authUser.displayName || "User"} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-slate-400 m-1.5" />
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold rounded-2xl transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </button>
              )}
              <button
                onClick={() => setShowHelp(true)}
                aria-label="Help"
                className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-2xl transition-colors"
              >
                <HelpCircle className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ Main Content ═══ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex-1 w-full">
        {authLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
          </div>
        ) : !authUser && hasFirebaseConfig ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-navy-900 rounded-2xl flex items-center justify-center shadow-md mb-4">
                <Network className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-black tracking-tight text-slate-900 mb-1">Welcome to Needs Protocol</h1>
                <p className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-[0.24em]">Command Center</p>
              </div>
            </div>
            <p className="text-slate-500 max-w-md mb-8 text-sm leading-relaxed">
              Sign in to coordinate resource allocation and view your assignments. Real-time updates require authentication.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-12">
              <button
                onClick={handleSignIn}
                className="flex items-center justify-center gap-2.5 px-6 py-3 w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                Continue with Google
              </button>
              <button
                onClick={handleDemoLogin}
                className="flex items-center justify-center gap-2.5 px-6 py-3 w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all active:scale-95"
              >
                Try Demo Mode
              </button>
            </div>

            {/* Value Proposition Grid */}
            <div className="max-w-4xl w-full border-t border-slate-100 pt-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-teal-600" />
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">The Intelligent Protocol</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-8">
                Allocating resources where they matter most.
              </h2>
              <div className="grid sm:grid-cols-3 gap-6 text-left">
                {[
                  { icon: Layers, title: "Aggregate", desc: "Paste raw field reports or scan documents. Gemini AI extracts structured needs automatically." },
                  { icon: Zap, title: "Match", desc: "Our smart engine scores volunteers against needs based on skill, urgency, and travel radius." },
                  { icon: Activity, title: "Predict", desc: "Analyze historical trends to forecast resource deficits before they become critical." },
                ].map(step => (
                  <div key={step.title} className="flex flex-col gap-3 p-5 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 mb-1">{step.title}</div>
                      <div className="text-xs text-slate-500 leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ═══ COORDINATOR VIEW ═══ */}
        {currentRole === "organization" && (
          <>
            {/* Header — concise, purposeful */}
            <div className="mb-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
                <div>
                  <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-slate-900 mb-0.5">
                    Resource Dashboard
                  </h1>
                  <p className="text-xs font-medium text-slate-500 max-w-xl">
                    Aggregate community data → Identify urgent needs → Match the right volunteers → Track allocation efficiency
                  </p>
                </div>
                <button
                  onClick={handleLoadDemoState}
                  disabled={isSeeding}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <FlaskConical className="w-4 h-4 text-teal-600" />
                  {isSeeding ? "Loading Engine..." : "Initialize Demo State"}
                </button>
              </div>

              {/* KPI Strip — density over decoration */}
              {hasData && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 py-3 px-4 bg-white rounded-xl border border-slate-200 shadow-sm mb-5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${criticalNeeds > 0 ? "bg-red-500 animate-pulse" : "bg-slate-300"}`} />
                    <span className="text-xs text-slate-500">Open</span>
                    <span className="text-sm font-bold text-slate-900">{openNeeds}</span>
                    {criticalNeeds > 0 && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                        {criticalNeeds} critical
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs text-slate-500">In Pipeline</span>
                    <span className="text-sm font-bold text-slate-900">{inPipeline}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-500">Resolved</span>
                    <span className="text-sm font-bold text-emerald-700">{resolvedNeeds}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 ml-auto border-l border-slate-100 pl-4">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs text-slate-500">Volunteers</span>
                    <span className="text-sm font-bold text-slate-900">{totalVolunteers}</span>
                  </div>
                  {hotspots.length > 0 && (
                    <div className="hidden lg:flex items-center gap-2 border-l border-slate-100 pl-4">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-xs text-slate-500">Hotspots</span>
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{hotspots.join(", ")}</span>
                    </div>
                  )}
                </div>
              )}

            {/* Workflow Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto scrollbar-none mb-6">
              {([
                { key: "ingest" as const, icon: Layers, label: "Ingest", sub: "Data Extraction" },
                { key: "match" as const, icon: Zap, label: "Match", sub: "AI Allocation" },
                { key: "heatmap" as const, icon: MapPin, label: "Heatmap", sub: "Zone Density" },
                { key: "analytics" as const, icon: BarChart3, label: "Insights", sub: "Trends" },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? "bg-navy-900 text-white shadow-md ring-1 ring-navy-900"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  <span className={`hidden lg:inline text-[10px] font-medium opacity-60 ml-1 ${activeTab === tab.key ? 'text-navy-100' : ''}`}>· {tab.sub}</span>
                </button>
              ))}
            </div>
          </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "ingest" && (
                  <NgoDashboard needs={needs} setNeeds={handleSetNeeds} setVolunteers={handleSetVolunteers} />
                )}
                {activeTab === "match" && (
                  <VolunteerDashboard needs={needs} setNeeds={handleSetNeeds} volunteers={volunteers} setVolunteers={handleSetVolunteers} />
                )}
                {activeTab === "heatmap" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Resource Allocation Heatmap</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Zone-level view of need density, urgency, and volunteer coverage gaps</p>
                      </div>
                    </div>
                    <NeedsHeatmap needs={needs} volunteers={volunteers} />
                  </div>
                )}
                {activeTab === "analytics" && (
                  <AnalyticsDashboard needs={needs} setNeeds={handleSetNeeds} volunteers={volunteers} />
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {/* ═══ VOLUNTEER VIEW ═══ */}
        {currentRole === "volunteer" && (
          <>
            <div className="mb-5">
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-slate-900 mb-0.5">
                Your Missions
              </h1>
              <p className="text-xs font-medium text-slate-500">
                View assignments, claim open tasks, and update your field status.
              </p>
              <VolunteerPortal needs={needs} setNeeds={handleSetNeeds} volunteers={volunteers} setVolunteers={handleSetVolunteers} authUser={authUser} />
            </div>
          </>
        )}
        </>
        )}
      </main>

      {/* ═══ Help Drawer ═══ */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-label="Guide">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/40 backdrop-blur-sm"
              onClick={() => setShowHelp(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="relative w-full sm:max-w-sm bg-white h-full shadow-2xl flex flex-col select-text"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h2 className="text-base font-bold text-slate-900">How It Works</h2>
                <button onClick={() => setShowHelp(false)} aria-label="Close" className="p-2 text-slate-500 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/30">
                <div className="space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    <strong className="text-slate-900 text-base">Needs Protocol</strong>
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    A unified platform for NGOs and volunteers to coordinate resource allocation. We solve for <em>improper allocation</em> — surplus resources in one zone cover deficits in another.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick Start</h3>
                  <div className="space-y-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-900">1. Load or enter data</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        Start in <strong>Ingest</strong>. Paste field notes, use demo text, or upload an image of a survey/report.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-900">2. Let AI structure it</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        The system extracts needs, urgency, location, and volunteer details into usable records.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-900">3. Match and deploy</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        Use <strong>Match</strong> to score volunteers against needs, or run the global draft for a smarter many-to-many allocation.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-900">4. Monitor coverage</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        Check the <strong>Heatmap</strong> and <strong>Analytics</strong> tabs to see underserved zones, skill gaps, and demand trends.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capabilities</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span><strong className="text-slate-900">Data Extraction</strong> — AI-powered ingestion of raw field reports and documents</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span><strong className="text-slate-900">Smart Matching</strong> — Intelligent volunteer-to-need assignment</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span><strong className="text-slate-900">Zone Intelligence</strong> — Real-time heatmaps of resource coverage</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span><strong className="text-slate-900">Predictive Insights</strong> — AI forecasting for upcoming needs</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Organization Workflow</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span><strong className="text-slate-900">Ingest</strong> to create structured needs and volunteer profiles from messy source data.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span><strong className="text-slate-900">Match</strong> to compare one volunteer across all open needs with AI scoring and reasoning.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span><strong className="text-slate-900">Approve Draft</strong> when you want the system to allocate multiple volunteers in one pass.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span><strong className="text-slate-900">Track statuses</strong> as missions move from Open to Matched to In Progress to Completed.</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Volunteer Workflow</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span>Switch to <strong className="text-slate-900">Volunteer</strong> view to see your active missions and claim open protocols.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span>Use <strong className="text-slate-900">Update Status</strong> to set how long you are available for deployment.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span>Open a matched mission and move it through <strong className="text-slate-900">Initiate</strong> and <strong className="text-slate-900">Resolve</strong> as work is completed.</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">What Each Tab Means</h3>
                  <div className="grid gap-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-900">Ingest</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">Turn raw reports, OCR scans, and notes into structured needs and volunteer data.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-900">Match</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">Run the smart matcher or global draft to assign people where they create the most impact.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-900">Heatmap</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">See which zones are covered, strained, or under-resourced.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-900">Analytics</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">Review system efficiency, category patterns, skill gaps, and future-need forecasts.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Demo Tips</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span>Use the built-in demo data if you need a fast walkthrough without typing new reports.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span>Show at least one cross-zone or high-priority match to reinforce the “smart allocation” story.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-600 font-bold mt-0.5">•</span>
                      <span>Use the help drawer as your quick explainer if someone joins the demo mid-flow.</span>
                    </li>
                  </ul>
                </div>

                <div className="border-l-2 border-teal-600 pl-3 py-1">
                  <p className="text-xs text-slate-600 leading-relaxed italic">Not a listing platform. An intelligent allocation engine that decides <em>where</em> people should go, not just <em>who</em> is available.</p>
                </div>
              </div>

              <div className="px-4 py-3 bg-white border-t border-slate-100 text-xs text-slate-500 text-center shrink-0">
                Needs Protocol · Solution Challenge 2026
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
