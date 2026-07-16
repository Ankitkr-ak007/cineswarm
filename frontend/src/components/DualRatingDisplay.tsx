export function DualRatingDisplay({
  actualRating,
  consensusScore,
  finalized
}: {
  actualRating?: number;
  consensusScore?: number;
  finalized: boolean;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-6 justify-center items-center p-6 bg-slate-900 text-white rounded-2xl shadow-xl my-8">
      <div className="flex flex-col items-center">
        <span className="text-sm text-slate-400 uppercase tracking-widest font-semibold mb-2">TMDB Rating</span>
        <div className="text-5xl font-black text-blue-400">
          {actualRating !== undefined ? actualRating.toFixed(1) : "--"}
          <span className="text-2xl text-blue-400/50">/10</span>
        </div>
      </div>
      
      <div className="hidden md:block w-px h-16 bg-slate-700"></div>
      
      <div className="flex flex-col items-center">
        <span className="text-sm text-slate-400 uppercase tracking-widest font-semibold mb-2">Swarm Consensus</span>
        <div className={`text-5xl font-black ${finalized ? "text-green-400" : "text-amber-400 animate-pulse"}`}>
          {consensusScore !== undefined ? consensusScore.toFixed(1) : "--"}
          <span className="text-2xl opacity-50">/10</span>
        </div>
      </div>
    </div>
  );
}
