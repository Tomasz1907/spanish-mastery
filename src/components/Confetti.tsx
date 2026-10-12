import { useState, type CSSProperties } from "react";

const COLORS = [
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

type Piece = {
  left: number;
  dx: number;
  rot: number;
  dur: number;
  delay: number;
  color: string;
};

// losowanie poza renderem - wywoływane raz w inicjalizatorze stanu
function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    dx: (Math.random() - 0.5) * 240,
    rot: (Math.random() - 0.5) * 1080,
    dur: 1.8 + Math.random() * 1.6,
    delay: Math.random() * 0.4,
    color: COLORS[i % COLORS.length],
  }));
}

// Krótki deszcz konfetti nad ekranem (np. przy nowym rekordzie)
function Confetti({ count = 60 }: { count?: number }) {
  const [pieces] = useState(() => makePieces(count));

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              "--dx": `${p.dx}px`,
              "--rot": `${p.rot}deg`,
              "--dur": `${p.dur}s`,
              "--delay": `${p.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default Confetti;
