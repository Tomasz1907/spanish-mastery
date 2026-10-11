import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

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
      </div>
    </nav>
  );
}

export default Navbar;
