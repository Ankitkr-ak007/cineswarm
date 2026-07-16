"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
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
  const [messages, setMessages] = useState<Record<string, AgentMessage>>({});
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        
        switch (data.type) {
          case "agent_start":
            setMessages(prev => ({
              ...prev,
              [data.agent]: { agent: data.agent, content: "", isComplete: false }
            }));
            break;
            
          case "agent_stream":
            setMessages(prev => {
              const current = prev[data.agent];
              if (!current) return prev;
              return {
                ...prev,
                [data.agent]: { ...current, content: current.content + data.chunk }
              };
            });
            break;
            
          case "agent_end":
            setMessages(prev => {
              const current = prev[data.agent];
              if (!current) return prev;
              return {
                ...prev,
                [data.agent]: { ...current, isComplete: true }
              };
            });
            break;
            
          case "final_result":
            setFinalResult(data.result);
            ws.close();
            break;
            
          case "error":
            setError(data.message);
            break;
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

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Live Swarm Debate</h1>
        <p className="text-slate-500 mt-2">Session ID: {sessionId}</p>
      </div>

      <DualRatingDisplay 
        actualRating={finalResult?.actual_rating} 
        consensusScore={finalResult?.consensus_score} 
        finalized={!!finalResult} 
      />

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-6" ref={scrollRef}>
            <div className="space-y-6">
              {agentList.map((msg, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <Avatar className="mt-1">
                    <AvatarFallback className="bg-slate-800 text-white font-bold text-xs uppercase">
                      {msg.agent.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize text-sm">{msg.agent}</span>
                      {!msg.isComplete && (
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none text-slate-800 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {finalResult && (
                <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center space-y-4">
                  <h3 className="text-xl font-bold text-green-900">Recommendation Reached</h3>
                  <div className="text-green-800 font-medium">
                    {finalResult.recommendations?.join(", ")}
                  </div>
                  <p className="text-green-700 italic">&quot;{finalResult.explanation}&quot;</p>
                  
                  {/* Feedback Section */}
                  <div className="mt-6 pt-6 border-t border-green-200">
                    <h4 className="text-sm font-semibold text-green-800 mb-4">How was this recommendation?</h4>
                    <div className="flex gap-4 justify-center">
                      <button 
                        onClick={async () => {
                          const { error } = await apiClient.POST("/api/v1/feedback", {
                            body: { session_id: sessionId, feedback_type: "thumbs_up" }
                          });
                          if (!error) alert("Thanks for your feedback!");
                          else alert("Failed to submit feedback.");
                        }}
                        className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-md font-medium transition-colors"
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
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 rounded-md font-medium transition-colors"
                      >
                        👎 Bad
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DebatePage() {
  const params = useParams();
  const sessionId = params.session_id as string;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50">
        <DebateViewInner sessionId={sessionId} />
      </div>
    </ErrorBoundary>
  );
}
