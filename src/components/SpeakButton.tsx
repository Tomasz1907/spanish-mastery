import {
  speak,
  speechSupported,
  useSpeakingId,
  type SpeechLang,
} from "../lib/speech";

const LABELS: Record<SpeechLang, string> = {
  es: "Listen in Spanish",
  pl: "Listen in Polish",
  en: "Listen in English",
};

// Ikona głośnika - czyta podany tekst w wybranym języku
function SpeakButton({
  text,
  lang = "es",
  size = "md",
  className = "",
}: {
  text: string;
  lang?: SpeechLang;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const id = `${lang}:${text}`;
  const speaking = useSpeakingId() === id;

  if (!speechSupported || !text) return null;

  const dims = {
    sm: "h-7 w-7 [&>svg]:h-3.5 [&>svg]:w-3.5",
    md: "h-9 w-9 [&>svg]:h-[18px] [&>svg]:w-[18px]",
    lg: "h-12 w-12 [&>svg]:h-6 [&>svg]:w-6",
  }[size];

  return (
    <button
      type="button"
      onClick={(e) => {
        // przycisk bywa wewnątrz klikalnych kart - nie przekazujemy kliknięcia dalej
        e.stopPropagation();
        speak(text, lang, id);
      }}
      aria-label={`${LABELS[lang]}: ${text}`}
      title={LABELS[lang]}
      className={`inline-grid shrink-0 place-items-center rounded-full border transition hover:-translate-y-0.5 hover:border-accent active:scale-90 ${
        speaking
          ? "animate-speaking border-accent bg-accent text-black"
          : "border-line bg-surface text-heading"
      } ${dims} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M19 5a10 10 0 0 1 0 14" />
      </svg>
    </button>
  );
}

export default SpeakButton;
