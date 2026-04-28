import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Need, VolunteerProfile } from "../types";
import { MapPin, Navigation, X, Check } from "lucide-react";

// Fix Leaflet's broken default icon path in bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet prototype mutation required for bundler compatibility; unavoidable type assertion here
type LeafletIconProto = L.Icon.Default & { _getIconUrl?: () => string };
delete (L.Icon.Default.prototype as LeafletIconProto)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Coordinate lookup for known Indian cities / neighbourhoods
const COORDS: Record<string, [number, number]> = {
  "bengaluru": [12.9716, 77.5946],
  "bangalore": [12.9716, 77.5946],
  "btm layout": [12.9165, 77.6101],
  "koramangala": [12.9352, 77.6245],
  "jayanagar": [12.9308, 77.5838],
  "indiranagar": [12.9784, 77.6408],
};

function getCoords(location: string): [number, number] | null {
  const lower = location.toLowerCase();
  const keys = Object.keys(COORDS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) return COORDS[key];
  }
  return null;
}

function urgencyColor(urgency: string, status: string): string {
  if (status === "Completed" || status === "Fulfilled") return "#14b8a6"; // Teal
  if (status === "Matched" || status === "In Progress") return "#f59e0b"; // Amber
  if (urgency === "High") return "#e11d48"; // Rose
  if (urgency === "Medium") return "#f97316"; // Orange
  return "#334e68"; // Navy Slate
}

// Custom draggable pin icon
const pinIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;background:#14b8a6;border-radius:8px;transform:rotate(45deg);border:2px solid white;box-shadow:0 0 15px rgba(20,184,166,0.4)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: "",
});

interface LiveMapProps {
  needs: Need[];
  volunteers: VolunteerProfile[];
  centerOn?: string;
  /** Called when user confirms a pinned location */
  onLocationPinned?: (coords: { lat: number; lng: number; label: string }) => void;
}

