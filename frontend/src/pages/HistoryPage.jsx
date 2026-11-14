import { useEffect, useState } from "react";
import { api } from "../api.js";
import { formatDay, formatLeft } from "../time.js";

export default function HistoryPage() {
  const [weeks, setWeeks] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    api.history().then((list) => {
      if (!stop) setWeeks(list || []);
    }).catch((err) => {
      if (!stop) {
        setWeeks([]);
        setError(err.message || "Could not open history.");
      }
    });
    return () => {
      stop = true;
    };
  }, []);

  const ordered = weeks ? [...weeks].sort((a, b) => {
    const left = a.startDate || "";
    const right = b.startDate || "";
    if (left !== right) return right.localeCompare(left);
    return (b.weekNumber || 0) - (a.weekNumber || 0);
  }) : null;

  return (
    <main className="archive">
      <p className="eyebrow">Weeks that have passed</p>
      <h1>History</h1>
      {error && <p className="banner" role="alert">{error}</p>}
      {ordered && ordered.length === 0 && <p className="sub">Weeks 1 and 2 are still on the planner. When both have ended, they stay here, with the newest week first. Weeks 3 and 4 then become the next weeks 1 and 2.</p>}
      {ordered && ordered.map((week) => (
        <section className="archive-week" key={`${week.weekNumber}-${week.startDate}`}>
          <h2>Week {week.weekNumber}</h2>
          <p className="sub">
            From {formatDay(week.startDate)} to {formatDay(week.endDate)}
            {week.program ? ` · ${week.program}` : ""}
          </p>
          <ul className="record-list">
            {(week.days || []).map((day) => (
              <li key={day.dayIndex}>
                <p className="history-when">
                  <strong>{day.dayName}</strong>
                  {formatDay(day.date) && <span>- {formatDay(day.date)}</span>}
                </p>
                {day.theme && <em>{day.theme}</em>}
                {(day.details || []).length > 0 && (
                  <ul className="history-details">
                    {day.details.map((detail, index) => (
                      <li key={`${day.dayIndex}-${index}`} className={detail.done ? "is-done" : ""}>
                        <span>{detail.text}</span>
                        {detail.done && <span className="done-mark">Completed</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {formatLeft(day.remainingSeconds) && <span className="time-left">{formatLeft(day.remainingSeconds)}</span>}
                {day.completed && <span className="done-mark">Finished</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
