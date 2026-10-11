import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { isFirebaseConfigured } from "../lib/firebase";
import { logout } from "../lib/auth";

const links = [
  {
    name: "Home",
    path: "/",
  },
  {
    name: "Quiz",
    path: "/quiz",
  },
  {
    name: "Test",
    path: "/test",
  },
  {
    name: "Tag Sort",
    path: "/tag-sort",
  },
  {
    name: "Match Chaos",
    path: "/match-chaos",
  },
  {
    name: "Type Race",
    path: "/type-race",
  },
];

function UserMenu() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!isFirebaseConfigured || loading) return null;

  if (!user) {
    return (
      <Link
        to="/login"
        state={{ from: location.pathname }}
        className="ml-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-black transition hover:brightness-110 active:scale-95"
      >
        Log in
      </Link>
    );
  }

  const name = user.displayName || user.email || "User";

  return (
    <div className="ml-2 flex items-center gap-2">
      <span
        title={user.email ?? undefined}
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm font-medium text-heading"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 rounded-full"
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-xs font-bold text-black">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="max-w-32 truncate">{name}</span>
      </span>

      <button
        onClick={() => logout()}
        className="rounded-full px-3 py-1.5 text-sm font-medium text-body transition hover:bg-bad-soft hover:text-bad"
      >
        Log out
      </button>
    </div>
  );
}

function Navbar() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);

    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <nav className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-page/85 px-6 py-4 backdrop-blur-md">
      <NavLink
        to="/"
        className="flex items-center gap-2 text-lg font-bold text-heading"
      >
        <span className="text-2xl">🇪🇸</span>
        Spanish Mastery
      </NavLink>

      <div className="flex flex-wrap items-center gap-1">
        {links.slice(1).map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-accent text-black"
                  : "text-body hover:bg-accent-soft hover:text-heading"
              }`
            }
          >
            {link.name}
          </NavLink>
        ))}

        <button
          onClick={() => setDark((prev) => !prev)}
          aria-label={dark ? "Light theme" : "Dark theme"}
          title={dark ? "Light theme" : "Dark theme"}
          className="ml-2 grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-base transition hover:border-accent active:scale-95"
        >
          {dark ? "☀️" : "🌙"}
        </button>

        <UserMenu />
      </div>
    </nav>
  );
}

export default Navbar;
