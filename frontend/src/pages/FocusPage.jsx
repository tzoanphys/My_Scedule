import { useEffect, useState, useSyncExternalStore } from "react";
import { playHourChime } from "../chime.js";
import {
  chooseFocus,
  focusSeconds,
  getFocus,
  pauseFocus,
  resetFocus,
  setFocusLength,
  startFocus,
  subscribeFocus,
} from "../focusClock.js";
import { formatClock } from "../time.js";

function formatUp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return [hours, minutes, secs].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function FocusPage() {
  const session = useSyncExternalStore(subscribeFocus, getFocus, getFocus);
  const [now, setNow] = useState(() => Date.now());
  const counting = session.open.phase === "running" || session.back.phase === "running";

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    if (!counting) return undefined;
    const id = setInterval(tick, 250);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [counting]);

  const shown = focusSeconds(session, now);
  const clockText = session.mode === "open" ? formatUp(shown) : formatClock(shown);
  const phase = session.mode === "open" ? session.open.phase : session.back.phase;
  const running = phase === "running";
  const locked = counting;
  const done = session.mode === "back" && phase === "done";

  useEffect(() => {
    if (!running) return undefined;
    const previous = document.title;
    return () => {
      document.title = previous;
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    document.title = `${clockText} · Focus`;
  }, [running, clockText]);

  const declared = (Number(session.back.hours) || 0) * 3600 + (Number(session.back.minutes) || 0) * 60;
  const span = session.back.span || declared;
  const used = span > 0 ? Math.max(0, Math.min(1, (span - shown) / span)) : 0;
  const minute = shown % 60;
  const openShare = shown <= 0 ? 0 : (minute === 0 ? 1 : minute / 60);
  const share = session.mode === "open" ? openShare : (done ? 1 : used);
  const caption = done
    ? "Complete"
    : (session.mode === "open" ? (phase === "idle" ? "Ready" : "Elapsed") : (phase === "idle" ? "Ready" : "Remaining"));
  const spoken = done
    ? "Focus complete"
    : phase === "idle"
      ? (session.mode === "open" ? "Count up ready" : `${clockText} ready`)
      : (session.mode === "open" ? `${clockText} elapsed` : `${clockText} remaining`);

  return (
    <main className="archive focus-page">
      <p className="eyebrow">Quiet time</p>
      <h1>Focus</h1>
      <p className="sub">Press start and the clock runs forward. Or set a length and let it run back to zero.</p>
      <div className="tabs focus-modes" role="tablist" aria-label="Focus style">
        <button
          type="button"
          className="tab"
          role="tab"
          aria-selected={session.mode === "open"}
          disabled={locked && session.mode !== "open"}
          onClick={() => chooseFocus("open")}
        >
          Count up
        </button>
        <button
          type="button"
          className="tab"
          role="tab"
          aria-selected={session.mode === "back"}
          disabled={locked && session.mode !== "back"}
          onClick={() => chooseFocus("back")}
        >
          Countdown
        </button>
      </div>
      <section className="panel timer-panel focus-panel">
        {done && (
          <div className="complete-banner" role="status">
            <div>
              <strong>Focus complete</strong>
              <p>The time you set has run back to zero.</p>
            </div>
          </div>
        )}
        <div
          className={`ring${running ? " is-run" : ""}${done ? " is-done" : ""}`}
          style={{ "--p": share * 100 }}
          role="timer"
          aria-label={spoken}
        >
          <div className="ring-hole">
            <div className="clock">{clockText}</div>
            <div className="clock-sub">{caption}</div>
          </div>
        </div>
        {session.mode === "back" && (
          <form
            className="adjust-row time-set"
            onSubmit={(event) => {
              event.preventDefault();
              if (!running) startFocus();
            }}
          >
            <p className="box-label">Length</p>
            <label>
              Hours
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="23"
                value={session.back.hours}
                disabled={running}
                onChange={(event) => setFocusLength("hours", event.target.value)}
              />
            </label>
            <label>
              Minutes
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                value={session.back.minutes}
                disabled={running}
                onChange={(event) => setFocusLength("minutes", event.target.value)}
              />
            </label>
          </form>
        )}
        <div className="actions">
          {running ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (pauseFocus()) playHourChime();
              }}
            >
              Pause
            </button>
          ) : (
            <button
              type="button"
              className="btn primary"
              onClick={() => startFocus()}
              disabled={session.mode === "back" && phase !== "paused" && declared <= 0}
            >
              {phase === "paused" ? "Resume" : "Start"}
            </button>
          )}
          {phase !== "idle" && (
            <button type="button" className="btn" onClick={() => resetFocus()}>Reset</button>
          )}
        </div>
        <p className="hint">
          {session.mode === "open"
            ? "Start runs the clock forward. Pause holds it. Reset returns it to zero. It keeps running if you leave this page."
            : "Set hours and minutes, then start. The clock runs back and chimes at zero, even if you leave this page. Changing the length clears a paused countdown."}
          {" "}This stays on this device. It is not saved in your diary.
        </p>
      </section>
    </main>
  );
}
