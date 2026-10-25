import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { formatStudied, todayISO } from "../time.js";

function cycleStage(seconds) {
  const hours = Math.max(0, (Number(seconds) || 0) / 3600);
  if (hours >= 500) return { tone: "pink", fill: 1, center: "Succeed", done: true };
  if (hours >= 200) return { tone: "pink", fill: (hours - 200) / 300, center: "500", done: false };
  if (hours >= 100) return { tone: "gold", fill: (hours - 100) / 100, center: "200", done: false };
  return { tone: "teal", fill: hours / 100, center: "100", done: false };
}

function HourCycle({ seconds }) {
  const stage = cycleStage(seconds);
  const radius = 58;
  const turn = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(1, stage.fill)) * turn;
  const spoken = (Number(seconds) || 0) / 3600 >= 500
    ? "500 hours reached. Succeed."
    : `${formatStudied(seconds)} of ${stage.center === "Succeed" ? "500" : stage.center} hours`;
  return (
    <div className={`theme-cycle is-${stage.tone}${stage.done ? " is-succeed" : ""}`} role="img" aria-label={spoken}>
      <svg viewBox="0 0 148 148" aria-hidden="true">
        <defs>
          <linearGradient id="cycle-teal" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#0c6f68" />
            <stop offset="42%" stopColor="#1eaa9c" />
            <stop offset="100%" stopColor="#9af3e8" />
          </linearGradient>
        </defs>
        <circle className="cycle-track" cx="74" cy="74" r={radius} />
        {filled > 0.5 && (
          <circle
            className="cycle-fill"
            cx="74"
            cy="74"
            r={radius}
            stroke={stage.tone === "teal" ? "url(#cycle-teal)" : undefined}
            strokeDasharray={`${filled} ${turn}`}
          />
        )}
      </svg>
      <p className="cycle-mark">{stage.center}</p>
    </div>
  );
}

const MAX_SITTING = 24 * 60 * 60;

function formatSitting(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const clock = [minutes, secs].map((n) => String(n).padStart(2, "0")).join(":");
  return hours > 0 ? `${hours}:${clock}` : clock;
}

function studyKey(theme) {
  return `orbit-theme-timer:${String(theme || "").trim().toLowerCase()}`;
}

const studyPosts = new Set();

function sittingId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStudy(theme) {
  const empty = { startedAt: null, pending: 0, id: "" };
  try {
    const raw = sessionStorage.getItem(studyKey(theme));
    if (!raw) return empty;
    const data = JSON.parse(raw);
    const id = typeof data.id === "string" ? data.id : "";
    const pending = Number(data.pending);
    if (Number.isFinite(pending) && pending > 0 && pending <= MAX_SITTING) {
      return { startedAt: null, pending: Math.floor(pending), id };
    }
    const startedAt = Number(data.startedAt);
    const elapsed = (Date.now() - startedAt) / 1000;
    if (!Number.isFinite(startedAt) || startedAt <= 0 || elapsed < 0 || elapsed > MAX_SITTING) {
      sessionStorage.removeItem(studyKey(theme));
      return empty;
    }
    return { startedAt, pending: 0, id };
  } catch {
    return empty;
  }
}

function writeStudy(theme, data) {
  try {
    sessionStorage.setItem(studyKey(theme), JSON.stringify(data));
  } catch {
    /* the timer still runs for this visit */
  }
}

function clearStudy(theme) {
  try {
    sessionStorage.removeItem(studyKey(theme));
  } catch {
    /* nothing stored */
  }
}

