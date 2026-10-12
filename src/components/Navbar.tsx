import { Link, NavLink, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { User } from "firebase/auth";

import { useAuth } from "../context/AuthContext";
import { isFirebaseConfigured } from "../lib/firebase";
import { logout } from "../lib/auth";
import SoundControl, { SoundSettings } from "./SoundControl";

const links = [
  { name: "Home", path: "/", icon: "🏠" },
  { name: "Learn", path: "/learn", icon: "📖" },
  { name: "Quiz", path: "/quiz", icon: "🎯" },
  { name: "Test", path: "/test", icon: "✍️" },
  { name: "Tag Sort", path: "/tag-sort", icon: "🏷️" },
  { name: "Match Chaos", path: "/match-chaos", icon: "⚡" },
  { name: "Type Race", path: "/type-race", icon: "🏎️" },
];

function Avatar({ user, size = "sm" }: { user: User; size?: "sm" | "lg" }) {
  const name = user.displayName || user.email || "User";
  const dims = size === "lg" ? "h-12 w-12 text-lg" : "h-7 w-7 text-xs";

  return user.photoURL ? (
    <img
      src={user.photoURL}
      alt=""
      referrerPolicy="no-referrer"
      className={`${dims} shrink-0 rounded-full`}
    />
  ) : (
    <span
      className={`${dims} grid shrink-0 place-items-center rounded-full bg-accent font-bold text-black`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

const iconButton =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-base text-heading transition hover:-translate-y-0.5 hover:border-accent active:scale-95";

// ── MENU WYSUWANE (telefon / tablet) ─────────────────────────────────────

function Drawer({
  open,
  onClose,
  dark,
  onToggleTheme,
}: {
  open: boolean;
  onClose: () => void;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const { user } = useAuth();

  // Escape zamyka, a strona pod spodem się nie przewija
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 xl:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade"
      />

      <aside className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col overflow-y-auto border-l border-line bg-surface text-left shadow-card animate-drawer">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="flex items-center gap-2 font-bold text-heading">
            <span className="text-xl">🇪🇸</span> Menu
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className={iconButton}
          >
            ✕
          </button>
        </div>

        {user && (
          <Link
            to="/profile"
            onClick={onClose}
            className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-3 transition hover:ring-2 hover:ring-accent"
          >
            <Avatar user={user} size="lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-heading">
                {user.displayName || "Your profile"}
              </span>
              <span className="block truncate text-xs">{user.email}</span>
              <span className="mt-0.5 block text-xs font-semibold text-accent-strong">
                View profile →
              </span>
            </span>
          </Link>
        )}

        <nav className="mt-3 flex flex-col gap-1 px-3">
          {links.map((link, i) => (
            <NavLink
              key={link.path}
              to={link.path}
              end
              onClick={onClose}
              style={{ "--i": i } as CSSProperties}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition animate-rise ${
                  isActive
                    ? "bg-accent text-black"
                    : "text-heading hover:bg-accent-soft"
                }`
              }
            >
              <span className="w-6 text-center text-lg">{link.icon}</span>
              {link.name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 flex flex-col gap-4 border-t border-line px-5 py-4">
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-between rounded-xl text-sm font-semibold text-heading"
          >
            <span>{dark ? "Dark theme" : "Light theme"}</span>
            <span className={iconButton}>{dark ? "🌙" : "☀️"}</span>
          </button>

          <SoundSettings />
        </div>

        {user && (
          <button
            onClick={() => {
              onClose();
              void logout();
            }}
            className="mx-4 mb-6 mt-auto flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 font-semibold text-heading transition hover:border-bad hover:bg-bad-soft hover:text-bad"
          >
            <LogoutIcon /> Log out
          </button>
        )}
      </aside>
    </div>
  );
}

// ── PASEK GÓRNY ──────────────────────────────────────────────────────────

function Navbar() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);

    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const toggleTheme = () => setDark((prev) => !prev);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const showUser = isFirebaseConfigured && !loading;

  return (
    <>
      <nav className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-page/85 px-4 py-3 backdrop-blur-md sm:px-6">
        <NavLink
          to="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold text-heading transition hover:scale-[1.03]"
        >
          <span className="text-2xl">🇪🇸</span>
          <span className="hidden min-[380px]:inline">Spanish Mastery</span>
        </NavLink>

        {/* duży ekran: wszystko w jednej linii */}
        <div className="hidden items-center gap-1 xl:flex">
          {links.slice(1).map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-accent text-black"
                    : "text-body hover:bg-accent-soft hover:text-heading"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}

          <SoundControl />

          <button
            onClick={toggleTheme}
            aria-label={dark ? "Light theme" : "Dark theme"}
            title={dark ? "Light theme" : "Dark theme"}
            className={`ml-1 ${iconButton}`}
          >
            {dark ? "☀️" : "🌙"}
          </button>

          {showUser && !user && (
            <Link
              to="/login"
              state={{ from: location.pathname }}
              className="ml-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-black transition hover:brightness-110 active:scale-95"
            >
              Log in
            </Link>
          )}

          {showUser && user && (
            <>
              <NavLink
                to="/profile"
                title="Your profile"
                className={({ isActive }) =>
                  `ml-2 flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium text-heading transition hover:border-accent ${
                    isActive
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface"
                  }`
                }
              >
                <Avatar user={user} />
                <span className="max-w-28 truncate">
                  {user.displayName || user.email || "User"}
                </span>
              </NavLink>

              <button
                onClick={() => void logout()}
                aria-label="Log out"
                title="Log out"
                className={`ml-1 ${iconButton} hover:border-bad hover:text-bad`}
              >
                <LogoutIcon />
              </button>
            </>
          )}
        </div>

        {/* telefon / tablet: awatar + przycisk menu */}
        <div className="flex items-center gap-2 xl:hidden">
          {showUser && user && (
            <NavLink
              to="/profile"
              aria-label="Your profile"
              className="rounded-full transition active:scale-95"
            >
              <Avatar user={user} />
            </NavLink>
          )}

          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className={iconButton}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M10 17h10" />
            </svg>
          </button>
        </div>
      </nav>

      <Drawer
        open={menuOpen}
        onClose={closeMenu}
        dark={dark}
        onToggleTheme={toggleTheme}
      />
    </>
  );
}

export default Navbar;