export default function LiveMap({ needs, volunteers, centerOn, onLocationPinned }: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);

  const [isPinMode, setIsPinMode] = useState(false);
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pinLabel, setPinLabel] = useState("");

  // Init map
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 12,
        zoomControl: false,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);
      
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear need/volunteer markers
    map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    // Plot needs
    needs.forEach(need => {
      const coords = getCoords(need.location);
      if (!coords) return;

      const color = urgencyColor(need.urgency, need.status);
      const isOpen = need.status === "Open";

      L.circleMarker(coords, {
        radius: isOpen ? 12 : 6,
        fillColor: color,
        color: "#fff",
        weight: 1.5,
        opacity: 0.8,
        fillOpacity: isOpen ? 0.9 : 0.4,
      }).addTo(map).bindPopup(`
        <div style="font-family:'Inter', sans-serif; min-width:200px; padding:4px;">
          <div style="font-size:10px; font-family:'JetBrains Mono', monospace; font-weight:800; color:#14b8a6; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px;">Need Protocol Entry</div>
          <div style="font-size:13px; font-weight:900; color:#ffffff; margin-bottom:8px; line-height:1.2;">${need.title}</div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
            <span style="font-size:9px; font-family:'JetBrains Mono', monospace; font-weight:800; text-transform:uppercase; background:${color}; color:#fff; padding:2px 8px; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.2)">${need.urgency}</span>
            <span style="font-size:9px; font-family:'JetBrains Mono', monospace; font-weight:800; text-transform:uppercase; background:rgba(255,255,255,0.1); color:#94a3b8; padding:2px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.1)">${need.status}</span>
          </div>
          <div style="font-size:10px; font-family:'JetBrains Mono', monospace; color:#94a3b8; display:flex; align-items:center; gap:4px;">
            <span style="color:#14b8a6">LOC:</span> ${need.location}
          </div>
          ${need.assignedTo ? `<div style="font-size:10px; font-family:'JetBrains Mono', monospace; color:#14b8a6; margin-top:4px; display:flex; align-items:center; gap:4px;"><span style="color:#14b8a6">OPS:</span> ${need.assignedTo}</div>` : ""}
        </div>
      `, { 
        maxWidth: 280,
        className: 'mission-control-popup'
      });
    });

    // Plot volunteer clusters
    const volLocations = new Map<string, number>();
    volunteers.forEach(v => {
      volLocations.set(v.location, (volLocations.get(v.location) || 0) + 1);
    });

    volLocations.forEach((count, location) => {
      const coords = getCoords(location);
      if (!coords) return;
      const offsetCoords: [number, number] = [coords[0] + 0.005, coords[1] + 0.005];

      L.circleMarker(offsetCoords, {
        radius: 8,
        fillColor: "#ffffff",
        color: "#14b8a6",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(map).bindPopup(`
        <div style="font-family:'JetBrains Mono', monospace; min-width:140px; padding:4px;">
          <div style="font-size:10px; font-weight:800; color:#14b8a6; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px;">Personnel Cluster</div>
          <div style="font-size:14px; font-weight:900; color:#ffffff; margin-bottom:4px;">${count} AVAILABLE</div>
          <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">${location}</div>
        </div>
      `, { className: 'mission-control-popup' });
    });
  }, [needs, volunteers]);

  // Handle auto-zoom/pan when filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!centerOn || centerOn === "All") {
      map.flyTo([12.9716, 77.5946], 12, { duration: 1.5 });
    } else {
      const coords = getCoords(centerOn);
      if (coords) {
        map.flyTo(coords, 14, { duration: 2 });
      }
    }
  }, [centerOn]);

  // Handle pin mode map click
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (!isPinMode) return;

      const { lat, lng } = e.latlng;
      setPinnedCoords({ lat, lng });

      // Remove old pin if exists
      if (pinMarkerRef.current) {
        map.removeLayer(pinMarkerRef.current);
      }

      const marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setPinnedCoords({ lat: pos.lat, lng: pos.lng });
      });

      pinMarkerRef.current = marker;
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [isPinMode]);

  // Toggle cursor style
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.cursor = isPinMode ? "crosshair" : "";
  }, [isPinMode]);

  const handleConfirmPin = () => {
    if (!pinnedCoords || !onLocationPinned) return;
    onLocationPinned({ ...pinnedCoords, label: pinLabel || `${pinnedCoords.lat.toFixed(4)}, ${pinnedCoords.lng.toFixed(4)}` });
    setIsPinMode(false);
    setPinnedCoords(null);
    setPinLabel("");
  };

  const handleCancelPin = () => {
    if (pinMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(pinMarkerRef.current);
      pinMarkerRef.current = null;
    }
    setIsPinMode(false);
    setPinnedCoords(null);
    setPinLabel("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative bg-navy-950">
      <style>{`
        .mission-control-popup .leaflet-popup-content-wrapper {
          background: #102a43 !important;
          color: white !important;
          border-radius: 8px !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .mission-control-popup .leaflet-popup-tip {
          background: #102a43 !important;
        }
      `}</style>

      {/* Map Legend - Mission Control Style */}
      <div className="absolute top-4 left-4 z-[1000] bg-navy-900/90 backdrop-blur-md rounded-lg border border-white/10 shadow-2xl p-4 flex flex-col gap-3 min-w-[140px]">
        <div className="text-[10px] font-mono font-black text-teal-400 uppercase tracking-widest mb-1 pb-2 border-b border-white/10">Tactical Legend</div>
        {[
          { color: "bg-rose-500", label: "URGENT" },
          { color: "bg-orange-500", label: "PRIORITY" },
          { color: "bg-amber-400", label: "ACTIVE" },
          { color: "bg-teal-500", label: "RESOLVED" },
          { color: "bg-white", label: "PERSONNEL" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-sm ${color} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
            <span className="text-[10px] font-mono font-black text-slate-300 uppercase tracking-tighter">{label}</span>
          </div>
        ))}
      </div>

      {/* Pin Location Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
        {!isPinMode ? (
          <button
            onClick={() => setIsPinMode(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-navy-900 text-[10px] font-mono font-black uppercase tracking-widest rounded-lg shadow-2xl transition-all active:scale-95 group"
          >
            <Navigation className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            Set Beacon
          </button>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-navy-900/95 backdrop-blur-md border border-teal-500/30 rounded-lg shadow-2xl p-4 min-w-[240px]"
          >
            <p className="text-[10px] font-mono font-black text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {pinnedCoords ? "Refine beacon" : "Targeting..."}
            </p>
            {pinnedCoords && (
              <>
                <p className="text-[10px] text-slate-400 font-mono mb-3 bg-white/5 p-2 rounded border border-white/5">
                  LAT: {pinnedCoords.lat.toFixed(5)}<br/>
                  LNG: {pinnedCoords.lng.toFixed(5)}
                </p>
                <input
                  type="text"
                  placeholder="Designate location..."
                  value={pinLabel}
                  onChange={e => setPinLabel(e.target.value)}
                  className="w-full text-[11px] font-mono font-bold bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white mb-3 focus:outline-none focus:border-teal-500/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmPin}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-teal-500 hover:bg-teal-400 text-navy-900 text-[10px] font-mono font-black uppercase rounded-lg transition-all active:scale-95 shadow-lg"
                  >
                    <Check className="w-3.5 h-3.5" /> Confirm
                  </button>
                  <button
                    onClick={handleCancelPin}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono font-black uppercase rounded-lg transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Abort
                  </button>
                </div>
              </>
            )}
            {!pinnedCoords && (
              <button onClick={handleCancelPin} className="w-full py-2 bg-white/10 text-white text-[10px] font-mono font-black uppercase tracking-widest rounded-lg hover:bg-white/20 transition-all">
                Abort Selection
              </button>
            )}
          </motion.div>
        )}
      </div>

      <div ref={containerRef} className="map-container" />
      
      {/* Bottom Status Bar */}
      <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-4 bg-navy-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
          <span className="text-[9px] font-mono font-black text-teal-400 uppercase tracking-widest">Live Telemetry Active</span>
        </div>
        <div className="w-px h-3 bg-white/10"></div>
        <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-tighter">
          GRID: 12.9716N / 77.5946E
        </div>
      </div>
    </div>
  );
}
