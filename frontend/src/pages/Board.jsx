import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { DayIcon } from "../icons.jsx";
import { useSignOut } from "../session.js";
import { addDaysISO, cardStatus, formatDay, ICONS, liveElapsed, todayISO, TONES } from "../time.js";

function fullDay(sheet, weekNumber, day) {
  if (!sheet) return day;
  return sheet.find((item) => item.weekNumber === weekNumber && item.dayIndex === day.dayIndex) || day;
}

const PRINT_TONES = ["violet", "rose", "teal", "violet", "rose", "teal", "violet"];

function slashDate(iso) {
  if (!iso) return "____ / ____ / ________";
  const [year, month, day] = iso.split("-");
  return `${day} / ${month} / ${year}`;
}

function PrintSchedule({ weeks, sheet }) {
  const ordered = [...weeks].sort((a, b) => a.number - b.number);
  const pages = [
    { label: "Weeks 1–2", weeks: ordered.filter((week) => week.number <= 2) },
    { label: "Weeks 3–4", weeks: ordered.filter((week) => week.number >= 3) },
  ];
  return (
    <article className="print-sheet">
      {pages.map((page) => (
        <section className="print-page" key={page.label}>
          <header className="print-banner">
            <div>
              <h1>Weekly Schedule</h1>
              <p>{page.label}</p>
            </div>
            <svg className="print-planet" viewBox="0 0 78 40" aria-hidden="true">
              <ellipse cx="40" cy="20" rx="28" ry="7" fill="none" stroke="#0f9e90" strokeWidth="1.3" />
              <circle cx="40" cy="20" r="9" fill="#6b3fb5" />
              <ellipse cx="40" cy="20" rx="28" ry="7" fill="none" stroke="#c2185b" strokeWidth="1.3" transform="rotate(-16 40 20)" />
            </svg>
          </header>
          <div className="print-rule" aria-hidden="true"><span /><span /><span /></div>
          {page.weeks.map((week) => (
            <section className="print-week" key={week.number}>
              <div className="print-week-head">
                <h2>Week {week.number}</h2>
                <p>
                  From {slashDate(week.startDate)}
                  <span> to {slashDate(week.endDate)}</span>
                  {week.program ? <strong>{`  ·  ${week.program}`}</strong> : null}
                </p>
              </div>
              <div className="print-days">
                {week.days.map((item) => {
                  const day = fullDay(sheet, week.number, item);
                  const notes = (day.notes || "").trim();
                  const details = Array.isArray(day.details) ? day.details : [];
                  return (
                    <article className={`print-day ${PRINT_TONES[day.dayIndex]}`} key={day.dayIndex}>
                      <h3>{day.dayName}</h3>
                      <div className="print-theme-box">
                        <div className="print-label"><span>Theme</span><i aria-hidden="true" /></div>
                        {day.theme ? <p>{day.theme}</p> : null}
                      </div>
                      <div className="print-notes-box">
                        {notes ? <p>{notes}</p> : null}
                        {details.length > 0 && (
                          <ul>
                            {details.map((detail) => (
                              <li key={detail.id} className={detail.done ? "is-done" : ""}>{detail.text}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
          <p className="print-signoff">One day at a time, one orbit at a time.</p>
        </section>
      ))}
    </article>
  );
}

function HourBlocks({ elapsed }) {
  return (
    <div className="hours" aria-hidden="true">
      {[0, 1, 2, 3].map((hour) => {
        const fill = Math.max(0, Math.min(1, elapsed / 3600 - hour));
        return (
          <span className="hour" key={hour}>
            <span style={{ width: `${fill * 100}%` }} />
          </span>
        );
      })}
    </div>
  );
}

function mergeWeeks(prev, incoming) {
  if (!prev || prev.length === 0) return incoming;
  return incoming.map((next) => {
    const local = prev.find((week) => week.number === next.number);
    if (!local) return next;
    const active = document.activeElement ? document.activeElement.id : "";
    if (!active.startsWith(`week-${next.number}-`)) return next;
    return {
      ...next,
      program: local.program,
      startDate: local.startDate,
      endDate: local.endDate,
      days: next.days.map((day, index) => ({
        ...day,
        date: local.days[index] ? local.days[index].date : day.date,
      })),
    };
  });
}

export default function Board({ username }) {
  const signOut = useSignOut();
  const [weeks, setWeeks] = useState([]);
  const [skew, setSkew] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Saved on this computer.");
  const [page, setPage] = useState(() => (localStorage.getItem("orbit-page") === "1" ? 1 : 0));
  const [sheet, setSheet] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [printToken, setPrintToken] = useState(0);
  const chosePage = useRef(localStorage.getItem("orbit-page") != null);
  const programTimers = useRef({});
  const printRequest = useRef(0);

  const reloadSilent = useCallback(async () => {
    try {
      const data = await api.board();
      setSkew(data.skew || 0);
      setWeeks((prev) => mergeWeeks(prev, data.weeks));
      setError("");
    } catch {
      /* keep the board that's already on screen */
    }
  }, []);

  useEffect(() => {
    let stop = false;
    let timer;
    async function load() {
      try {
        const data = await api.board();
        if (stop) return;
        setSkew(data.skew || 0);
        setWeeks(data.weeks);
        setError("");
        setLoading(false);
      } catch {
        if (stop) return;
        setLoading(false);
        setError("The planner is starting. If this stays, open Docker Desktop and wait until it is running.");
        timer = setTimeout(load, 2000);
      }
    }
    load();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (chosePage.current || weeks.length === 0) return;
    const today = todayISO();
    const hit = weeks.find((week) => week.startDate && week.endDate && week.startDate <= today && today <= week.endDate);
    if (hit) setPage(hit.number > 2 ? 1 : 0);
    chosePage.current = true;
  }, [weeks]);

  const anyRunning = weeks.some((week) => week.days.some((day) => day.running && !day.completed));

  useEffect(() => {
    if (!anyRunning) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 250);
    const poll = setInterval(() => { reloadSilent(); }, 5000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [anyRunning, reloadSilent]);

  function loadSheet() {
    const ordered = [...weeks].sort((a, b) => a.number - b.number);
    return Promise.all(ordered.flatMap((week) => week.days.map((day) => api.day(week.number, day.dayIndex))));
  }

  useEffect(() => {
    if (loading || weeks.length === 0) return undefined;
    let cancel = false;
    loadSheet().then((days) => {
      if (!cancel) setSheet(days);
    }).catch(() => {});
    return () => {
      cancel = true;
    };
  }, [loading, weeks.length]);

  useEffect(() => {
    if (!printToken) return undefined;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => window.print());
    });
    function done() {
      setPrinting(false);
      setPrintToken(0);
      setStatus("Saved on this computer.");
    }
    window.addEventListener("afterprint", done);
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      window.removeEventListener("afterprint", done);
    };
  }, [printToken]);

  async function printSchedule() {
    if (printing || weeks.length === 0) return;
    const request = printRequest.current + 1;
    printRequest.current = request;
    setPrinting(true);
    setStatus("Preparing the PDF…");
    try {
      const days = await loadSheet();
      if (printRequest.current !== request) return;
      setSheet(days);
      setPrintToken(request);
    } catch (err) {
      if (printRequest.current !== request) return;
      setPrinting(false);
      setStatus(err.message || "Could not prepare the PDF.");
    }
  }

  function selectPage(next) {
    setPage(next);
    localStorage.setItem("orbit-page", String(next));
    chosePage.current = true;
  }

  async function saveWeek(number, body) {
    setStatus("Saving…");
    try {
      const saved = await api.updateWeek(number, body);
      setWeeks((prev) => prev.map((week) => {
        if (week.number !== number) return week;
        const active = document.activeElement ? document.activeElement.id : "";
        if (active === `week-${number}-program`) return { ...saved, program: week.program };
        return saved;
      }));
      setStatus("Saved on this computer.");
    } catch (err) {
      setStatus(err.message || "Could not save.");
    }
  }

  function changeStart(week, value) {
    if (!value) return;
    const endDate = addDaysISO(value, 6);
    setWeeks((prev) => prev.map((item) => (item.number === week.number ? {
      ...item,
      startDate: value,
      endDate,
      days: item.days.map((day) => ({ ...day, date: addDaysISO(value, day.dayIndex) })),
    } : item)));
    saveWeek(week.number, { startDate: value, endDate, program: week.program || "" });
  }

  function changeEnd(week, value) {
    if (!value) return;
    setWeeks((prev) => prev.map((item) => (item.number === week.number ? { ...item, endDate: value } : item)));
    saveWeek(week.number, { startDate: week.startDate, endDate: value, program: week.program || "" });
  }

  function changeProgram(week, value) {
    setWeeks((prev) => prev.map((item) => (item.number === week.number ? { ...item, program: value } : item)));
    clearTimeout(programTimers.current[week.number]);
    programTimers.current[week.number] = setTimeout(() => {
      saveWeek(week.number, {
        startDate: week.startDate,
        endDate: week.endDate,
        program: value,
      });
    }, 450);
  }

  const today = todayISO();
  const onPage = [...weeks]
    .sort((a, b) => a.number - b.number)
    .filter((week) => (page === 0 ? week.number <= 2 : week.number >= 3));
  const visible = onPage.filter((week) => !(week.endDate && week.endDate < today));

  return (
    <>
      <header className="mast">
        <div className="mast-text">
          <p className="eyebrow">Four weeks · Monday to Sunday</p>
          <h1>Weekly Orbit Planner</h1>
          <p className="sub">Open a day to count down four hours. When the countdown lands, that project day is complete. Change the program, the theme, and the details whenever you want.</p>
        </div>
        <div className="emblem-wrap">
          <img className="emblem" src="/diary%202.jpeg" alt="Purple diary with a spiral galaxy and gold orbit rings" />
        </div>
      </header>

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Pages">
          <button type="button" className="tab" role="tab" aria-selected={page === 0} onClick={() => selectPage(0)}>Weeks 1–2</button>
          <button type="button" className="tab" role="tab" aria-selected={page === 1} onClick={() => selectPage(1)}>Weeks 3–4</button>
        </div>
        <button type="button" className="tab print-btn" onClick={printSchedule} disabled={printing || loading || weeks.length === 0}>
          {printing ? "Preparing…" : "Save PDF"}
        </button>
      </div>

      {error && <p className="banner" role="alert">{error}</p>}
      {loading && <p className="loading">Opening the orbit…</p>}
      {!loading && weeks.length > 0 && visible.length === 0 && (
        <p className="loading">These weeks have passed. Open History in the menu.</p>
      )}

      {!loading && visible.length > 0 && (
        <main className="board">
          {visible.map((week) => (
            <section key={week.number} aria-labelledby={`w${week.number}-title`}>
              <div className="week-head">
                <span className="week-pill" id={`w${week.number}-title`}>Week {week.number}</span>
                <div className="range">
                  <label>
                    From
                    <input id={`week-${week.number}-from`} type="date" value={week.startDate || ""} onChange={(event) => changeStart(week, event.target.value)} />
                  </label>
                  <label>
                    to
                    <input id={`week-${week.number}-to`} type="date" value={week.endDate || ""} onChange={(event) => changeEnd(week, event.target.value)} />
                  </label>
                </div>
              </div>
              <label className="program">
                <span>Program</span>
                <input
                  id={`week-${week.number}-program`}
                  value={week.program || ""}
                  maxLength={500}
                  placeholder="Name this week's orbit"
                  onChange={(event) => changeProgram(week, event.target.value)}
                />
              </label>
              <div className="days">
                {week.days.map((day) => {
                  const elapsed = liveElapsed(day, now, skew);
                  const state = cardStatus(day, now, skew);
                  const isToday = day.date === today;
                  return (
                    <Link
                      key={day.dayIndex}
                      className={`day ${TONES[day.dayIndex]}${isToday ? " today" : ""}`}
                      to={`/day/${week.number}/${day.dayIndex}`}
                    >
                      {isToday && <span className="today-chip">Today</span>}
                      <div className="day-head">
                        <div className="day-name">
                          {day.dayName}
                          <span className="day-date">{formatDay(day.date) || "Set a start date"}</span>
                          <span className={`day-status ${state.kind}`}>{state.text}</span>
                        </div>
                        <DayIcon kind={ICONS[day.dayIndex]} />
                      </div>
                      <div className="box">
                        <span className="box-label">Theme</span>
                        <p className={day.theme ? "preview" : "preview empty"}>{day.theme || "Open to set the theme"}</p>
                      </div>
                      <HourBlocks elapsed={elapsed} />
                      {day.detailCount > 0 && (
                        <p className="detail-count">{day.detailCount === 1 ? "1 detail" : `${day.detailCount} details`}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </main>
      )}

      {weeks.length > 0 && <PrintSchedule weeks={weeks} sheet={sheet} />}

      <footer className="foot">
        <span role="status">{status}</span>
        <span className="foot-user">{username}</span>
        <button type="button" className="tab sign-out" onClick={signOut}>Sign out</button>
        <em>One day at a time, one orbit at a time.</em>
      </footer>
    </>
  );
}
