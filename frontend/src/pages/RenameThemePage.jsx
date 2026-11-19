import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { formatStudied } from "../time.js";
import { retitleStudyTimer } from "./ThemePlanPage.jsx";

function tidy(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function progress(theme) {
  const total = (theme.doneCount || 0) + (theme.openCount || 0);
  if (total === 0) return "";
  if (theme.openCount === 0) return `${theme.doneCount} passed`;
  if (theme.doneCount === 0) return `${theme.openCount} not yet`;
  return `${theme.doneCount} passed · ${theme.openCount} not yet`;
}

function ThemeName({ theme, onRenamed }) {
  const [name, setName] = useState(theme.theme);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = tidy(name);
  const aims = progress(theme);

  useEffect(() => {
    setName(theme.theme);
    setError("");
    setBusy(false);
  }, [theme.theme]);

  async function save(event) {
    event.preventDefault();
    if (!next || next === theme.theme || busy) return;
    const sure = window.confirm(
      `Rename ${theme.theme} to ${next}? The hours, the plan, and the history stay with ${next}.`
    );
    if (!sure) return;
    setBusy(true);
    setError("");
    try {
      await api.renameTheme(theme.theme, next);
      retitleStudyTimer(theme.theme, next);
      onRenamed(theme.theme, next);
    } catch (err) {
      setError(err.message || "Could not rename that theme.");
      setBusy(false);
    }
  }

  return (
    <li>
      <form className="subject-rename" onSubmit={save}>
        <label>
          <span>
            {theme.theme}
            {" · "}
            {formatStudied(theme.studiedSeconds)} studied
            {aims ? ` · ${aims}` : ""}
          </span>
          <input
            value={name}
            maxLength={500}
            aria-label={`New name for ${theme.theme}`}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="submit" className="tab" disabled={busy || !next || next === theme.theme}>
          {busy ? "Saving…" : "Save name"}
        </button>
      </form>
      {error && <p className="banner" role="alert">{error}</p>}
    </li>
  );
}

export default function RenameThemePage() {
  const [themes, setThemes] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let stop = false;
    api.plans().then((rows) => {
      if (!stop) setThemes(rows || []);
    }).catch((err) => {
      if (!stop) {
        setThemes([]);
        setError(err.message || "Could not open your themes.");
      }
    });
    return () => {
      stop = true;
    };
  }, []);

  function renamed(from, to) {
    setNotice(`${to} keeps the hours, plan, and history from ${from}.`);
    setError("");
    api.plans().then((rows) => {
      setThemes(rows || []);
    }).catch((err) => {
      setError(err.message || "The name was saved, but the list could not refresh.");
    });
  }

  return (
    <main className="archive">
      <p className="eyebrow">Settings</p>
      <h1>Rename a theme</h1>
      <p className="sub">
        The new name keeps the hours already studied, the plan and its aims, and every day already written under the old name.
      </p>
      {error && <p className="banner" role="alert">{error}</p>}
      {notice && <p className="plan-status" role="status">{notice}</p>}
      {themes === null && <p className="loading">Opening your themes…</p>}
      {themes && themes.length === 0 && (
        <p className="sub">No theme yet. Add one on Plan, or name a theme on a day.</p>
      )}
      {themes && themes.length > 0 && (
        <ul className="subject-list">
          {themes.map((theme) => (
            <ThemeName key={theme.theme} theme={theme} onRenamed={renamed} />
          ))}
        </ul>
      )}
      <p className="plan-back"><Link to="/settings">← Settings</Link></p>
    </main>
  );
}
