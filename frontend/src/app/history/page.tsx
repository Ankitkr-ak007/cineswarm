import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/"); 
  }

  // In a real app we would have a user_sessions or history table.
  // Assuming we pull from agent_runs based on session_id for this MVP.
  // A better schema would be `recommendation_sessions`.
  
  const { data: history } = await supabase
    .from("agent_runs")
    .select("session_id, created_at, input_data, output_data")
    .eq("agent_name", "consensus")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Your History</h2>
          <p className="text-slate-500 mt-2">Past recommendations and debates.</p>
        </div>

        <div className="grid gap-4">
          {!history?.length ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-slate-500">
                You have no past recommendations yet.
              </CardContent>
            </Card>
          ) : (
            history.map((session, idx) => {
              const input = typeof session.input_data === 'string' ? JSON.parse(session.input_data) : session.input_data;
              const output = typeof session.output_data === 'string' ? JSON.parse(session.output_data) : session.output_data;
              
              return (
                <Card key={idx} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex justify-between">
                      <span>{new Date(session.created_at).toLocaleDateString()}</span>
                      <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {input?.content_mode === 'kids' ? 'Kids Mode' : 'General'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="font-semibold text-slate-700">Mood:</span> {input?.mood}
                    </div>
                    {output?.recommendations && (
                      <div>
                        <span className="font-semibold text-slate-700">Recommended:</span>
                        <div className="mt-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                          {output.recommendations.join(", ")}
                        </div>
                      </div>
                    )}
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
