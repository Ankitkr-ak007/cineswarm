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
  const failureRate = totalRuns > 0 ? ((errorRuns / totalRuns) * 100).toFixed(1) : "0.0";

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

  // Task 3: Latency calculations per agent
  const agentLatencies = geminiAgents.concat(groqAgents).map(name => {
    const runs = agentRuns?.filter(r => r.agent_name === name && r.latency_ms) || [];
    const avg = runs.length > 0 ? Math.round(runs.reduce((acc, r) => acc + (r.latency_ms || 0), 0) / runs.length) : 0;
    return { name, avg, count: runs.length };
  });

  // Task 3: Service operational status based on most recent session
  const mostRecentSessionId = agentRuns && agentRuns.length > 0 ? agentRuns[0].session_id : null;
  const recentSessionRuns = (mostRecentSessionId && agentRuns) 
    ? agentRuns.filter(r => r.session_id === mostRecentSessionId)
    : [];

  const groqRuns = recentSessionRuns.filter(r => groqAgents.includes(r.agent_name));
  const groqSuccess = groqRuns.length > 0 && groqRuns.every(r => r.status === "ok");

  const geminiRuns = recentSessionRuns.filter(r => geminiAgents.includes(r.agent_name));
  const geminiSuccess = geminiRuns.length > 0 && geminiRuns.every(r => r.status === "ok");

  const tmdbSuccess = recentSessionRuns.length > 0 && recentSessionRuns.every(r => r.movie_id !== null);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
        <p className="text-slate-400 mt-2">Overview of Swarm performance and usage.</p>
      </div>

      {(groqWarning || geminiWarning) && (
        <div className="bg-red-950/50 border border-red-500/50 text-red-200 p-4 rounded-md">
          <strong className="font-bold">Quota Warning:</strong> One or more AI provider quotas are nearing their daily limit. 
          Consider upgrading your tier or adding rate limiting.
        </div>
      )}

      {/* Quota grids */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Requests (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalRuns}</div>
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

      {/* Task 3 Charts and Status Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Latency Table */}
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Per-Agent Average Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs uppercase bg-slate-900 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-4 py-2">Agent</th>
                  <th className="px-4 py-2">Runs Count</th>
                  <th className="px-4 py-2">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {agentLatencies.map((agent) => (
                  <tr key={agent.name} className="border-b border-slate-900 hover:bg-slate-900/50">
                    <td className="px-4 py-3 capitalize font-semibold">{agent.name.replace("_", " ")}</td>
                    <td className="px-4 py-3">{agent.count}</td>
                    <td className="px-4 py-3 text-blue-400 font-bold">{agent.avg > 0 ? `${agent.avg} ms` : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Operational Status Table */}
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Most Recent Request Service Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mostRecentSessionId ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-400">Session ID:</span>
                  <span className="font-mono text-xs text-slate-500">{mostRecentSessionId}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">TMDB</span>
                    <div className="text-xs font-bold mt-1">
                      {tmdbSuccess ? (
                        <span className="text-green-400">✅ ONLINE</span>
                      ) : (
                        <span className="text-red-400">❌ OFFLINE</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Groq</span>
                    <div className="text-xs font-bold mt-1">
                      {groqSuccess ? (
                        <span className="text-green-400">✅ SUCCESS</span>
                      ) : (
                        <span className="text-red-400">❌ FAILED</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Gemini</span>
                    <div className="text-xs font-bold mt-1">
                      {geminiSuccess ? (
                        <span className="text-green-400">✅ SUCCESS</span>
                      ) : (
                        <span className="text-red-400">❌ FAILED</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No recent session data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Agent Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <table className="w-full text-sm text-left text-slate-300">
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
