"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { Film } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const GENRES = ["Action", "Comedy", "Drama", "Sci-Fi", "Horror", "Romance", "Animation", "Family"];

export default function RequestForm() {
  const router = useRouter();
  const [mood, setMood] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await apiClient.POST("/api/v1/recommend", {
        body: {
          mood,
          genres: selectedGenres
        }
      });
      
      if (error) {
        console.error("API error", error);
        alert("Failed to submit request");
        setLoading(false);
        return;
      }
      
      if (data?.session_id) {
        router.push(`/debate/${data.session_id}`);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300" suppressHydrationWarning>
      {/* Header bar */}
      <header className="w-full border-b border-slate-200 dark:border-slate-850 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐝</span>
            <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">CineSwarm</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Request Form container */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-2xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 backdrop-blur-sm transition-all duration-300">
          <CardHeader className="text-center pb-8 border-b border-slate-150 dark:border-slate-850">
            <div className="mx-auto bg-blue-100 dark:bg-blue-950/50 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-blue-200 dark:border-blue-800/30">
              <Film className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">CineSwarm</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-base md:text-lg mt-1.5">
              AI Agents Debate What You Should Watch
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Mood input */}
              <div className="space-y-3">
                <Label htmlFor="mood" className="text-base font-bold text-slate-700 dark:text-slate-300">How are you feeling?</Label>
                <Input
                  id="mood"
                  placeholder="e.g. I want something mind-bending but not too dark..."
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="h-12 text-base bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus-visible:ring-blue-500 rounded-xl"
                  required
                />
              </div>

              {/* Genres list selector */}
              <div className="space-y-3">
                <Label className="text-base font-bold text-slate-700 dark:text-slate-300">Preferred Genres</Label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(genre => (
                    <Button
                      key={genre}
                      type="button"
                      variant={selectedGenres.includes(genre) ? "default" : "outline"}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                        selectedGenres.includes(genre) 
                          ? "bg-blue-600 text-white dark:bg-blue-500" 
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/60"
                      }`}
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl transition-all shadow-md" 
                disabled={loading || !mood}
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                    Initializing Swarm...
                  </span>
                ) : "Find Me a Movie"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
