import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useSignOut } from "../session.js";

export default function ProfilePage() {
  const signOut = useSignOut();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    api.me().then((account) => {
      if (!stop) setUsername(account.username || "");
    }).catch((err) => {
      if (!stop) setError(err.message || "Could not open your profile.");
    });
    return () => {
      stop = true;
    };
  }, []);

  return (
    <main className="archive">
      <p className="eyebrow">Your diary</p>
      <h1>Profile</h1>
      {error && <p className="banner" role="alert">{error}</p>}
      {username && <p className="archive-name">{username}</p>}
      <p className="sub">This name is saved with your diary. Finished days and past weeks stay there too.</p>
      <button type="button" className="tab sign-out" onClick={signOut}>Sign out</button>
    </main>
  );
}
