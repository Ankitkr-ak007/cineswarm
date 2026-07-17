"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { Film } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center" suppressHydrationWarning>
      <Card className="w-full max-w-2xl shadow-lg border-0 bg-white">
        <CardHeader className="text-center pb-8 border-b">
          <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-800">CineSwarm</CardTitle>
          <CardDescription className="text-lg">AI Agents Debate What You Should Watch</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="mood" className="text-base font-semibold">How are you feeling?</Label>
              <Input
                id="mood"
                placeholder="e.g. I want something mind-bending but not too dark..."
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="h-12 text-base"
                required
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Preferred Genres</Label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => (
                  <Button
                    key={genre}
                    type="button"
                    variant={selectedGenres.includes(genre) ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                  </Button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={loading || !mood}>
              {loading ? "Initializing Swarm..." : "Find Me a Movie"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
