import { useState } from "react";
import { api } from "../api.js";

export default function Gate({ onEnter }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(create) {
    setBusy(true);
    setError("");
    try {
      const account = create ? await api.register(username, password) : await api.login(username, password);
      onEnter(account);
    } catch (err) {
      setError(err.message || "Could not open the diary.");
      setBusy(false);
    }
  }

  return (
    <section className="gate">
      <p className="eyebrow">Your diary</p>
      <h1>Weekly Orbit Planner</h1>
      <p className="sub">Sign in with a username and password. What you write stays in your diary, and changes to the program leave it in place.</p>
      <form
        className="gate-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}
      >
        <label>
          Username
          <input value={username} autoComplete="username" maxLength={40} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} autoComplete="current-password" maxLength={100} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="banner" role="alert">{error}</p>}
        <div className="actions">
          <button type="submit" className="btn primary" disabled={busy}>Enter</button>
          <button type="button" className="btn" disabled={busy} onClick={() => submit(true)}>Create account</button>
        </div>
      </form>
    </section>
  );
}