function StudyTimer({ themeName, onLogged, onError }) {
  const [session, setSession] = useState(() => readStudy(themeName));
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const sessionRef = useRef(session);
  const nameRef = useRef(themeName);
  const seenTheme = useRef(themeName);
  sessionRef.current = session;
  nameRef.current = themeName;

  useEffect(() => {
    if (seenTheme.current === themeName) return;
    seenTheme.current = themeName;
    const next = readStudy(themeName);
    sessionRef.current = next;
    setSession(next);
    setNow(Date.now());
    busyRef.current = false;
    setBusy(false);
  }, [themeName]);

  useEffect(() => {
    if (session.startedAt == null) return undefined;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [session.startedAt]);

  const running = session.startedAt != null;
  const shown = running ? Math.max(0, (now - session.startedAt) / 1000) : session.pending;

  function start() {
    if (busyRef.current || running) return;
    const startedAt = Date.now();
    const next = { startedAt, pending: 0, id: sittingId() };
    sessionRef.current = next;
    setSession(next);
    setNow(startedAt);
    writeStudy(themeName, next);
    onError("");
  }

  function reset() {
    if (busyRef.current) return;
    const next = { startedAt: null, pending: 0, id: "" };
    sessionRef.current = next;
    setSession(next);
    clearStudy(themeName);
    onError("");
  }

  async function stop() {
    if (busyRef.current) return;
    const theme = themeName;
    const current = sessionRef.current;
    const id = current.id || sittingId();
    if (studyPosts.has(id)) return;
    const seconds = current.startedAt != null
      ? Math.floor(Math.max(0, (Date.now() - current.startedAt) / 1000))
      : Math.floor(current.pending || 0);
    if (seconds <= 0) {
      reset();
      return;
    }
    const frozen = { startedAt: null, pending: seconds, id };
    sessionRef.current = frozen;
    setSession(frozen);
    writeStudy(theme, frozen);
    busyRef.current = true;
    studyPosts.add(id);
    setBusy(true);
    onError("");
    try {
      const next = await api.logStudy(theme, seconds);
      clearStudy(theme);
      if (nameRef.current !== theme) return;
      const idle = { startedAt: null, pending: 0, id: "" };
      sessionRef.current = idle;
      setSession(idle);
      onLogged(next);
    } catch (err) {
      studyPosts.delete(id);
      if (nameRef.current === theme) onError(err.message || "Could not add that time to the cycle.");
    } finally {
      if (nameRef.current === theme) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  const holding = !running && session.pending > 0;
  return (
    <section className="study-timer" aria-label="Study timer">
      <p className="study-label">Timer</p>
      <p className={`study-clock${running ? " is-running" : ""}`} role="timer">{formatSitting(shown)}</p>
      <div className="study-actions">
        {!running && !holding ? (
          <button type="button" className="btn primary" onClick={start}>Start</button>
        ) : (
          <>
            <button type="button" className="btn primary" onClick={stop} disabled={busy} title="Stop and add this time to the cycle">Stop</button>
            <button type="button" className="btn" onClick={reset} disabled={busy} title="Back to 00:00. Nothing is added to the cycle">Reset</button>
          </>
        )}
      </div>
      <p className="study-hint">Stop adds this time to the cycle. Reset adds none.</p>
    </section>
  );
}

export default function ThemePlanPage() {
  const params = useParams();
  const rawTheme = params["*"] || "";
  let themeName = rawTheme;
  try {
    themeName = decodeURIComponent(rawTheme);
  } catch {
    themeName = rawTheme;
  }
  const [theme, setTheme] = useState(undefined);
  const [plan, setPlan] = useState("");
  const [aim, setAim] = useState("");
  const [date, setDate] = useState(todayISO);
  const [texts, setTexts] = useState({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [keepNote, setKeepNote] = useState(false);
  const saveTimer = useRef(null);
  const textTimers = useRef({});
  const themeRef = useRef(null);
  const textsRef = useRef({});
  const rowVersion = useRef({});
  const pullGen = useRef(0);
  const heldStudy = useRef(0);
  const heldUntil = useRef(0);
  const heldTheme = useRef("");

  useEffect(() => {
    let stop = false;
    function apply(rows, first) {
      if (stop) return;
      const found = (rows || []).find((item) => item.theme === themeName) || null;
      if (first) {
        setTheme(found);
        setPlan(found ? found.plan || "" : "");
        if (found && (found.plan || "").trim()) setKeepNote(true);
        return;
      }
      setTheme((current) => {
        if (!found) return current;
        if (!current) return found;
        let seconds = found.studiedSeconds;
        if (found.theme === heldTheme.current && Date.now() < heldUntil.current && seconds + 0.001 < heldStudy.current) {
          seconds = current.studiedSeconds;
        }
        return { ...current, studiedSeconds: seconds };
      });
    }
    function load(first) {
      const gen = pullGen.current;
      api.plans().then((rows) => {
        if (stop || gen !== pullGen.current) return;
        apply(rows, first);
      }).catch((err) => {
        if (stop || gen !== pullGen.current || !first) return;
        setError(err.message || "Could not open this theme.");
      });
    }
    load(true);
    const id = setInterval(() => load(false), 15000);
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      load(false);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [themeName]);

  useEffect(() => () => {
    clearTimeout(saveTimer.current);
    Object.values(textTimers.current).forEach((timer) => clearTimeout(timer));
  }, []);

  function showTheme(next) {
    if (next && next.theme === heldTheme.current && Date.now() < heldUntil.current && next.studiedSeconds + 0.001 < heldStudy.current) {
      next = { ...next, studiedSeconds: heldStudy.current };
    }
    themeRef.current = next;
    setTheme(next);
  }

  function changePlan(value) {
    setPlan(value);
    if (value.trim()) setKeepNote(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.savePlan(themeName, value).then((next) => {
        showTheme(next);
        setStatus("Saved with your account.");
      }).catch((err) => setError(err.message || "Could not save this note."));
    }, 450);
  }

  themeRef.current = theme;

  function shownText(item) {
    return texts[item.id] !== undefined ? texts[item.id] : item.text;
  }

  async function saveRow(id, patch) {
    const current = (themeRef.current?.checkpoints || []).find((row) => row.id === id);
    if (!current) return;
    const version = (rowVersion.current[id] || 0) + 1;
    rowVersion.current[id] = version;
    const body = {
      text: patch.text !== undefined ? patch.text : (textsRef.current[id] !== undefined ? textsRef.current[id] : current.text),
      done: patch.done !== undefined ? patch.done : current.done,
      date: patch.date !== undefined ? patch.date : (current.date || ""),
    };
    const next = await api.updateCheckpoint(id, body);
    if (rowVersion.current[id] !== version) return;
    showTheme(next);
    if (textsRef.current[id] === undefined || textsRef.current[id] === body.text) {
      const rest = { ...textsRef.current };
      delete rest[id];
      textsRef.current = rest;
      setTexts(rest);
    }
    setStatus("Saved with your account.");
  }

  function changeText(item, value) {
    textsRef.current = { ...textsRef.current, [item.id]: value };
    setTexts(textsRef.current);
    clearTimeout(textTimers.current[item.id]);
    textTimers.current[item.id] = setTimeout(() => {
      saveRow(item.id, { text: value }).catch((err) => setError(err.message || "Could not save that aim."));
    }, 400);
  }

  async function addAim(event) {
    event.preventDefault();
    const text = aim.trim();
    if (!text) return;
    setAim("");
    try {
      const next = await api.addCheckpoint(themeName, text, date || "");
      showTheme(next);
      setStatus("Saved with your account.");
    } catch (err) {
      setError(err.message || "Could not add that aim.");
    }
  }

  async function remove(item) {
    try {
      const next = await api.deleteCheckpoint(item.id);
      showTheme(next);
      setStatus("Saved with your account.");
    } catch (err) {
      setError(err.message || "Could not remove that aim.");
    }
  }

  if (theme === undefined && !error) {
    return <p className="loading">Opening this theme…</p>;
  }
  if (!theme) {
    return (
      <main className="archive">
        <p className="banner" role="alert">{error || "That theme is not in your diary."}</p>
        <p className="plan-back"><Link to="/plan">← Plans</Link></p>
      </main>
    );
  }

  const rows = theme.checkpoints || [];
  const passed = rows.filter((item) => item.done).length;
  const waiting = rows.length - passed;

  return (
    <main className="archive theme-page">
      <p className="plan-back"><Link to="/plan">← Plans</Link></p>
      <div className="theme-hero">
        <div>
          <p className="eyebrow">Theme</p>
          <h1>{theme.theme}</h1>
          <p className="theme-hours">{formatStudied(theme.studiedSeconds)} studied</p>
          <p className="aim-summary">
            {rows.length === 0 ? "No aims yet" : `${passed} passed · ${waiting} not yet`}
          </p>
          {cycleStage(theme.studiedSeconds).done && <p className="theme-succeed">Succeed</p>}
        </div>
        <div className="theme-meter">
          <HourCycle seconds={theme.studiedSeconds || 0} />
          <StudyTimer
            themeName={theme.theme}
            onLogged={(next) => {
              pullGen.current += 1;
              heldTheme.current = next && next.theme ? next.theme : theme.theme;
              heldStudy.current = Number(next && next.studiedSeconds) || 0;
              heldUntil.current = Date.now() + 20000;
              showTheme(next);
              setError("");
              setStatus("Saved with your account.");
            }}
            onError={setError}
          />
        </div>
      </div>
      {error && <p className="banner" role="alert">{error}</p>}
      {(keepNote || plan.length > 0) && (
        <label className="theme-note">
          <span>Note</span>
          <textarea
            value={plan}
            maxLength={8000}
            placeholder="A short note for this theme"
            onChange={(event) => changePlan(event.target.value)}
          />
        </label>
      )}
      <div className="aim-table-wrap">
        <table className="aim-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Aims</th>
              <th>Passed</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="aim-empty" colSpan={3}>Add the first aim below.</td>
              </tr>
            )}
            {rows.map((item) => (
              <tr key={item.id} className={item.done ? "is-passed" : undefined}>
                <td className="date-cell">
                  <input
                    type="date"
                    aria-label={`Date for ${item.text}`}
                    value={item.date || ""}
                    onChange={(event) => {
                      saveRow(item.id, { date: event.target.value }).catch((err) => setError(err.message || "Could not save that date."));
                    }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    aria-label="Aim"
                    maxLength={500}
                    value={shownText(item)}
                    onChange={(event) => changeText(item, event.target.value)}
                  />
                </td>
                <td className="passed-cell">
                  <label className={item.done ? "passed-mark is-passed" : "passed-mark"}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => {
                        saveRow(item.id, { done: !item.done }).catch((err) => setError(err.message || "Could not update that aim."));
                      }}
                    />
                    <span>{item.done ? "Passed" : "Not yet"}</span>
                  </label>
                  <button type="button" className="aim-remove" onClick={() => remove(item)} aria-label={`Remove ${shownText(item)}`}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="aim-add">
              <td className="date-cell">
                <input
                  type="date"
                  aria-label="Date for the new aim"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </td>
              <td>
                <input
                  type="text"
                  aria-label="New aim"
                  maxLength={500}
                  placeholder="Write an aim"
                  value={aim}
                  onChange={(event) => setAim(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addAim(event);
                  }}
                />
              </td>
              <td className="passed-cell">
                <button type="button" className="tab" disabled={!aim.trim()} onClick={addAim}>Add</button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {status && <p className="plan-status" role="status">{status}</p>}
    </main>
  );
}
