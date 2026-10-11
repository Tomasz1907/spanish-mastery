import { useAuth } from "../context/AuthContext";
import {
  bestKey,
  formatMode,
  GAMES,
  LEADERBOARD_SIZE,
  timeAgo,
  useLeaderboard,
  useUserProfile,
  type GameId,
  type LeaderboardError,
} from "../lib/progress";
import { Panel } from "./GameUI";

const MEDALS = ["🥇", "🥈", "🥉"];

function Avatar({ name, photoURL }: { name: string; photoURL: string | null }) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className="h-8 w-8 shrink-0 rounded-full"
      />
    );
  }

  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

const NOTICES: Record<
  LeaderboardError,
  { icon: string; title: string; text: string }
> = {
  preparing: {
    icon: "🛠️",
    title: "The ranking is being prepared",
    text: "This usually takes a few minutes. It will appear here automatically — you can keep playing in the meantime.",
  },
  offline: {
    icon: "📡",
    title: "You seem to be offline",
    text: "Check your internet connection and try again.",
  },
  denied: {
    icon: "🔒",
    title: "The ranking isn't available right now",
    text: "Try logging out and back in. If it keeps happening, the ranking may still be setting up.",
  },
  unknown: {
    icon: "😕",
    title: "Couldn't load the ranking",
    text: "Something went wrong on our side. Please try again in a moment.",
  },
};

function LeaderboardNotice({
  error,
  onRetry,
}: {
  error: LeaderboardError;
  onRetry: () => void;
}) {
  const notice = NOTICES[error];
  const preparing = error === "preparing";

  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 rounded-2xl bg-surface-2 px-6 py-8 text-center"
    >
      <span className={`text-4xl ${preparing ? "animate-float" : ""}`}>
        {notice.icon}
      </span>
      <p className="font-semibold text-heading">{notice.title}</p>
      <p className="max-w-sm text-sm">{notice.text}</p>

      {preparing ? (
        <span className="mt-2 flex items-center gap-2 text-xs">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-soft border-t-accent" />
          Checking again automatically...
        </span>
      ) : (
        <button
          onClick={onRetry}
          className="mt-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-heading transition hover:border-accent active:scale-95"
        >
          Try again
        </button>
      )}
    </div>
  );
}

function Leaderboard({
  game,
  mode,
  note,
}: {
  game: GameId;
  mode: string;
  note?: string;
}) {
  const { user } = useAuth();
  const { entries, loading, error, retry } = useLeaderboard(game, mode);
  const { profile } = useUserProfile();

  const unit = GAMES[game].bestUnit;
  const myBest = profile?.best?.[bestKey(game, mode)];
  const iAmListed = entries.some((e) => e.uid === user?.uid);

  return (
    <Panel className="mx-auto mt-6 max-w-2xl text-left">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">🏆 Top {LEADERBOARD_SIZE} scores</h2>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium">
          {formatMode(game, mode)}
        </span>
      </div>

      {loading && (
        <p className="py-6 text-center text-sm">Loading ranking...</p>
      )}

      {error && <LeaderboardNotice error={error} onRetry={retry} />}

      {!loading && !error && entries.length === 0 && (
        <p className="py-6 text-center text-sm">
          No scores yet — be the first on the board!
        </p>
      )}

      {entries.length > 0 && (
        <ol className="flex flex-col gap-1.5">
          {entries.map((e, i) => {
            const isMe = e.uid === user?.uid;

            return (
              <li
                key={e.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  isMe
                    ? "bg-accent-soft ring-2 ring-accent"
                    : i < 3
                      ? "bg-surface-2"
                      : ""
                }`}
              >
                <span className="w-8 shrink-0 text-center font-bold tabular-nums text-heading">
                  {MEDALS[i] ?? i + 1}
                </span>
                <Avatar name={e.name} photoURL={e.photoURL} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-heading">
                    {e.name}
                    {isMe && (
                      <span className="ml-1 text-xs font-normal">(you)</span>
                    )}
                  </span>
                  <span className="block text-xs">{timeAgo(e.createdAt)}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums text-heading">
                  {e.value}
                  {unit}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* gracz spoza top 10 widzi swój wynik pod listą */}
      {!loading && !iAmListed && myBest !== undefined && user && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2">
          <span className="w-8 shrink-0 text-center">…</span>
          <Avatar name={user.displayName || "You"} photoURL={user.photoURL} />
          <span className="flex-1 font-medium text-heading">Your best</span>
          <span className="font-bold tabular-nums text-heading">
            {myBest}
            {unit}
          </span>
        </div>
      )}

      {note && <p className="mt-4 text-xs">{note}</p>}
    </Panel>
  );
}

export default Leaderboard;
