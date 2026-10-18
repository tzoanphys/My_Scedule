import { useEffect, useState } from "react";
import { api } from "../api.js";
import { formatDay } from "../time.js";

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

  return (
    <main className="archive">
      <p className="eyebrow">Weeks that have passed</p>
      <h1>History</h1>
      {error && <p className="banner" role="alert">{error}</p>}
      {weeks && weeks.length === 0 && <p className="sub">No week has passed yet. When a week ends, it stays here for this diary.</p>}
      {weeks && weeks.map((week) => (
        <section className="archive-week" key={`${week.weekNumber}-${week.startDate}`}>
          <h2>Week {week.weekNumber}</h2>
          <p className="sub">
            From {formatDay(week.startDate)} to {formatDay(week.endDate)}
            {week.program ? ` · ${week.program}` : ""}
          </p>
          <ul className="record-list">
            {(week.days || []).map((day) => (
              <li key={day.dayIndex}>
                <strong>{day.dayName}</strong>
                <span>{formatDay(day.date)}</span>
                {day.theme && <em>{day.theme}</em>}
                {day.notes && <span>{day.notes}</span>}
                {(day.details || []).map((detail, index) => (
                  <span key={`${day.dayIndex}-${index}`}>{detail.done ? "Done · " : ""}{detail.text}</span>
                ))}
                {day.completed && <span className="done-mark">Finished</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
