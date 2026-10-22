import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const ITEMS = [
  { path: "/", label: "Planner" },
  { path: "/plan", label: "Plan" },
  { path: "/profile", label: "Profile" },
  { path: "/achievements", label: "Achievements" },
  { path: "/history", label: "History" },
];

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {!open && (
        <button
          type="button"
          className="mobile-menu-button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          ☰
        </button>
      )}
      {open && (
        <div className="mobile-menu-overlay" onClick={() => setOpen(false)} />
      )}
      {open && (
        <aside className="sidebar" role="dialog" aria-label="Menu">
          <div className="sidebar-header-row">
            <h2>Menu</h2>
            <button
              type="button"
              className="sidebar-close-btn"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
          {ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="sidebar-menu-item"
              aria-current={location.pathname === item.path ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </aside>
      )}
    </>
  );
}
