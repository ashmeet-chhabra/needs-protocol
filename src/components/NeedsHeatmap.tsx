import React, { useMemo } from "react";
import { Need, VolunteerProfile } from "../types";
import { MapPin, Users, AlertTriangle, Shield, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import LiveMap from "./LiveMap";

interface NeedsHeatmapProps {
  needs: Need[];
  volunteers: VolunteerProfile[];
}

interface ZoneData {
  location: string;
  total: number;
  open: number;
  critical: number;
  resolved: number;
  inPipeline: number;
  categories: Record<string, number>;
  volunteerCount: number;
  coverageRatio: number; // volunteers / open needs
  status: "critical" | "strained" | "balanced" | "surplus";
}

function getZoneStatus(open: number, volunteerCount: number, critical: number): ZoneData["status"] {
  if (critical > 0 && volunteerCount === 0) return "critical";
  if (open > 0 && volunteerCount < open) return "strained";
  if (open > 0 && volunteerCount >= open) return "balanced";
  return "surplus";
}

const STATUS_CONFIG = {
  critical: {
    bg: "bg-rose-500",
    bgLight: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    ring: "ring-rose-400/40",
    glow: "shadow-rose-500/20",
    label: "CRITICAL",
    pulse: true,
  },
  strained: {
    bg: "bg-amber-500",
    bgLight: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    ring: "ring-amber-400/30",
    glow: "shadow-amber-500/15",
    label: "STRAINED",
    pulse: false,
  },
  balanced: {
    bg: "bg-teal-500",
    bgLight: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-700",
    ring: "ring-teal-400/20",
    glow: "shadow-teal-500/10",
    label: "COVERED",
    pulse: false,
  },
  surplus: {
    bg: "bg-navy-900",
    bgLight: "bg-navy-50",
    border: "border-navy-200",
    text: "text-navy-900",
    ring: "ring-navy-400/20",
    glow: "shadow-navy-500/10",
    label: "OPTIMAL",
    pulse: false,
  },
};

export default function NeedsHeatmap({ needs, volunteers }: NeedsHeatmapProps) {
  const zones: ZoneData[] = useMemo(() => {
    const zoneMap: Record<string, Omit<ZoneData, "coverageRatio" | "status">> = {};

    // Aggregate needs by location
    needs.forEach(n => {
      if (!zoneMap[n.location]) {
        zoneMap[n.location] = {
          location: n.location,
          total: 0,
          open: 0,
          critical: 0,
          resolved: 0,
          inPipeline: 0,
          categories: {},
          volunteerCount: 0,
        };
      }
      const z = zoneMap[n.location];
      z.total++;
      if (n.status === "Open") {
        z.open++;
        if (n.urgency === "High") z.critical++;
      }
      if (n.status === "Completed" || n.status === "Fulfilled") z.resolved++;
      if (n.status === "Matched" || n.status === "In Progress") z.inPipeline++;
      z.categories[n.category] = (z.categories[n.category] || 0) + 1;
    });

    // Map volunteers to zones (fuzzy location matching)
    volunteers.forEach(v => {
      const exactMatch = zoneMap[v.location];
      if (exactMatch) {
        exactMatch.volunteerCount++;
      } else {
        // Try partial match
        const partialKey = Object.keys(zoneMap).find(key =>
          key.toLowerCase().includes(v.location.toLowerCase()) ||
          v.location.toLowerCase().includes(key.toLowerCase())
        );
        if (partialKey) {
          zoneMap[partialKey].volunteerCount++;
        }
      }
    });

    return Object.values(zoneMap)
      .map(z => ({
        ...z,
        coverageRatio: z.open > 0 ? z.volunteerCount / z.open : z.volunteerCount > 0 ? 999 : 0,
        status: getZoneStatus(z.open, z.volunteerCount, z.critical),
      }))
      .sort((a, b) => {
        const priority = { critical: 0, strained: 1, balanced: 2, surplus: 3 };
        return priority[a.status] - priority[b.status] || b.open - a.open;
      });
  }, [needs, volunteers]);

  const [view, setView] = React.useState<"list" | "map">("list");
  const [cityFilter, setCityFilter] = React.useState<string>("All");

  const cities = React.useMemo(() => {
    const citySet = new Set<string>();
    zones.forEach(z => {
      const parts = z.location.split(",");
      const city = parts.length > 1 ? parts[parts.length - 1].trim() : z.location;
      citySet.add(city);
    });
    return Array.from(citySet).sort();
  }, [zones]);

  const visibleZones = cityFilter === "All"
    ? zones
    : zones.filter(z => z.location.toLowerCase().includes(cityFilter.toLowerCase()));

  const filteredNeeds = cityFilter === "All"
    ? needs
    : needs.filter(n => n.location.toLowerCase().includes(cityFilter.toLowerCase()));

  const filteredVolunteers = cityFilter === "All"
    ? volunteers
    : volunteers.filter(v => v.location.toLowerCase().includes(cityFilter.toLowerCase()));

  if (zones.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-12 text-center">
        <MapPin className="w-12 h-12 text-navy-900 mx-auto mb-4 opacity-20" />
        <p className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">Awaiting Spatial Data Flow...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle - Mission Control Style */}
      <div className="bg-navy-900 rounded-xl border border-white/10 p-1.5 flex items-center w-fit mx-auto shadow-2xl relative overflow-hidden">
        <div className="dot-pattern dot-pattern-12 absolute inset-0"></div>
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest transition-all relative z-10 ${
            view === "list" ? "bg-white text-navy-900 shadow-xl" : "text-white/50 hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Tactical Insights
        </button>
        <button
          onClick={() => setView("map")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest transition-all relative z-10 ${
            view === "map" ? "bg-teal-500 text-navy-900 shadow-xl" : "text-white/50 hover:text-white"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Live Field Intel
        </button>
      </div>

      {/* City Filter */}
      {cities.length > 1 && (
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">Zone Filter:</span>
          {["All", ...cities].map(city => (
            <button
              key={city}
              onClick={() => setCityFilter(city)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest border transition-all ${
                cityFilter === city
                  ? "bg-navy-900 text-white border-navy-900 shadow-lg"
                  : "bg-white text-slate-400 border-slate-200 hover:border-navy-900 hover:text-navy-900"
              }`}
            >
              {city === "All" ? "Global" : city}
            </button>
          ))}
        </div>
      )}

      {view === "map" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-navy-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden"
        >
          <LiveMap
            needs={filteredNeeds}
            volunteers={filteredVolunteers}
            centerOn={cityFilter}
            onLocationPinned={() => {}}
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Heatmap Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleZones.map((zone, idx) => {
              const config = STATUS_CONFIG[zone.status];
              const topCategories = Object.entries(zone.categories)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

              return (
                <motion.div
                  key={zone.location}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`relative rounded-xl border p-5 shadow-lg transition-all hover:shadow-xl ${config.border} ${config.bgLight} overflow-hidden group`}
                >
                  {/* Status Indicator Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${config.bg}`} />

                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest mb-1">Operational Zone</div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(zone.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-display font-black text-navy-900 hover:text-teal-600 transition-colors truncate block"
                      >
                        {zone.location}
                      </a>
                    </div>
                    <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded shadow-sm ${config.bg} text-white shrink-0 ml-2 ${config.pulse ? 'animate-pulse ring-2 ring-rose-400/20' : ''}`}>
                      {config.label}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/50 p-3 rounded-lg border border-white/50 text-center">
                      <div className="text-xl font-mono font-black text-navy-900 leading-none mb-1">{zone.open}</div>
                      <div className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Needs</div>
                    </div>
                    <div className="bg-white/50 p-3 rounded-lg border border-white/50 text-center">
                      <div className={`text-xl font-mono font-black leading-none mb-1 ${zone.critical > 0 ? "text-rose-600" : "text-navy-900"}`}>
                        {zone.critical}
                      </div>
                      <div className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Alerts</div>
                    </div>
                    <div className="bg-white/50 p-3 rounded-lg border border-white/50 text-center">
                      <div className="text-xl font-mono font-black text-teal-600 leading-none mb-1">{zone.resolved}</div>
                      <div className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Done</div>
                    </div>
                  </div>

                  {/* Personnel Availability */}
                  <div className={`flex items-center justify-between px-4 py-3 rounded-lg border text-[10px] font-mono font-black uppercase tracking-widest mb-4 ${
                    zone.volunteerCount >= zone.open
                      ? "bg-teal-50 border-teal-200 text-teal-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}>
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {zone.volunteerCount} PERSONNEL
                    </span>
                    <span className="flex items-center gap-1.5">
                      {zone.volunteerCount >= zone.open ? <Shield className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {zone.volunteerCount >= zone.open ? "STATUS: OK" : "STATUS: GAP"}
                    </span>
                  </div>

                  {/* Category Breakdown */}
                  {topCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                      {topCategories.map(([cat, count]) => (
                        <span key={cat} className="text-[9px] font-mono font-bold px-2 py-1 rounded bg-navy-900/5 text-navy-900 border border-navy-900/10">
                          {cat} ×{count}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
