"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DualRatingDisplay } from "@/components/DualRatingDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiClient } from "@/lib/api-client";

interface AgentMessage {
  agent: string;
  content: string;
  isComplete: boolean;
}

interface FinalResult {
  actual_rating?: number;
  consensus_score?: number;
  recommendations?: string[];
  explanation?: string;
}

function DebateViewInner({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Record<string, AgentMessage>>({});
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [movieMetadata, setMovieMetadata] = useState<any>(null);
  const [trailerExpanded, setTrailerExpanded] = useState(false);
  const [recommendingSimilar, setRecommendingSimilar] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages update
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000";
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/${sessionId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.status === "movie_info") {
          setMovieMetadata(data.movie_metadata);
          return;
        }

        if (data.error && !data.agent) {
          setError(data.error);
          return;
        }

        if (data.status === "done") {
          ws.close();
          return;
        }

        if (data.status === "complete" && data.agent) {
          if (data.agent === "consensus") {
            setFinalResult(data.data);
          } else {
            // Format the object into a readable string
            let content = "";
            if (data.data) {
              if (data.data.reasoning) content += `${data.data.reasoning}\n\n`;
              if (data.data.verdict) content += `Verdict: ${data.data.verdict} (Score: ${data.data.score}/10)`;
              if (data.data.vibe_analysis) content += `${data.data.vibe_analysis}\n\nMatch Score: ${data.data.mood_match_score}/10`;
              if (data.data.gem_analysis) content += `${data.data.gem_analysis}\n\nIs Hidden Gem: ${data.data.is_hidden_gem ? 'Yes' : 'No'}`;
              
              if (!content && typeof data.data === 'string') content = data.data;
              if (!content) content = JSON.stringify(data.data, null, 2);
            }
            if (data.error) {
              content = `Error: ${data.error}`;
            }

            setMessages(prev => ({
              ...prev,
              [data.agent]: { agent: data.agent, content, isComplete: true }
            }));
          }
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onerror = (e) => {
      console.error("WebSocket error:", e);
      setError("WebSocket connection failed");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [sessionId]);

  if (error) {
    throw new Error(error); // Trigger ErrorBoundary
  }

  const agentList = Object.values(messages);
  const isLoadingMovie = !movieMetadata && !error;

  return (
    <div className="relative min-h-screen bg-slate-900 text-slate-100 overflow-x-hidden font-sans">
      {/* Backdrop Hero (dimmed/blurred wide background) */}
      {movieMetadata?.backdrop_path && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-[0.12] blur-2xl scale-105 transition-opacity duration-1000"
          style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w1280${movieMetadata.backdrop_path})` }}
        />
      )}

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 relative z-10">
        {/* Header navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push("/")}>
            <span className="text-2xl">🐝</span>
            <h1 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
              CineSwarm <span className="sr-only">Live Swarm Debate</span>
            </h1>
          </div>
          <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">Debate Mode</span>
        </div>

        {/* Debating Movie Metadata (Task 3) */}
        {isLoadingMovie ? (
          <div className="bg-slate-800/50 backdrop-blur-md rounded-3xl p-6 border border-slate-800/80 flex flex-col md:flex-row gap-8 items-start animate-pulse">
            <div className="w-full md:w-48 shrink-0 rounded-2xl bg-slate-800 aspect-[2/3]" />
            <div className="flex-1 space-y-4 w-full pt-4">
              <div className="h-4 bg-slate-800 rounded-full w-24" />
              <div className="h-8 bg-slate-800 rounded-full w-3/4" />
              <div className="h-4 bg-slate-800 rounded-full w-1/2" />
              <div className="space-y-2 pt-2">
                <div className="h-3 bg-slate-800 rounded-full w-full" />
                <div className="h-3 bg-slate-800 rounded-full w-full" />
                <div className="h-3 bg-slate-800 rounded-full w-5/6" />
              </div>
            </div>
          </div>
        ) : movieMetadata ? (
          <div className="bg-slate-800/40 backdrop-blur-md rounded-3xl p-6 border border-slate-800/80 flex flex-col md:flex-row gap-8 items-start shadow-2xl relative overflow-hidden transition-all duration-500">
            {/* Poster wrapper */}
            <div className="w-full md:w-48 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-800 aspect-[2/3] relative">
              {movieMetadata.poster_path ? (
                <img 
                  src={`https://image.tmdb.org/t/p/w500${movieMetadata.poster_path}`} 
                  alt={movieMetadata.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                  <span className="text-4xl">🎬</span>
                  <span className="text-xs font-semibold mt-2">No Poster</span>
                </div>
              )}
            </div>

            {/* Movie metadata details */}
            <div className="flex-1 space-y-4 pt-2">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">Now Debating</span>
                <h2 className="text-3xl font-black text-white tracking-tight mt-2.5">{movieMetadata.title}</h2>
                {movieMetadata.release_date && (
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    Released: {new Date(movieMetadata.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Cast Chips (Task 4) */}
              {movieMetadata.cast && movieMetadata.cast.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Starring</p>
                  <div className="flex flex-wrap gap-1.5">
                    {movieMetadata.cast.map((actor: string, idx: number) => (
                      <span key={idx} className="text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700/50 px-2.5 py-1 rounded-full">
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Overview (Task 4) */}
              {movieMetadata.overview && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overview</p>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">{movieMetadata.overview}</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Dual Rating Display */}
        <div className="bg-slate-850/50 rounded-2xl border border-slate-800 p-1">
          <DualRatingDisplay 
            actualRating={finalResult?.actual_rating} 
            consensusScore={finalResult?.consensus_score} 
            finalized={!!finalResult} 
          />
        </div>

        {/* Live Swarm Debate Message Board */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">Live Swarm Debate</h3>
          <Card className="border border-slate-800/80 bg-slate-900/80 backdrop-blur-md shadow-2xl overflow-hidden rounded-3xl">
            <CardContent className="p-0">
              <ScrollArea className="h-[450px] p-6" ref={scrollRef}>
                <div className="space-y-6">
                  {agentList.length === 0 && (
                    <div className="h-[350px] flex flex-col items-center justify-center text-center space-y-4">
                      <div className="flex space-x-2">
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
                      </div>
                      <p className="text-sm text-slate-400">Agents are analyzing the film metadata...</p>
                    </div>
                  )}

                  {agentList.map((msg, i) => {
                    const isRoger = msg.agent.toLowerCase() === "critic";
                    const isAura = msg.agent.toLowerCase() === "vibes";
                    const isPixel = msg.agent.toLowerCase() === "hidden_gems";
                    const name = isRoger ? "Roger (Critic)" : isAura ? "Aura (Vibes)" : isPixel ? "Pixel (Gems)" : msg.agent;
                    const avatarColor = isRoger ? "bg-red-500/20 text-red-400 border-red-500/30" : isAura ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : isPixel ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-slate-700/20 text-slate-400 border-slate-700/30";

                    return (
                      <div key={i} className="flex gap-4 items-start animate-fade-in">
                        <Avatar className="mt-1 h-9 w-9 border shrink-0">
                          <AvatarFallback className={`${avatarColor} font-black text-xs uppercase`}>
                            {msg.agent.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white capitalize">{name}</span>
                            {!msg.isComplete && (
                              <span className="flex h-1.5 w-1.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                              </span>
                            )}
                          </div>
                          <div className="bg-slate-800/50 border border-slate-800/80 p-4 rounded-2xl rounded-tl-none text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {finalResult && (
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-6 rounded-2xl space-y-5 animate-fade-in relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 text-emerald-500/30 text-3xl font-black select-none uppercase tracking-widest">HOST</div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">Debate Verdict</span>
                        <h4 className="text-lg font-bold text-white mt-1">Lex (Consensus Moderator)</h4>
                      </div>
                      
                      <p className="text-slate-300 text-sm italic leading-relaxed whitespace-pre-wrap">&quot;{finalResult.explanation}&quot;</p>
                      
                      {/* Recommendations List (Task 3 / 4) */}
                      {finalResult.recommendations && finalResult.recommendations.length > 0 && (
                        <div className="pt-4 border-t border-emerald-500/10 space-y-2">
                          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Suggested Similar Watchlist</p>
                          <div className="text-sm font-semibold text-slate-200">
                            {finalResult.recommendations.join(" • ")}
                          </div>
                        </div>
                      )}

                      {/* Feedback Section */}
                      <div className="mt-6 pt-4 border-t border-emerald-500/10">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">How was Roger, Aura & Pixel&apos;s debate?</h4>
                          <div className="flex gap-2">
                            <button 
                              onClick={async () => {
                                const { error } = await apiClient.POST("/api/v1/feedback", {
                                  body: { session_id: sessionId, feedback_type: "thumbs_up" }
                                });
                                if (!error) alert("Thanks for your feedback!");
                                else alert("Failed to submit feedback.");
                              }}
                              className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20 transition-all cursor-pointer"
                            >
                              👍 Good
                            </button>
                            <button 
                              onClick={async () => {
                                const { error } = await apiClient.POST("/api/v1/feedback", {
                                  body: { session_id: sessionId, feedback_type: "thumbs_down" }
                                });
                                if (!error) alert("Thanks for your feedback!");
                                else alert("Failed to submit feedback.");
                              }}
                              className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold border border-rose-500/20 transition-all cursor-pointer"
                            >
                              👎 Bad
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Task 4 Advanced Features: Trailer and Watch Providers */}
        {movieMetadata && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Trailer Card */}
            {movieMetadata.trailer_key && (
              <Card className="border border-slate-800/80 bg-slate-900/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-white uppercase tracking-widest flex items-center gap-2">
                      <span>📺</span> Movie Trailer
                    </h3>
                    <button 
                      onClick={() => setTrailerExpanded(!trailerExpanded)}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      {trailerExpanded ? "Hide Player" : "Watch Trailer"}
                    </button>
                  </div>
                  
                  {trailerExpanded && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-850 shadow-2xl bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${movieMetadata.trailer_key}`}
                        title="Official Trailer"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Watch Providers Card */}
            {movieMetadata.watch_providers && (
              <Card className="border border-slate-800/80 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-lg">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-black text-sm text-white uppercase tracking-widest flex items-center gap-2">
                    <span>🚀</span> Streaming Options (US)
                  </h3>
                  {movieMetadata.watch_providers.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {movieMetadata.watch_providers.map((provider: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5 bg-slate-800/50 border border-slate-750 p-1.5 pr-3.5 rounded-xl shadow-sm hover:border-slate-600 transition-colors">
                          {provider.logo_path ? (
                            <img 
                              src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} 
                              alt={provider.name}
                              className="w-7 h-7 rounded-md object-contain border border-slate-700"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-slate-750 flex items-center justify-center text-[10px] font-bold">▶</div>
                          )}
                          <span className="text-xs font-bold text-slate-200">{provider.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No flatrate streaming provider found in US region.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Similar Movies Carousel (Task 4) */}
        {movieMetadata?.similar_movies && movieMetadata.similar_movies.length > 0 && (
          <div className="space-y-4 pt-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">You Might Also Like</h3>
            
            {recommendingSimilar ? (
              <div className="h-[200px] flex items-center justify-center text-slate-400">
                <div className="flex space-x-2 items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <span className="text-xs font-bold ml-2">Asking swarm for recommendations...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {movieMetadata.similar_movies.map((movie: any, idx: number) => (
                  <div 
                    key={idx}
                    onClick={async () => {
                      setRecommendingSimilar(true);
                      setError(null);
                      setFinalResult(null);
                      setMessages({});
                      setMovieMetadata(null);
                      
                      try {
                        const { data, error: apiErr } = await apiClient.POST("/api/v1/recommend", {
                          body: { mood: `Recommend similar movie: ${movie.title}`, genres: [] }
                        });
                        if (apiErr) {
                          alert("Failed to submit request");
                          setRecommendingSimilar(false);
                        } else if (data?.session_id) {
                          router.push(`/debate/${data.session_id}`);
                          setRecommendingSimilar(false);
                        }
                      } catch (err) {
                        console.error(err);
                        setRecommendingSimilar(false);
                      }
                    }}
                    className="group cursor-pointer space-y-2 border border-slate-800/80 bg-slate-900/40 p-2.5 rounded-2xl hover:border-slate-700/50 hover:bg-slate-800/40 transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-800 relative shadow-md">
                      {movie.poster_path ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`} 
                          alt={movie.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 p-2 text-center bg-slate-900">
                          <span className="text-2xl">🎬</span>
                          <span className="text-[10px] font-bold mt-1 leading-tight">No Poster</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-black text-slate-300 truncate text-center px-1 group-hover:text-blue-400 transition-colors">
                      {movie.title}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DebatePage() {
  const params = useParams();
  const sessionId = params.session_id as string;

  return (
    <ErrorBoundary>
      <DebateViewInner sessionId={sessionId} />
    </ErrorBoundary>
  );
}
