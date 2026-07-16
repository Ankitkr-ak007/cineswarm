"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface Movie {
  id: number;
  title: string;
  overview?: string;
  certification?: string;
  vote_average?: number;
}

export default function ModerationQueue() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    // Fetch movies that are ambiguous (e.g. is_safe_for_kids is null, or requires manual review)
    const { data } = await supabase
      .from("movies")
      .select("*")
      .is("is_safe_for_kids", null)
      .limit(20);
      
    if (data) setMovies(data);
    setLoading(false);
  };

  const handleDecision = async (id: number, isSafe: boolean) => {
    await supabase
      .from("movies")
      .update({ is_safe_for_kids: isSafe })
      .eq("id", id);
      
    // Optimistic UI update
    setMovies(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Moderation Queue</h2>
        <p className="text-slate-400 mt-2">Approve or deny ambiguous titles for the Kids Mode pool.</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-slate-500">Loading queue...</p>
        ) : movies.length === 0 ? (
          <Card className="bg-slate-950 border-slate-800">
            <CardContent className="p-8 text-center text-slate-500">
              The moderation queue is empty. Good job!
            </CardContent>
          </Card>
        ) : (
          movies.map(movie => (
            <Card key={movie.id} className="bg-slate-950 border-slate-800 flex flex-row items-center justify-between p-6">
              <div>
                <h3 className="text-xl font-bold text-white">{movie.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{movie.overview?.substring(0, 150)}...</p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-slate-800 text-xs rounded-md text-slate-300">
                    Certification: {movie.certification || "Unknown"}
                  </span>
                  <span className="px-2 py-1 bg-slate-800 text-xs rounded-md text-slate-300">
                    Score: {movie.vote_average?.toFixed(1)}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 ml-4">
                <Button 
                  onClick={() => handleDecision(movie.id, true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Approve (Safe)
                </Button>
                <Button 
                  onClick={() => handleDecision(movie.id, false)}
                  variant="destructive"
                >
                  Deny (Unsafe)
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
