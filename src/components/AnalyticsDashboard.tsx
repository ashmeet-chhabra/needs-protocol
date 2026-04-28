import React, { useState, useMemo } from "react";
import { Need, VolunteerProfile, AIPrediction } from "../types";
import { getPredictions } from "../services/ai";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  TrendingUp, Brain, Loader2, AlertTriangle, MapPin, Zap,
  BarChart3, Activity, Lightbulb, Target, Database, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AnalyticsDashboardProps {
  needs: Need[];
  setNeeds?: React.Dispatch<React.SetStateAction<Need[]>>;
  volunteers: VolunteerProfile[];
}

const CAT_COLORS: Record<string, string> = {
  "Medical": "#3b82f6",      // Blue
  "Education": "#8b5cf6",    // Purple
  "Logistics": "#f97316",    // Orange
  "Food/Water": "#14b8a6",   // Teal
  "Shelter": "#4338ca",      // Indigo
  "Other": "#627d98",        // Navy
};

export default function AnalyticsDashboard({ needs, setNeeds, volunteers }: AnalyticsDashboardProps) {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [predictionSummary, setPredictionSummary] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);
  const [predError, setPredError] = useState<string | null>(null);

  const handleSeedData = () => {
    if (!setNeeds) return;
    const locations = ["Koramangala, Bengaluru", "Andheri East, Mumbai", "Base Camp Silchar", "T Nagar, Chennai", "Vasant Kunj, New Delhi"];
    const categories: Need["category"][] = ["Medical", "Logistics", "Food/Water", "Shelter", "Education", "Other"];
    const urgencies: Need["urgency"][] = ["High", "Medium", "Low"];
    
    // Explicitly add 'demo-seeded' flag to easily wipe them later
    const historicalData: Need[] = Array.from({ length: 15 }).map((_, i) => ({
      id: `historical-${Date.now()}-${i}`,
      title: `Resolved Incident ${i + 1}`,
      description: "Seeded historical data for pattern analysis.",
      category: categories[i % categories.length],
      urgency: urgencies[i % urgencies.length],
      location: locations[i % locations.length],
      requiredSkills: [],
      status: "Completed",
      createdAt: new Date(Date.now() - 86400000 * (20 - i)).toISOString(),
      assignedTo: "System Demo"
    }));

    setNeeds(prev => [...prev, ...historicalData]);
  };

  const handleDeseedData = () => {
    if (!setNeeds) return;
    // Remove only the items we dynamically seeded
    setNeeds(prev => prev.filter(n => !n.id.startsWith("historical-")));
  };

  // --- Derived ---
  const categoryData = useMemo(() => {
    const c: Record<string, number> = {};
    needs.forEach(n => { c[n.category] = (c[n.category] || 0) + 1; });
    return Object.entries(c).map(([name, value]) => ({ name, value, fill: CAT_COLORS[name] || "#94a3b8" }));
  }, [needs]);

  const locationData = useMemo(() => {
    const c: Record<string, { open: number; resolved: number }> = {};
    needs.forEach(n => {
      if (!c[n.location]) c[n.location] = { open: 0, resolved: 0 };
      if (n.status === "Open") c[n.location].open++;
      else if (n.status === "Completed" || n.status === "Fulfilled") c[n.location].resolved++;
    });
    return Object.entries(c)
      .map(([loc, d]) => ({ location: loc.length > 18 ? loc.slice(0, 16) + "…" : loc, ...d }))
      .sort((a, b) => b.open - a.open)
      .slice(0, 6);
  }, [needs]);

  const skillGaps = useMemo(() => {
    const needed: Record<string, number> = {};
    const available: Record<string, number> = {};
    needs.filter(n => n.status === "Open").forEach(n => n.requiredSkills.forEach(s => { needed[s] = (needed[s] || 0) + 1; }));
    volunteers.forEach(v => v.skills.forEach(s => { available[s] = (available[s] || 0) + 1; }));
    const all = new Set([...Object.keys(needed), ...Object.keys(available)]);
    return Array.from(all).map(skill => ({
      skill, needed: needed[skill] || 0, available: available[skill] || 0, gap: (needed[skill] || 0) - (available[skill] || 0),
    })).sort((a, b) => b.gap - a.gap);
  }, [needs, volunteers]);

  const resourceDeficits = useMemo(
    () => skillGaps.filter((gap) => gap.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 6),
    [skillGaps]
  );

  const resourceSurpluses = useMemo(
    () => skillGaps.filter((gap) => gap.gap <= 0).sort((a, b) => a.gap - b.gap).slice(0, 4),
    [skillGaps]
  );

  const resolved = needs.filter(n => n.status === "Completed" || n.status === "Fulfilled").length;
  const inPipeline = needs.filter(n => n.status === "Matched" || n.status === "In Progress").length;

  // Allocation Efficiency Score
  const efficiency = useMemo(() => {
    if (needs.length === 0) return null;
    const total = needs.length;
    const score = Math.round(((resolved + inPipeline) / total) * 100);
    return { score, resolved, inPipeline, total };
  }, [needs, resolved, inPipeline]);

  const handlePredict = async () => {
    setIsPredicting(true);
    setPredError(null);
    try {
      const result = await getPredictions(
        needs.filter(n => n.status === "Completed" || n.status === "Fulfilled"),
        needs.filter(n => n.status === "Open"),
        volunteers
      );
      setPredictions(result.predictions || []);
      setPredictionSummary(result.summary || "");
    } catch (err: any) {
      setPredError(err.message || "Failed to generate predictions");
    } finally {
      setIsPredicting(false);
    }
  };

  if (needs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 className="w-10 h-10 text-slate-800 mb-3" />
        <h3 className="text-sm font-semibold text-slate-900 mb-1">No Data Yet</h3>
        <p className="text-xs text-slate-500 max-w-xs mb-6">Analytics populate as needs and volunteer data flow through the system.</p>
        {setNeeds && (
          <button
            onClick={handleSeedData}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md active:scale-95"
          >
            <Database className="w-3.5 h-3.5" />
            Seed Historical Data (Demo)
          </button>
        )}
      </div>
    );
  }

  const hasSeededData = needs.some(n => n.id.startsWith("historical-"));

  return (
    <div className="space-y-5">
      {/* Demo Controls Header */}
      {setNeeds && (
        <div className="flex justify-end gap-2">
          {!hasSeededData && (
            <button
              onClick={handleSeedData}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider rounded-2xl hover:bg-emerald-100 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Database className="w-3 h-3" />
              Seed Analytics Data
            </button>
          )}
          {hasSeededData && (
            <button
              onClick={handleDeseedData}
              className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold uppercase tracking-wider rounded-2xl hover:bg-red-100 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <AlertTriangle className="w-3 h-3" />
              Wipe Demo Data
            </button>
          )}
        </div>
      )}

      {/* Efficiency Score + Quick Stats */}
      <div className="grid sm:grid-cols-4 gap-3">
        {efficiency && (
          <div className={`sm:col-span-1 rounded-xl border p-4 shadow-lg flex flex-col items-center justify-center relative overflow-hidden ${
            efficiency.score >= 80 ? "bg-white border-emerald-200" :
            efficiency.score >= 50 ? "bg-white border-amber-200" :
            "bg-white border-red-200"
          }`}>
            <div className={`absolute top-0 inset-x-0 h-1 ${
              efficiency.score >= 80 ? "bg-emerald-500" : efficiency.score >= 50 ? "bg-amber-500" : "bg-red-500"
            }`} />
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> System Efficiency
            </span>
            <div className="relative">
              <span className={`text-4xl font-mono font-bold ${
                efficiency.score >= 80 ? "text-emerald-600" : efficiency.score >= 50 ? "text-amber-600" : "text-red-600"
              }`}>{efficiency.score}%</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-1.5 h-3 rounded-full ${i < (efficiency.score / 20) ? (efficiency.score >= 80 ? "bg-emerald-500" : "bg-amber-500") : "bg-slate-200"}`} />
                ))}
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-500">{efficiency.resolved} RESOLVED</span>
            </div>
          </div>
        )}
        <div className="sm:col-span-3 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Tracked</span>
            <div className="text-xl font-bold text-slate-900">{needs.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Categories</span>
            <div className="text-xl font-bold text-slate-900">{categoryData.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Locations</span>
            <div className="text-xl font-bold text-slate-900">{locationData.length}</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-teal-700" /> Category Breakdown
            </h3>
          </div>
          <div className="p-4 h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={categoryData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={85} 
                  paddingAngle={4} 
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#102a43', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">Total</span>
              <span className="text-2xl font-mono font-bold text-navy-900">{needs.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" /> Open vs Resolved by Location
            </h3>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="location" 
                  type="category" 
                  width={110} 
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700, fill: '#334e68' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(16, 42, 67, 0.03)' }}
                  contentStyle={{ backgroundColor: '#102a43', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                />
                <Bar dataKey="open" stackId="a" fill="#e11d48" name="Open" radius={[0, 0, 0, 0]} barSize={12} />
                <Bar dataKey="resolved" stackId="a" fill="#0d9488" name="Resolved" radius={[0, 4, 4, 0]} barSize={12} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono', fontWeight: 700, paddingTop: '10px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Skill Gaps */}
      {skillGaps.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-display font-bold text-navy-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" /> 
              Resource Gaps
            </h3>
          </div>
          <div className="p-4 grid lg:grid-cols-[1.4fr_1fr] gap-4">
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-rose-100 bg-white/70">
                <div>
                  <p className="text-xs font-semibold text-rose-800">Top deficits</p>
                  <p className="text-[11px] text-rose-700/80">Skills currently needed more than available</p>
                </div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-rose-500">
                  {resourceDeficits.length} tracked
                </span>
              </div>
              <div className="divide-y divide-rose-100/80">
                {resourceDeficits.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-slate-500">No active deficits right now.</div>
                ) : (
                  resourceDeficits.map((gap, index) => (
                    <div key={gap.skill} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
                      <span className="w-6 text-center text-[11px] font-mono font-semibold text-rose-500">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{gap.skill}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          Need {gap.needed} • Available {gap.available}
                        </div>
                      </div>
                      <span className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-mono font-semibold text-rose-700">
                        -{gap.gap}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-teal-100 bg-teal-50/60 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-teal-100 bg-white/70">
                <div>
                  <p className="text-xs font-semibold text-teal-800">Available surplus</p>
                  <p className="text-[11px] text-teal-700/80">Capacity that can be redirected</p>
                </div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-teal-500">
                  {resourceSurpluses.length} tracked
                </span>
              </div>
              <div className="divide-y divide-teal-100/80">
                {resourceSurpluses.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-slate-500">No surplus detected yet.</div>
                ) : (
                  resourceSurpluses.map((gap) => (
                    <div key={gap.skill} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{gap.skill}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          Need {gap.needed} • Available {gap.available}
                        </div>
                      </div>
                      <span className="rounded-full border border-teal-200 bg-white px-2.5 py-1 text-[11px] font-mono font-semibold text-teal-700">
                        +{Math.abs(gap.gap)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Predictions */}
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-navy-900 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/20 shadow-inner">
              <Brain className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                Predictive Analytics
                <span className="text-[10px] font-mono font-semibold bg-teal-500 text-navy-900 px-2 py-0.5 rounded">AI-POWERED</span>
              </h2>
              <p className="text-[10px] text-teal-300/80 font-mono font-semibold uppercase tracking-widest">Autonomous demand pattern forecasting</p>
            </div>
          </div>
          <button
            onClick={handlePredict}
            disabled={isPredicting || needs.length < 2}
            className={`px-5 py-2.5 text-xs font-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg active:scale-95 ${
              resolved < 10 ? "bg-white/10 text-white border border-white/20 hover:bg-white/20" : "bg-teal-500 text-navy-900 hover:bg-teal-400"
            }`}
          >
            {isPredicting ? <><Loader2 className="w-4 h-4 animate-spin" /> Computing…</> : 
             resolved < 10 ? <><AlertTriangle className="w-4 h-4" /> Force Analysis</> : 
             <><TrendingUp className="w-4 h-4" /> Run Forecast</>}
          </button>
        </div>

        <div className="p-4">
          {/* Data Confidence Indicator */}
          {resolved < 10 && !isPredicting && predictions.length === 0 && (
            <div className="mb-4 bg-white/60 border border-slate-200 rounded-2xl p-3">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                <span>Data Confidence: {Math.round((resolved / 10) * 100)}%</span>
                <span>{resolved} / 10 required</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                <div className="progress-bar" style={{ width: `${Math.min(100, (resolved / 10) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                <strong>Forecasting is disabled by default.</strong> The system requires a baseline of at least 10 resolved historical records to generate reliable trend predictions without hallucinating. You can force an analysis for demonstration purposes, but confidence will be low.
              </p>
              {setNeeds && (
                <button
                  onClick={handleSeedData}
                  className="px-3 py-1.5 bg-white text-slate-900 text-[10px] font-semibold rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Database className="w-3 h-3" />
                  Seed Historical Data (Demo)
                </button>
              )}
            </div>
          )}
          {predError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-2.5 mb-3 flex items-center gap-1.5 text-xs text-red-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {predError}
            </div>
          )}

          {predictionSummary && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-indigo-100 rounded-2xl p-3 mb-4 shadow-sm">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Executive Summary</span>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{predictionSummary}</p>
                </div>
              </div>
            </motion.div>
          )}

          {predictions.length === 0 && !isPredicting && !predError && (
            <div className="text-center py-6">
              <Zap className="w-6 h-6 text-indigo-200 mx-auto mb-2" />
              <p className="text-[11px] text-indigo-500/60">Hit <strong>Forecast</strong> to analyze patterns and predict upcoming needs.</p>
            </div>
          )}

          {predictions.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {predictions.map((pred, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.06 }}
                  className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border shadow-sm ${
                      pred.predictedUrgency === "High" ? "bg-rose-50 text-rose-700 border-rose-100" :
                      pred.predictedUrgency === "Medium" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                    }`}>{pred.predictedUrgency}</span>
                    <span className="text-[10px] font-mono font-black text-navy-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-inner">{pred.confidence}% CONF</span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Targeted Sector
                    </div>
                    <div className="text-sm font-display font-black text-navy-900">{pred.location}</div>
                  </div>

                  <div className="mb-4">
                    <span className="text-[10px] font-mono font-black px-2 py-1 rounded bg-navy-900 text-white shadow-lg uppercase tracking-tight">
                      {pred.predictedCategory}
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-200">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">Forecast Reasoning</div>
                    <p className="text-[11px] font-mono text-slate-600 leading-relaxed bg-white/50 p-2 rounded-lg border border-slate-100">
                      {pred.reasoning}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
