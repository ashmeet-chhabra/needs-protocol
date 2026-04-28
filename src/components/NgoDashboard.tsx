import React, { useState, useRef } from "react";
import { Layers, Loader2, MapPin, AlertCircle, Briefcase, Camera, ChevronDown, Clock, Tag, Trash2, Info, Plus, CheckCircle } from "lucide-react";
import { Need, VolunteerProfile, ExtractedVolunteerData } from "../types";
import { extractDataFromText, extractTextFromImage } from "../services/ai";
import { motion, AnimatePresence } from "motion/react";
import { SAMPLE_TEXTS } from "../data/demo";

interface NgoDashboardProps {
  needs: Need[];
  setNeeds: React.Dispatch<React.SetStateAction<Need[]>>;
  setVolunteers: React.Dispatch<React.SetStateAction<VolunteerProfile[]>>;
}

const SAMPLES = SAMPLE_TEXTS;

const URGENCY_STYLE: Record<string, string> = {
  High: "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const CATEGORY_STYLE: Record<string, string> = {
  Medical: "bg-blue-50 text-blue-700 border-blue-200",
  Education: "bg-purple-50 text-purple-700 border-purple-200",
  Logistics: "bg-orange-50 text-orange-700 border-orange-200",
  "Food/Water": "bg-teal-50 text-teal-700 border-teal-200",
  Shelter: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Other: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function NgoDashboard({ needs, setNeeds, setVolunteers }: NgoDashboardProps) {
  const [rawText, setRawText] = useState(SAMPLES[0].text);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExtracted, setLastExtracted] = useState<{ needs: number; volunteers: number } | null>(null);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setError(null);
    try {
      const extractedText = await extractTextFromImage(file);
      setRawText(extractedText + "\n\n" + rawText);
    } catch (err: any) {
      setError(err.message || "An error occurred while scanning the document.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProcessText = async () => {
    const trimmedText = rawText.trim();
    
    // Validation
    if (!trimmedText) {
      setError("Please enter text to process");
      return;
    }
    if (trimmedText.length < 20) {
      setError("Text too short (minimum 20 characters for AI analysis)");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setLastExtracted(null);
    try {
      const extracted = await extractDataFromText(rawText);
      let needCount = 0, volCount = 0;

      if (extracted.needs?.length) {
        const newNeeds: Need[] = extracted.needs.map(n => ({
          ...n,
          id: `need-${crypto.randomUUID()}`,
          status: "Open" as const,
          createdAt: new Date().toISOString(),
        }));
        setNeeds(prev => [...newNeeds, ...prev]);
        needCount = newNeeds.length;
      }

      if (extracted.volunteers?.length) {
        setVolunteers(prev => {
          const withReusedIds = extracted.volunteers.map(v => {
            const extractedVol = v as ExtractedVolunteerData;
            
            // Check if this volunteer already exists by name+location to reuse their ID
            const existingVol = prev.find(pv => 
              pv.name.toLowerCase().trim() === v.name.toLowerCase().trim() &&
              (pv.location || '').toLowerCase().trim() === (v.location || '').toLowerCase().trim()
            );
            
            const finalId = existingVol?.id || `vol-${v.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${crypto.randomUUID().slice(0, 8)}`;
            
            return {
              ...v,
              id: finalId,
              status: "Available" as const,
              availableUntil: new Date(Date.now() + (extractedVol.estimatedHoursAvailable || 24) * 60 * 60 * 1000).toISOString(),
              joinedAt: existingVol?.joinedAt || new Date().toISOString(),
            };
          });
          
          return [...withReusedIds, ...prev];
        });
        volCount = extracted.volunteers.length;
      }

      setLastExtracted({ needs: needCount, volunteers: volCount });
      setRawText("");
    } catch (err: any) {
      setError(err.message || "Failed to process. Check your connection and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openNeeds = needs.filter(n => n.status === "Open");

  const handleDelete = (needId: string) => {
    setNeeds(prev => prev.filter(n => n.id !== needId));
  };

  return (
    <div className="space-y-6">

      {/* Ingestion Card */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-display font-bold text-navy-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              Field Data Processing
              <div className="group relative">
                <Info className="w-4 h-4 text-slate-300 cursor-help" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-100 text-navy-900 text-[10px] p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] shadow-xl font-normal leading-relaxed text-center">
                  Paste text or upload photos of field reports. Extracts key details: what's needed, location, and urgency level.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
                </div>
              </div>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Process field data and volunteer information from text or documents.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScanDocument} aria-label="Upload document for OCR scanning" />
            <div className="relative">
              <button
                onClick={() => setShowSampleMenu(!showSampleMenu)}
                className="text-[11px] font-semibold py-1.5 px-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm text-slate-700 flex items-center gap-1"
              >
                Demo Data <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
              <AnimatePresence>
                {showSampleMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSampleMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1 overflow-hidden"
                    >
                      {SAMPLES.map(sample => (
                        <button
                          key={sample.id}
                          onClick={() => { setRawText(sample.text); setShowSampleMenu(false); }}
                          className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700 transition-colors"
                        >
                          {sample.title}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* OCR Featured Banner */}
        <div className="mx-4 mt-4 rounded-xl border border-teal-200 bg-teal-50/30 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-teal-100">
              <Camera className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-display font-semibold text-navy-900">Scan Field Documents</span>
                <span className="text-[9px] font-mono font-semibold uppercase tracking-wider bg-navy-900 text-white px-2 py-0.5 rounded">OCR-PRO</span>
              </div>
              <p className="text-[11px] text-teal-700 font-medium">Handwritten survey and printed report extraction enabled</p>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="shrink-0 text-xs font-bold py-2.5 px-5 rounded-lg bg-navy-900 text-white hover:bg-navy-800 transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isScanning ? "Scanning…" : "Upload Document"}
          </button>
        </div>

        <div className="flex items-center gap-3 mx-4 mt-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">or paste text below</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="p-4">
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              if (error) setError(null);
            }}
            className="w-full h-36 p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700/15 focus:border-teal-600 resize-none text-sm shadow-sm placeholder:text-slate-500 bg-white"
            placeholder="Paste your raw community data here…"
            disabled={isProcessing}
          />

          {error && (
            <p className="text-rose-600 text-xs mt-2 flex items-center gap-1 font-medium bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-2xl">
              <AlertCircle className="w-3 h-3 shrink-0" /> {error}
            </p>
          )}

          {lastExtracted && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-emerald-700 text-xs mt-2 flex items-center gap-1 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-2xl"
            >
              <CheckCircle className="w-3 h-3" />
              Found {lastExtracted.needs} need{lastExtracted.needs !== 1 ? "s" : ""} and {lastExtracted.volunteers} volunteer{lastExtracted.volunteers !== 1 ? "s" : ""}
            </motion.p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleProcessText}
              disabled={isProcessing || !rawText.trim()}
              className="px-6 py-3 bg-navy-900 text-white text-sm font-bold rounded-lg hover:bg-navy-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
              ) : (
                <>Process Data</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Extracted Needs List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">
            Active Needs
            <span className="ml-2 text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
              {openNeeds.length}
            </span>
          </h2>
        </div>

        {openNeeds.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
            <Briefcase className="w-8 h-8 text-slate-800 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No needs extracted yet. Paste data above and hit <strong>Extract with Gemini</strong>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {openNeeds.map(need => (
                <motion.div
                  key={need.id}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
                >
                  {/* Card Header Module */}
                  <div className="p-4 border-b border-slate-50 flex-1">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                          need.urgency === "High" ? "bg-rose-50 text-rose-700 border-rose-100" :
                          need.urgency === "Medium" ? "bg-amber-50 text-amber-700 border-amber-100" :
                          "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}>
                          {need.urgency.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-navy-50 text-navy-600 border border-navy-100">
                          {need.category.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(need.id)}
                        title="Delete this need"
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-lg opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="text-sm font-display font-semibold text-navy-900 mb-2 leading-tight">{need.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">{need.description}</p>
                  </div>

                  {/* Card Footer Module */}
                  <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 mt-auto">
                    <div className="flex items-center text-[10px] font-mono font-medium text-slate-400 gap-1.5 mb-2 truncate">
                      <MapPin className="w-3.5 h-3.5" /> {need.location}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {need.requiredSkills.map((skill, idx) => (
                        <span key={idx} className="bg-white border border-slate-200 text-navy-900 text-[9px] font-mono font-medium px-2 py-0.5 rounded shadow-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
