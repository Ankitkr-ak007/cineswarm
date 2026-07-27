"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History, Sparkles, Trash2, ExternalLink } from "lucide-react";
import { getHistoryFromStorage, clearLocalHistory, SavedSession } from "@/lib/history-storage";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const local = getHistoryFromStorage();
    setSessions(local);
    setLoaded(true);
  }, []);

  const handleClear = () => {
    if (confirm("Are you sure you want to clear your recommendation history?")) {
      clearLocalHistory();
      setSessions([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Discover
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-7 h-7 text-purple-500" />
              Your Recommendation History
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Saved automatically on your device. Jump back into any past AI Swarm debate.
            </p>
          </div>

          {sessions.length > 0 && (
            <Button
              onClick={handleClear}
              variant="outline"
              size="sm"
              className="rounded-xl border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear History</span>
            </Button>
          )}
        </div>

        <div className="grid gap-4">
          {!loaded ? (
            <Card className="border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl p-8 text-center text-slate-400 font-bold text-sm">
              Loading your history...
            </Card>
          ) : sessions.length === 0 ? (
            <Card className="border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-lg">
              <CardContent className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-4">
                <Sparkles className="w-10 h-10 text-purple-500 mx-auto animate-pulse" />
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No past sessions found yet</h3>
                  <p className="text-xs font-medium text-slate-400 max-w-sm mx-auto">
                    When you run an AI Swarm recommendation or search for a title, your sessions will automatically save here!
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-block px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-2xl transition-all shadow-lg shadow-blue-500/25 cursor-pointer"
                >
                  Start Your First AI Swarm Debate
                </Link>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card
                key={session.id}
                className="border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl shadow-lg hover:border-purple-500/50 transition-all group"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold flex items-center justify-between text-slate-400 dark:text-slate-500">
                    <span>
                      {new Date(session.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                      {session.mode === "mood" ? "Vibe Search" : session.mode === "title" ? "Direct Title" : "Quick Pick"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.mood && (
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mr-2 block sm:inline">
                        Mood / Vibe Query:
                      </span>
                      &quot;{session.mood}&quot;
                    </div>
                  )}

                  {session.title && (
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mr-2 block sm:inline">
                        Searched Content:
                      </span>
                      {session.title}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-400">Session ID: {session.id.substring(0, 8)}...</span>
                    <Link
                      href={`/debate/${session.id}`}
                      className="text-xs font-black text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1"
                    >
                      <span>Re-Open AI Debate</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
