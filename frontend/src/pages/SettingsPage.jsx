import { Link } from "react-router-dom";

const CHOICES = [
  { path: "/profile", label: "Profile" },
  { path: "/achievements", label: "Achievements" },
  { path: "/settings/rename", label: "Rename a theme" },
];

export default function SettingsPage() {
  return (
    <main className="archive">
      <p className="eyebrow">Your diary</p>
      <h1>Settings</h1>
      <nav className="settings-list" aria-label="Settings">
        {CHOICES.map((choice) => (
          <Link key={choice.path} to={choice.path}>{choice.label}</Link>
        ))}
      </nav>
    </main>
  );
}
