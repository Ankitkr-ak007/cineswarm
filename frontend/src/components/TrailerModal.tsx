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

        {/* Video Embed Player or Fallback UI */}
        <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center p-6 text-center">
          {trailerKey ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
              title={`${title} Official Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center shadow-lg">
                <Play className="w-7 h-7 fill-current ml-0.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-white">Watch {title} Trailer</h4>
                <p className="text-xs font-medium text-slate-400">
                  Direct embedded stream is not available for this title. Tap below to watch the HD official trailer directly on YouTube!
                </p>
              </div>
              <a href={directWatchUrl} target="_blank" rel="noopener noreferrer" className="pt-2">
                <Button className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-red-500/20 px-5 py-2.5">
                  <span>Open Official Trailer on YouTube</span>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">
            {trailerKey ? "Playing HD Official Trailer from YouTube" : "Official YouTube Trailer Link"}
          </span>
          <a href={directWatchUrl} target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
