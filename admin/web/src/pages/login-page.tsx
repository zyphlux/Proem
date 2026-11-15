import { useState } from "react";
import { ApiError, api } from "../api";

export function LoginPage({ onSignedIn }: { onSignedIn: (csrf: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <form
        className="w-full max-w-sm rounded-xl border bg-panel p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const r = await api.post<{ csrf: string }>("/api/login", { password });
            onSignedIn(r.csrf);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not sign in");
          } finally {
            setBusy(false);
            setPassword("");
          }
        }}
      >
        <h1 className="text-xl font-semibold">Proem</h1>
        <p className="mt-1 mb-5 text-muted">Sign in to edit your site.</p>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium">Password</span>
          <input className="input" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-danger">
            {error}
          </p>
        )}
        <button className="btn btn-primary mt-5 w-full justify-center" disabled={busy || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
