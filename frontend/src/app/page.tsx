"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { Film, Search, Sparkles, Tv, Flame, Star, Zap, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const GENRES = ["Action", "Comedy", "Drama", "Sci-Fi", "Horror", "Romance", "Animation", "Family"];

const POPULAR_QUICK_PICKS = [
  { title: "Stranger Things", type: "tv", emoji: "📺", desc: "Sci-Fi Thriller" },
  { title: "Inception", type: "movie", emoji: "🎬", desc: "Mind-Bending Action" },
  { title: "Breaking Bad", type: "tv", emoji: "📺", desc: "Crime Drama" },
  { title: "The Dark Knight", type: "movie", emoji: "🎬", desc: "Superhero Masterpiece" },
  { title: "Interstellar", type: "movie", emoji: "🎬", desc: "Sci-Fi Odyssey" },
  { title: "The Office", type: "tv", emoji: "📺", desc: "Comfort Comedy" },
  { title: "Dune: Part Two", type: "movie", emoji: "🎬", desc: "Epic Sci-Fi" },
  { title: "Squid Game", type: "tv", emoji: "📺", desc: "Survival Mystery" },
];

const STREAMING_PROVIDERS = [
  { name: "All Platforms", id: "all" },
  { name: "Netflix", id: "netflix" },
  { name: "Prime Video", id: "prime" },
  { name: "Disney+ Hotstar", id: "hotstar" },
  { name: "JioCinema", id: "jiocinema" },
  { name: "Apple TV+", id: "apple" },
];

const FAST_VIBES = [
  "🤯 Mind-Bending",
  "🍿 Popcorn Binge",
  "😱 Dark & Suspenseful",
  "😂 Feel-Good Comedy",
  "🎨 Visually Stunning",
  "🧠 Intellectual Thriller"
];

const SWARM_AGENTS = [
  {
    name: "Roger",
    role: "Film & Narrative Critic",
    avatar: "🎬",
    color: "from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400",
    desc: "Analyzes structural craft, pacing, and performances."
  },
  {
    name: "Aura",
    role: "Atmosphere & Vibe Architect",
    avatar: "🔮",
    color: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400",
    desc: "Matches your exact emotional mood and aesthetic."
  },
  {
    name: "Pixel",
    role: "Hidden Gem Scout",
    avatar: "💎",
    color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
    desc: "Unearths underrated masterpieces & indie classics."
  },
  {
    name: "Lex",
    role: "Consensus Host",
    avatar: "🟢",
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    desc: "Synthesizes all agent opinions into the final verdict."
  }
];

interface SavedMovie {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  created_at: string;
}

