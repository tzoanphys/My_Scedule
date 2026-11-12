import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api.js";
import { armChime, playHourChime } from "./chime.js";
import { bindFocus, bootChime, tickFocus } from "./focusClock.js";
import Board from "./pages/Board.jsx";
import DayPage from "./pages/DayPage.jsx";
import Gate from "./pages/Gate.jsx";
import AchievementsPage from "./pages/AchievementsPage.jsx";
import FocusPage from "./pages/FocusPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import PlanPage from "./pages/PlanPage.jsx";
import ThemePlanPage from "./pages/ThemePlanPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { SessionContext } from "./session.js";
import UserMenu from "./UserMenu.jsx";

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    armChime();
    let stop = false;
    api.me().then((account) => {
      if (!stop) setUser(account);
    }).catch(() => {
      if (!stop) setUser(null);
    });
    const signedOut = () => setUser(null);
    window.addEventListener("orbit-signed-out", signedOut);
    return () => {
      stop = true;
      window.removeEventListener("orbit-signed-out", signedOut);
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    if (bootChime()) playHourChime();
    const id = setInterval(() => {
      if (tickFocus()) playHourChime();
    }, 250);
    const wake = () => {
      if (tickFocus()) playHourChime();
    };
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [user]);

  async function signOut() {
    try {
      await api.logout();
    } catch {
      /* the session is already gone */
    }
    setUser(null);
  }

  if (user) bindFocus(user.username);

  return (
    <div className="wrap">
      {user === undefined && <p className="loading">Opening the orbit…</p>}
      {!user && user !== undefined && <Gate onEnter={setUser} />}
      {user && (
        <SessionContext.Provider value={signOut}>
          <div className="user-shell">
            <UserMenu />
            <Routes>
              <Route path="/" element={<Board username={user.username} />} />
              <Route path="/day/:week/:day" element={<DayPage />} />
              <Route path="/plan/open/*" element={<ThemePlanPage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/focus" element={<FocusPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </SessionContext.Provider>
      )}
    </div>
  );
}
