import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export function themePath(theme) {
  return `/plan/open/${encodeURIComponent(theme)}`;
}

function progress(theme) {
  const total = (theme.doneCount || 0) + (theme.openCount || 0);
  if (total === 0) return "No aims yet";
  if (theme.openCount === 0) return `${theme.doneCount} passed`;
  if (theme.doneCount === 0) return `${theme.openCount} not yet`;
  return `${theme.doneCount} passed · ${theme.openCount} not yet`;
}

export default function PlanPage() {
  const navigate = useNavigate();
  const [themes, setThemes] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    api.plans().then((rows) => {
      if (!stop) setThemes(rows || []);
    }).catch((err) => {
      if (!stop) setError(err.message || "Could not open your plans.");
    });
    return () => {
      stop = true;
    };
  }, []);

  async function addTheme(event) {
    event.preventDefault();
    const theme = name.trim();
    if (!theme) return;
    try {
      const next = await api.addTheme(theme);
      navigate(themePath(next.theme));
    } catch (err) {
      setError(err.message || "Could not add that theme.");
    }
  }

  return (
    <main className="archive plan-page">
      <p className="eyebrow">Your themes</p>
      <h1>Plan</h1>
      <p className="sub">Each theme opens its own page. The plan is a table of the date, the aim, and whether it passed.</p>
      {error && <p className="banner" role="alert">{error}</p>}
      <form className="theme-add" onSubmit={addTheme}>
        <label>
          <span>New theme</span>
          <input
            value={name}
            maxLength={500}
            placeholder="Name a theme"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="submit" className="tab" disabled={!name.trim()}>Add theme</button>
      </form>
      {themes === null && <p className="loading">Opening your plans…</p>}
      {themes && themes.length === 0 && <p className="sub">No theme yet. Add one here, or name a theme on a day.</p>}
      {themes && themes.length > 0 && (
        <ul className="plan-list">
          {themes.map((theme) => (
            <li key={theme.theme}>
              <Link className="plan-theme" to={themePath(theme.theme)}>
                <strong>{theme.theme}</strong>
                <span>{progress(theme)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="plan-back"><Link to="/">← Board</Link></p>
    </main>
  );
}
