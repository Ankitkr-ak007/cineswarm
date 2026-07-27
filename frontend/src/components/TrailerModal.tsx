"use client";

import { X, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  year?: number | string | null;
  trailerKey?: string | null;
}

export function TrailerModal({ isOpen, onClose, title, year, trailerKey }: TrailerModalProps) {
  if (!isOpen) return null;

  const searchQuery = encodeURIComponent(`${title} ${year ? year : ""} official trailer`);
  const embedUrl = trailerKey 
    ? `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`
    : `https://www.youtube.com/results?search_query=${searchQuery}`;
  const directWatchUrl = trailerKey
    ? `https://www.youtube.com/watch?v=${trailerKey}`
    : `https://www.youtube.com/results?search_query=${searchQuery}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Official Trailer & Teaser Preview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Embed Player */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          <iframe
            src={embedUrl}
            title={`${title} Trailer`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">
            Searching HD Official Trailers on YouTube
          </span>
          <a href={directWatchUrl} target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
