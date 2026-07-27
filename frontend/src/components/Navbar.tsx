"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sparkles, History, Compass, Menu, X, Cpu, Flame, ExternalLink } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              CineSwarm
              <span className="text-[9px] font-black bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase border border-blue-500/30">
                AI 2.0
              </span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider -mt-1 hidden md:inline">
              4-Agent Swarm Debate Engine
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <Compass className="w-4 h-4 text-blue-500" />
              <span>Explore Vibes</span>
            </Button>
          </Link>

          <Link href="/history">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <History className="w-4 h-4 text-purple-500" />
              <span>History</span>
            </Button>
          </Link>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 my-auto" />

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 rounded-full text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            <span>Cosine Vector Engine Active</span>
          </div>

          <ThemeToggle />
        </div>

        {/* Mobile Actions Right */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-2xl">
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-900 pb-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-500" />
              Engine Status: Active
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Online
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-sm transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <span>Explore Movie Vibes</span>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-purple-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-sm transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <span>Recommendation History</span>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </Link>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
            <Flame className="w-3 h-3 text-amber-500 animate-pulse" />
            <span>AI Swarm Debate Engine • Multi-Agent Cinema AI</span>
          </div>
        </div>
      )}
    </header>
  );
}
