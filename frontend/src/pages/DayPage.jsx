import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, saveDayKeepalive } from "../api.js";
import { playHourChime } from "../chime.js";
import { DAYS, formatClock, formatDay, formatSpoken, liveElapsed, TONES } from "../time.js";
import { useSignOut } from "../session.js";

function savedWritingHeight(id) {
  return localStorage.getItem(`orbit-write-${id}`) || "";
}

function mergeDay(prev, saved, keepText) {
  if (!prev) return saved;
  const activeId = document.activeElement ? document.activeElement.id : "";
  const details = (saved.details || []).map((item) => {
    if (activeId === `detail-${item.id}`) {
      const local = (prev.details || []).find((row) => row.id === item.id);
      return local ? { ...item, text: local.text } : item;
    }
    return item;
  });
  return {
    ...saved,
    theme: (keepText || activeId === "theme") ? prev.theme : saved.theme,
    notes: (keepText || activeId === "notes") ? prev.notes : saved.notes,
    details,
  };
}

export default function DayPage() {
  const params = useParams();
  const signOut = useSignOut();
  const week = Number(params.week);
  const index = Number(params.day);
  const valid = Number.isInteger(week) && week >= 1 && week <= 4
    && Number.isInteger(index) && index >= 0 && index <= 6;

  const [day, setDay] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Saved on this computer.");
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [themeHeight, setThemeHeight] = useState(() => savedWritingHeight("theme"));
  const [notesHeight, setNotesHeight] = useState(() => savedWritingHeight("notes"));
  const [cue, setCue] = useState(false);

  const dayRef = useRef(null);
  const dirtyRef = useRef(false);
  const saveTimer = useRef(null);
  const versionRef = useRef(0);
  const mounted = useRef(true);
  const finishRef = useRef(false);
  const heardRef = useRef("");

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    document.title = valid ? `${DAYS[index]} · Orbit` : "Weekly Orbit Planner";
    return () => { document.title = "Weekly Orbit Planner"; };
  }, [valid, index]);

  useEffect(() => {
    setDraft("");
    setError("");
    setHours("0");
    setMinutes("0");
    window.scrollTo(0, 0);
  }, [week, index]);

  useEffect(() => {
    dirtyRef.current = false;
    return () => {
      clearTimeout(saveTimer.current);
      if (!dirtyRef.current || !dayRef.current) return;
      const current = dayRef.current;
      saveDayKeepalive(week, index, {
        theme: current.theme ?? "",
        notes: current.notes ?? "",
      });
    };
  }, [week, index]);

  useEffect(() => {
    if (!valid) return undefined;
    let stop = false;
    let timer;
    async function load() {
      try {
        const data = await api.day(week, index);
        if (stop) return;
        setDay(data);
        dayRef.current = data;
        dirtyRef.current = false;
        setError("");
        setStatus("Saved on this computer.");
      } catch (err) {
        if (stop) return;
        setError(err.message || "This day could not be opened.");
        timer = setTimeout(load, 2000);
      }
    }
    setDay(null);
    load();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [valid, week, index]);

  useEffect(() => {
    if (!day?.running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [day?.running]);

  useEffect(() => {
    if (!day?.running) return undefined;
    const id = setInterval(() => {
      api.timer(week, index, "sync")
        .then((saved) => {
          if (!mounted.current) return;
          setDay((prev) => mergeDay(prev, saved, dirtyRef.current));
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [day?.running, week, index]);

  useEffect(() => {
    if (!day) return undefined;
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      api.timer(week, index, "sync")
        .then((saved) => {
          if (!mounted.current) return;
          setDay((prev) => mergeDay(prev, saved, dirtyRef.current));
        })
        .catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [day, week, index]);

  useEffect(() => {
    if (!day?.running || day.completed) {
      finishRef.current = false;
      return undefined;
    }
    const elapsedNow = liveElapsed(day, now, day.skew || 0);
    const primed = `${week}-${index}`;
    if ((day.targetSeconds - elapsedNow) > 0.05) {
      finishRef.current = false;
      heardRef.current = primed;
      return undefined;
    }
    if (finishRef.current) return undefined;
    finishRef.current = true;
    if (heardRef.current === primed) {
      playHourChime();
      setCue(true);
    }
    const hide = setTimeout(() => setCue(false), 4000);
    api.timer(week, index, "sync")
      .then((saved) => {
        if (saved.running && !saved.completed) finishRef.current = false;
        if (!mounted.current) return;
        setDay((prev) => mergeDay(prev, saved, dirtyRef.current));
      })
      .catch(() => { finishRef.current = false; });
    return () => clearTimeout(hide);
  }, [day, now, week, index]);

  function scheduleSave() {
    setStatus("Saving…");
    clearTimeout(saveTimer.current);
    const requestedWeek = week;
    const requestedIndex = index;
    saveTimer.current = setTimeout(async () => {
      const current = dayRef.current;
      const sent = versionRef.current;
      try {
        const saved = await api.updateDay(requestedWeek, requestedIndex, {
          theme: current.theme ?? "",
          notes: current.notes ?? "",
        });
        if (sent !== versionRef.current) return;
        dirtyRef.current = false;
        if (!mounted.current) return;
        setDay((prev) => mergeDay(prev, saved));
        setStatus("Saved on this computer.");
      } catch (err) {
        if (!mounted.current) return;
        setStatus(err.message || "Could not save.");
      }
    }, 450);
  }

  function patchText(partial) {
    versionRef.current += 1;
    dirtyRef.current = true;
    setDay((prev) => {
      const next = { ...prev, ...partial };
      dayRef.current = next;
      return next;
    });
    scheduleSave();
  }

  async function runTimer(action) {
    setBusy(true);
    setError("");
    try {
      const saved = await api.timer(week, index, action);
      setDay((prev) => mergeDay(prev, saved, dirtyRef.current));
    } catch (err) {
      setError(err.message || "The timer could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function bump(delta) {
    if (!day) return;
    const target = day.targetSeconds || 4 * 60 * 60;
    const elapsed = liveElapsed(day, Date.now(), day.skew || 0);
    const seconds = Math.max(0, Math.min(target, elapsed + delta));
    setBusy(true);
    setError("");
    try {
      const saved = await api.elapsed(week, index, seconds);
      setDay((prev) => mergeDay(prev, saved, dirtyRef.current));
    } catch (err) {
      setError(err.message || "The time could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  function applyElapsed(event) {
    event.preventDefault();
    if (!day) return;
    const target = day.targetSeconds || 4 * 60 * 60;
    const wholeHours = Math.max(0, Math.min(4, Number(hours) || 0));
    const wholeMinutes = wholeHours >= 4 ? 0 : Math.max(0, Math.min(59, Number(minutes) || 0));
    let seconds = wholeHours * 3600 + wholeMinutes * 60;
    if (!Number.isFinite(seconds)) return;
    seconds = Math.max(0, Math.min(target, seconds));
    setBusy(true);
    setError("");
    api.elapsed(week, index, seconds)
      .then((saved) => setDay((prev) => mergeDay(prev, saved, dirtyRef.current)))
      .catch((err) => setError(err.message || "The time could not be changed."))
      .finally(() => setBusy(false));
  }

  function resetTimer() {
    if (!window.confirm("Reset this day's four hours? Theme, notes, and details stay.")) return;
    runTimer("reset");
  }

  async function addDetail(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setAdding(true);
    setError("");
    try {
      const saved = await api.addDetail(week, index, text);
      setDraft("");
      setDay((prev) => mergeDay(prev, saved, dirtyRef.current));
    } catch (err) {
      setError(err.message || "The detail could not be added.");
    } finally {
      setAdding(false);
    }
  }

  function changeDetail(id, text) {
    setDay((prev) => ({
      ...prev,
      details: prev.details.map((item) => (item.id === id ? { ...item, text } : item)),
    }));
  }

  async function saveDetail(id, text, done) {
    try {
      const saved = await api.updateDetail(id, { text, done });
      setDay((prev) => mergeDay(prev, saved, dirtyRef.current));
    } catch (err) {
      setError(err.message || "The detail could not be saved.");
    }
  }

  async function toggleDetail(item) {
    try {
      const saved = await api.updateDetail(item.id, { text: item.text, done: !item.done });
      setDay((prev) => mergeDay(prev, saved, dirtyRef.current));
    } catch (err) {
      setError(err.message || "The detail could not be updated.");
    }
  }

  async function removeDetail(item) {
    try {
      const saved = await api.deleteDetail(item.id);
      setDay((prev) => mergeDay(prev, saved, dirtyRef.current));
    } catch (err) {
      setError(err.message || "The detail could not be removed.");
    }
  }

  if (!valid) {
    return (
      <>
        <p className="banner">That day is not on this planner.</p>
        <Link className="back" to="/">Back to the board</Link>
      </>
    );
  }

  if (!day) {
    return (
      <>
        <div className="day-top">
          <Link className="back" to="/">← Board</Link>
        </div>
        {error ? <p className="banner" role="alert">{error}</p> : <p className="loading">Opening this day…</p>}
      </>
    );
  }

  const target = day.targetSeconds || 4 * 60 * 60;
  const elapsed = liveElapsed(day, now, day.skew || 0);
  const remaining = Math.max(0, target - elapsed);
  const pct = target ? (elapsed / target) * 100 : 0;

  return (
    <div className={`page-day ${TONES[index]}`.trim()}>
      <div className="day-top">
          <Link className="back" to="/">← Board</Link>
          <button type="button" className="tab sign-out" onClick={signOut}>Sign out</button>
          <Link className="emblem-button" to="/plan" aria-label="Open plan">
            <img className="mark" src="/diary%202.jpeg" alt="" />
          </Link>
      </div>
      <p className="eyebrow">Week {week} · Project day</p>
      <h1>{day.dayName}</h1>
      <p className="sub">{formatDay(day.date)}{day.weekProgram ? ` · ${day.weekProgram}` : ""}</p>

      {day.completed && (
        <div className="complete-banner">
          <div>
            <strong>Project day complete</strong>
            <p>Four hours are in. This day counts as done.</p>
          </div>
        </div>
      )}

      {cue && <p className="hour-cue" role="status">Four hours are in.</p>}
      <div className="day-grid">
        <section className="panel timer-panel">
          <p className="box-label">Countdown</p>
          <div
            className={`ring${day.running ? " is-run" : ""}${day.completed ? " is-done" : ""}`}
            style={{ "--p": pct }}
            role="timer"
            aria-label={day.completed ? "Project day complete" : `${formatClock(remaining)} remaining`}
          >
            <div className="ring-hole">
              <div className="clock">{day.completed ? "00:00:00" : formatClock(remaining)}</div>
              <div className="clock-sub">{day.completed ? "Complete" : "Remaining"}</div>
            </div>
          </div>
          <p className="worked">{formatSpoken(elapsed)} worked of 4 hours</p>
          <div className="actions">
            {day.running ? (
              <button type="button" className="btn" onClick={() => runTimer("pause")} disabled={busy}>Pause</button>
            ) : (
              <button type="button" className="btn primary" onClick={() => runTimer("start")} disabled={busy || day.completed}>
                {elapsed > 0 && !day.completed ? "Resume" : "Start"}
              </button>
            )}
            <button type="button" className="btn" onClick={() => bump(15 * 60)} disabled={busy || day.completed}>+15 min</button>
            <button type="button" className="btn" onClick={() => bump(-15 * 60)} disabled={busy || elapsed < 1}>−15 min</button>
            <button type="button" className="btn" onClick={resetTimer} disabled={busy}>Reset</button>
          </div>
          {error && <p className="banner" role="alert">{error}</p>}
          <p className="hint">The countdown runs while this computer is on. If it sleeps or shuts down, the count pauses and your place is kept.</p>
          <details
            className="adjust"
            onToggle={(event) => {
              if (!event.currentTarget.open) return;
              const worked = Math.floor(liveElapsed(day, Date.now(), day.skew || 0));
              const nextHours = Math.min(4, Math.floor(worked / 3600));
              setHours(String(nextHours));
              setMinutes(String(nextHours >= 4 ? 0 : Math.floor((worked % 3600) / 60)));
            }}
          >
            <summary>Adjust time</summary>
            <form className="adjust-row" onSubmit={applyElapsed}>
              <label>
                Hours
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={hours}
                  onChange={(event) => {
                    const next = event.target.value;
                    setHours(next);
                    if (Number(next) >= 4) setMinutes("0");
                  }}
                />
              </label>
              <label>
                Minutes
                <input type="number" min="0" max="59" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
              </label>
              <button type="submit" className="btn" disabled={busy}>Set</button>
            </form>
          </details>
        </section>

        <div className="stack">
          <section className="box theme-box">
            <label className="box-label" htmlFor="theme">Theme</label>
            <textarea
              id="theme"
              rows={6}
              maxLength={4000}
              placeholder="Today's theme"
              style={themeHeight ? { height: themeHeight } : undefined}
              value={day.theme || ""}
              onChange={(event) => patchText({ theme: event.target.value })}
              onPointerUp={(event) => {
                const height = `${event.currentTarget.offsetHeight}px`;
                localStorage.setItem("orbit-write-theme", height);
                setThemeHeight(height);
              }}
            />
          </section>
          <section className="box notes-box">
            <label className="box-label" htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              rows={5}
              maxLength={8000}
              placeholder="What goes with this day"
              style={notesHeight ? { height: notesHeight } : undefined}
              value={day.notes || ""}
              onChange={(event) => patchText({ notes: event.target.value })}
              onPointerUp={(event) => {
                const height = `${event.currentTarget.offsetHeight}px`;
                localStorage.setItem("orbit-write-notes", height);
                setNotesHeight(height);
              }}
            />
          </section>
        </div>
      </div>

      <section className="panel details-panel">
        <div className="details-layout">
          <img className="megaphone" src="/megaphone.jpg" alt="" />
          <div>
            <p className="box-label">Details</p>
            <p className="empty-copy">Add what this day needs to hold. Checking one off does not finish the day — the four hours do that.</p>
            <form className="detail-add" onSubmit={addDetail}>
              <input
                value={draft}
                maxLength={2000}
                placeholder="Add a detail"
                onChange={(event) => setDraft(event.target.value)}
                aria-label="New detail"
              />
              <button type="submit" className="btn primary" disabled={adding || !draft.trim()}>Add</button>
            </form>
            {(day.details || []).length > 0 && (
              <ul className="detail-list">
                {day.details.map((item) => (
                  <li key={item.id} className={item.done ? "detail is-done" : "detail"}>
                    <label className="check">
                      <input type="checkbox" checked={item.done} onChange={() => toggleDetail(item)} />
                      <span className="sr">Mark detail done</span>
                    </label>
                    <input
                      id={`detail-${item.id}`}
                      type="text"
                      value={item.text}
                      maxLength={2000}
                      onFocus={(event) => { event.target.dataset.saved = event.target.value; }}
                      onChange={(event) => changeDetail(item.id, event.target.value)}
                      onBlur={(event) => {
                        const text = event.target.value.trim();
                        const previous = event.target.dataset.saved || "";
                        if (!text) {
                          changeDetail(item.id, previous);
                          return;
                        }
                        if (text === previous) return;
                        saveDetail(item.id, text, item.done);
                      }}
                    />
                    <button type="button" className="icon-btn" aria-label="Remove detail" onClick={() => removeDetail(item)}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <footer className="foot">
        <span role="status">{status}</span>
        <em>One day at a time, one orbit at a time.</em>
      </footer>
    </div>
  );
}
