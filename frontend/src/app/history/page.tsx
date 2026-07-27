import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, History, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

interface HistorySession {
  id: string;
  created_at: string;
  query_context?: {
    mode?: string;
    mood?: string;
    title?: string;
  };
}

export default async function HistoryPage() {
  let history: HistorySession[] = [];
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fake.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "fake-key",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const { data } = await supabase
      .from("sessions")
      .select("id, created_at, query_context")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      history = data;
    }
  } catch (err) {
    console.error("Failed to load history", err);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
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
              Recommendation History
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Explore your past AI Swarm sessions & debate logs.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {!history?.length ? (
            <Card className="border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-lg">
              <CardContent className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <Sparkles className="w-8 h-8 text-purple-500 mx-auto animate-pulse" />
                <p className="font-bold text-sm">No past recommendation sessions found yet.</p>
                <Link
                  href="/"
                  className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
                >
                  Start Your First AI Swarm Debate
                </Link>
              </CardContent>
            </Card>
          ) : (
            history.map((session, idx) => {
              const query = session.query_context || {};
              return (
                <Card key={idx} className="border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl shadow-lg hover:border-purple-500/50 transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-800 dark:text-slate-200">
                      <span>{new Date(session.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                        {query.mode || "Session"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {query.mood && (
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mr-2">Mood Query:</span>
                        {query.mood}
                      </p>
                    )}
                    {query.title && (
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mr-2">Direct Search:</span>
                        {query.title}
                      </p>
                    )}
                    <div className="pt-2 flex justify-end">
                      <Link
                        href={`/debate/${session.id}`}
                        className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        View Debate Session →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

