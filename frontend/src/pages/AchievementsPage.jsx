import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { formatDay } from "../time.js";

export default function AchievementsPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    api.achievements().then((list) => {
      if (!stop) setRows(list || []);
    }).catch((err) => {
      if (!stop) {
        setRows([]);
        setError(err.message || "Could not open achievements.");
      }
    });
    return () => {
      stop = true;
    };
  }, []);

  return (
    <main className="archive">
      <p className="eyebrow">Four hours finished</p>
      <h1>Achievements</h1>
      {error && <p className="banner" role="alert">{error}</p>}
      {rows && rows.length === 0 && <p className="sub">No day has finished its study goal yet. When one does, it stays in this list.</p>}
      {rows && rows.length > 0 && (
        <ul className="record-list">
          {rows.map((day) => (
            <li key={`${day.weekNumber}-${day.dayIndex}-${day.date || "open"}`}>
              <Link to={`/day/${day.weekNumber}/${day.dayIndex}`}>
                <strong>Week {day.weekNumber} · {day.dayName}</strong>
                <span>{formatDay(day.date) || "Date not set"}</span>
                {day.theme && <em>{day.theme}</em>}
                <span className="done-mark">Finished</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
