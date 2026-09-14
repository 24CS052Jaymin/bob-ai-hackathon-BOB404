export function ScoreRing({ score, size = 92 }: { score: number; size?: number }) {
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(#59c4bd ${score * 3.6}deg, #e9f0ef 0deg)` }}
    >
      <div className="grid place-items-center rounded-full bg-card" style={{ width: size - 14, height: size - 14 }}>
        <span className="font-display text-xl font-extrabold">{score}</span>
        <span className="mt-[-4px] text-[9px] font-semibold text-muted-foreground">/100</span>
      </div>
    </div>
  );
}
