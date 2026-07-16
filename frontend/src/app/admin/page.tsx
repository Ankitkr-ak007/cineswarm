import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  // Fetch recent agent runs
  const { data: agentRuns } = await supabase
    .from("agent_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  // Calculate simple stats
  const totalRuns = agentRuns?.length || 0;
  const errorRuns = agentRuns?.filter(r => r.status === 'failed').length || 0;
  const failureRate = totalRuns > 0 ? (errorRuns / totalRuns * 100).toFixed(1) : 0;

  // Calculate live quotas for today
  // Get start of today in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const groqAgents = ["critic", "vibes"];
  const geminiAgents = ["hidden_gems", "consensus"];

  const runsToday = agentRuns?.filter(r => new Date(r.created_at) >= today) || [];
  
  const groqRunsToday = runsToday.filter(r => groqAgents.includes(r.agent_name)).length;
  const geminiRunsToday = runsToday.filter(r => geminiAgents.includes(r.agent_name)).length;

  const GROQ_LIMIT = 14400; // Free tier daily limit (typical)
  const GEMINI_LIMIT = 1500; // Free tier daily limit

  const groqPercent = Math.min(100, Math.round((groqRunsToday / GROQ_LIMIT) * 100));
  const geminiPercent = Math.min(100, Math.round((geminiRunsToday / GEMINI_LIMIT) * 100));

  const groqWarning = groqPercent >= 80;
  const geminiWarning = geminiPercent >= 80;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-slate-400 mt-2">Overview of Swarm performance and usage.</p>
      </div>

      {(groqWarning || geminiWarning) && (
        <div className="bg-red-950/50 border border-red-500/50 text-red-200 p-4 rounded-md">
          <strong className="font-bold">Quota Warning:</strong> One or more AI provider quotas are nearing their daily limit. 
          Consider upgrading your tier or adding rate limiting.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Requests (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRuns}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Failure Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${errorRuns > 0 ? 'text-red-400' : 'text-green-400'}`}>{failureRate}%</div>
          </CardContent>
        </Card>
        
        <Card className={`bg-slate-950 border-slate-800 ${groqWarning ? 'border-red-500/50' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Groq Quota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${groqWarning ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>{groqPercent}%</div>
            <div className="text-xs text-slate-500 mt-1">{groqRunsToday} / {GROQ_LIMIT}</div>
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
              <div className={`${groqWarning ? 'bg-red-500' : 'bg-amber-400'} h-2 rounded-full`} style={{ width: `${groqPercent}%` }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-slate-950 border-slate-800 ${geminiWarning ? 'border-red-500/50' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Gemini Quota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${geminiWarning ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>{geminiPercent}%</div>
            <div className="text-xs text-slate-500 mt-1">{geminiRunsToday} / {GEMINI_LIMIT}</div>
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
              <div className={`${geminiWarning ? 'bg-red-500' : 'bg-blue-400'} h-2 rounded-full`} style={{ width: `${geminiPercent}%` }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle>Recent Agent Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Agent</th>
                  <th className="px-6 py-3">Latency (ms)</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {agentRuns?.map((run) => (
                  <tr key={run.id} className="border-b border-slate-800 hover:bg-slate-900/50">
                    <td className="px-6 py-4">{new Date(run.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium capitalize">{run.agent_name}</td>
                    <td className="px-6 py-4">{run.latency_ms || "N/A"}</td>
                    <td className="px-6 py-4">
                      {run.error ? (
                        <span className="text-red-400">Error</span>
                      ) : (
                        <span className="text-green-400">Success</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!agentRuns?.length && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
