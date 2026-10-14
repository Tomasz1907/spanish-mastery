import { LEVEL_NAMES, type CefrLevel } from "../lib/tags";

// Etykieta poziomu CEFR (A1–B2) - tekst + kolor, więc nie polega na samym kolorze
function LevelBadge({
  level,
  className = "",
}: {
  level: CefrLevel;
  className?: string;
}) {
  return (
    <span
      className={`level-badge level-${level} ${className}`}
      title={`CEFR ${level} · ${LEVEL_NAMES[level]}`}
    >
      {level}
    </span>
  );
}

export default LevelBadge;
