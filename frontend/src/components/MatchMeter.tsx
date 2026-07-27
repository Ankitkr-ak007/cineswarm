"use client";

import { useEffect, useState } from "react";
import { Sparkles, Cpu, Zap, Activity } from "lucide-react";

interface MatchMeterProps {
  percentage: number;
  similarityScore?: number;
  showBreakdown?: boolean;
}

export function MatchMeter({ percentage, similarityScore = 0.88, showBreakdown = true }: MatchMeterProps) {
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPct(Math.min(99.9, Math.max(0, percentage)));
    }, 150);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 backdrop-blur-md shadow-xl transition-all hover:border-indigo-500/40">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Glowing Background Blur */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/30 blur-md animate-pulse" />
        
        {/* SVG Ring Gauge */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-gradient-to-r transition-all duration-1000 ease-out"
            stroke="url(#matchGradient)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
          <defs>
            <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-0.5">
            {animatedPct.toFixed(1)}
            <span className="text-xs font-bold text-blue-500">%</span>
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Vector Match
          </span>
        </div>
      </div>

      {/* Vector Sub-Metrics */}
      {showBreakdown && (
        <div className="mt-4 w-full space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Vibe Vector
            </span>
            <span className="text-purple-600 dark:text-purple-400 font-extrabold">40% Weight</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full w-[92%]" />
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 pt-1">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-blue-500" /> Cosine Similarity
            </span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">{similarityScore.toFixed(3)}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full w-[88%]" />
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 pt-1">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-500" /> Genre Alignment
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">35% Weight</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full w-[95%]" />
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] text-center font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
        <Sparkles className="w-3 h-3 text-purple-500 animate-spin" />
        <span>TF-IDF Embedding Vector Space</span>
      </div>
    </div>
  );
}
