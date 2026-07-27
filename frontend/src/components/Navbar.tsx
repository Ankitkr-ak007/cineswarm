"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sparkles, History, Compass } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/75 dark:bg-slate-950/75 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              CineSwarm
              <span className="text-[9px] font-black bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase border border-blue-500/30">
                AI Vector 2.0
              </span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider -mt-1 hidden sm:inline">
              4-Agent Swarm Debate Engine
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <Compass className="w-4 h-4 text-blue-500" />
              <span className="hidden sm:inline">Explore Vibes</span>
            </Button>
          </Link>

          <Link href="/history">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <History className="w-4 h-4 text-purple-500" />
              <span className="hidden sm:inline">History</span>
            </Button>
          </Link>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 my-auto hidden sm:block" />

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 rounded-full text-[11px] font-bold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
            <span className="hidden md:inline">Cosine Engine Active</span>
            <span className="md:hidden">Engine Ready</span>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