export default function RequestForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"mood" | "search">("mood");
  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [mood, setMood] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<SavedMovie[]>([]);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const { data } = await apiClient.GET("/api/v1/favorites");
        if (data) {
          setFavorites(data as SavedMovie[]);
        }
      } catch (err) {
        console.error("Failed to load favorites", err);
      }
    };
    fetchFavorites();
  }, []);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleQuickPick = async (title: string, type: string) => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.POST("/api/v1/recommend/title", {
        body: { title, media_type: type }
      });
      if (error) {
        alert("Failed to start debate for quick pick");
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

  const handleSurpriseMe = async () => {
    setLoading(true);
    const surpriseMoods = [
      "Mind-bending sci-fi masterpiece with unforgettable plot twists",
      "High-octane action thriller that keeps you on the edge of your seat",
      "Cozy feel-good comedy perfect for a relaxed weekend binge",
      "Dark atmospheric mystery series with deep character development"
    ];
    const randomMood = surpriseMoods[Math.floor(Math.random() * surpriseMoods.length)];
    try {
      const { data, error } = await apiClient.POST("/api/v1/recommend", {
        body: { mood: randomMood, genres: [], media_type: mediaType }
      });
      if (error) {
        alert("Failed to generate surprise pick");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === "mood") {
        const platformSuffix = selectedPlatform !== "all" ? ` (available on ${selectedPlatform})` : "";
        const finalMood = `${mood}${platformSuffix}`;
        const { data, error } = await apiClient.POST("/api/v1/recommend", {
          body: {
            mood: finalMood,
            genres: selectedGenres,
            media_type: mediaType
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
      } else {
        const { data, error } = await apiClient.POST("/api/v1/recommend/title", {
          body: {
            title: searchTitle,
            media_type: mediaType
          }
        });
        
        if (error) {
          console.error("API error", error);
          alert("Failed to search title");
          setLoading(false);
          return;
        }
        
        if (data?.session_id) {
          router.push(`/debate/${data.session_id}`);
        }
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleFavoriteClick = async (title: string) => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.POST("/api/v1/recommend/title", {
        body: { title, media_type: mediaType }
      });
      if (error) {
        console.error("API error starting favorite debate", error);
        alert("Failed to start debate for favorited item");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white transition-colors duration-300 relative overflow-hidden" suppressHydrationWarning>
      {/* Background ambient radial glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-0 w-[400px] h-[400px] bg-blue-600/10 blur-3xl pointer-events-none -z-10" />

      {/* Header bar */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-lg">
              🐝
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-blue-200 to-indigo-400 bg-clip-text text-transparent">
                CineSwarm
              </span>
              <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest -mt-1">
                AI Debate Discovery
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Swarm Agents Active
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-8 px-4 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider backdrop-blur-sm animate-fade-in">
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span>Next-Gen AI Agent Swarm for Movies & Web Series</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white">
          Don&apos;t Spend 30 Minutes Scrolling. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Let AI Agents Debate What You Watch.
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Four specialized AI agents clash live in real-time to review craft, atmosphere, and hidden potential — delivering your ultimate match with direct India streaming links.
        </p>

        {/* AI Swarm Agent Squad Showcase */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 max-w-4xl mx-auto">
          {SWARM_AGENTS.map((agent, i) => (
            <div 
              key={i} 
              className={`p-3.5 rounded-2xl bg-gradient-to-b ${agent.color} border backdrop-blur-md text-left transition-all hover:scale-[1.02] cursor-default`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xl">{agent.avatar}</span>
                <span className="text-[10px] font-black uppercase tracking-wider opacity-70">AGENT</span>
              </div>
              <h3 className="font-bold text-sm text-white">{agent.name}</h3>
              <p className="text-[11px] font-semibold opacity-90 mb-1">{agent.role}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{agent.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Main Form container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full">
        <Card className="w-full shadow-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-6 border-b border-slate-800/80 bg-slate-950/40">
            {/* Mode selection tabs */}
            <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setMode("mood")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  mode === "mood"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Mood AI Discover
              </button>
              <button
                type="button"
                onClick={() => setMode("search")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  mode === "search"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Direct Title Search
              </button>
              <button
                type="button"
                onClick={handleSurpriseMe}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                🎲 Surprise Me
              </button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Content Type Selector */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Film className="w-4 h-4 text-blue-400" />
                  Select Content Type
                </Label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMediaType("all")}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2 ${
                      mediaType === "all"
                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                        : "bg-slate-950/60 hover:bg-slate-800/60 text-slate-400 border-slate-800"
                    }`}
                  >
                    🍿 All (Movies & Series)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType("movie")}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2 ${
                      mediaType === "movie"
                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                        : "bg-slate-950/60 hover:bg-slate-800/60 text-slate-400 border-slate-800"
                    }`}
                  >
                    🎬 Movies Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType("tv")}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2 ${
                      mediaType === "tv"
                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                        : "bg-slate-950/60 hover:bg-slate-800/60 text-slate-400 border-slate-800"
                    }`}
                  >
                    📺 TV Shows Only
                  </button>
                </div>
              </div>

              {mode === "mood" ? (
                <>
                  {/* Mood input & Fast Vibes */}
                  <div className="space-y-3">
                    <Label htmlFor="mood" className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      How are you feeling right now?
                    </Label>
                    <Input
                      id="mood"
                      placeholder={mediaType === "tv" ? "e.g. A thrilling sci-fi series with mystery like Stranger Things..." : "e.g. A mind-bending thriller with incredible visuals..."}
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      className="h-14 text-base bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 rounded-2xl px-4"
                      required
                    />
                    
                    {/* Fast Vibe presets */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Fast Vibe Presets:</span>
                      <div className="flex flex-wrap gap-2">
                        {FAST_VIBES.map((vibe) => (
                          <button
                            key={vibe}
                            type="button"
                            onClick={() => setMood(vibe.replace(/^[^\s]+\s/, ''))}
                            className="text-xs font-semibold bg-slate-950/80 hover:bg-slate-800 hover:border-blue-500/50 text-slate-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-slate-800 flex items-center gap-1"
                          >
                            {vibe}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preferred Streaming Platforms Filter */}
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Tv className="w-4 h-4 text-indigo-400" />
                      Filter Streaming Platforms (India Region)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {STREAMING_PROVIDERS.map((provider) => (
                        <button
                          key={provider.id}
                          type="button"
                          onClick={() => setSelectedPlatform(provider.id)}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer border ${
                            selectedPlatform === provider.id
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                              : "bg-slate-950/60 hover:bg-slate-800/60 text-slate-400 border-slate-800"
                          }`}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Genres list selector */}
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Preferred Genres</Label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map(genre => (
                        <Button
                          key={genre}
                          type="button"
                          variant={selectedGenres.includes(genre) ? "default" : "outline"}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 border ${
                            selectedGenres.includes(genre) 
                              ? "bg-blue-600 text-white border-blue-500 shadow-sm" 
                              : "bg-slate-950/60 hover:bg-slate-800/60 text-slate-400 border-slate-800"
                          }`}
                          onClick={() => toggleGenre(genre)}
                        >
                          {genre}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Direct Search input */
                <div className="space-y-3">
                  <Label htmlFor="searchTitle" className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-400" />
                    Enter Movie or TV Show Title
                  </Label>
                  <Input
                    id="searchTitle"
                    placeholder={mediaType === "tv" ? "e.g. Stranger Things, Breaking Bad, The Office..." : "e.g. Inception, The Matrix, Interstellar..."}
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    className="h-14 text-base bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 rounded-2xl px-4"
                    required
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 text-base font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl transition-all shadow-xl shadow-blue-600/25 cursor-pointer flex items-center justify-center gap-2" 
                disabled={loading || (mode === "mood" ? !mood : !searchTitle)}
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                    Initializing AI Swarm Debate...
                  </span>
                ) : (
                  <>
                    <span>Launch AI Swarm Debate</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Popular Swarm Debates Quick Picks */}
        <div className="w-full mt-14 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Trending AI Swarm Debates</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Click any to jump into debate</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {POPULAR_QUICK_PICKS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickPick(item.title, item.type)}
                className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-blue-500 hover:bg-slate-800/80 transition-all text-left group cursor-pointer shadow-lg hover:shadow-blue-500/10 transform hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase">
                    {item.type === "tv" ? "TV Series" : "Movie"}
                  </span>
                </div>
                <div className="text-sm font-black text-white truncate group-hover:text-blue-400 transition-colors">
                  {item.title}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  {item.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Saved Watchlist Section */}
        {favorites.length > 0 && (
          <div className="w-full mt-14 space-y-5">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Your Saved Watchlist</span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {favorites.map((fav) => (
                <button
                  key={fav.tmdb_id}
                  onClick={() => handleFavoriteClick(fav.title)}
                  className="group relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 aspect-[2/3] hover:border-blue-500 transition-all cursor-pointer text-left shadow-lg transform hover:-translate-y-1"
                >
                  {fav.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w300${fav.poster_path}`}
                      alt={fav.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-3 text-center text-xs font-bold text-slate-400 bg-slate-950">
                      {fav.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    <span className="text-xs font-black text-white truncate">{fav.title}</span>
                    <span className="text-[10px] font-bold text-blue-400">Re-Run Debate →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500 mt-16">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>🐝</span>
            <span className="font-bold text-slate-300">CineSwarm</span>
            <span>— AI Multi-Agent Entertainment Swarm</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Free Tier Optimized (Render • Vercel • Supabase)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
