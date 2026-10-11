import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import {
  Alert,
  AuthCard,
  Divider,
  GoogleButton,
  PasswordField,
  TextField,
} from "../components/AuthUI";
import { Button } from "../components/GameUI";
import Splash from "../components/Splash";
import { useAuth } from "../context/AuthContext";
import {
  authErrorMessage,
  isCancelled,
  login,
  loginWithGoogle,
  resetPassword,
} from "../lib/auth";

function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // po zalogowaniu wracamy tam, skąd użytkownik przyszedł
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Splash />;

  if (user) return <Navigate to={from} replace />;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      await action();
      navigate(from, { replace: true });
    } catch (err) {
      if (!isCancelled(err)) setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => login(email.trim(), password));
  };

  const forgot = async () => {
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError("Enter your email above, then click “Forgot password?” again.");
      return;
    }

    try {
      await resetPassword(email.trim());
      setInfo(
        `If an account exists for ${email.trim()}, a reset link is on its way.`,
      );
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to keep track of your progress."
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to="/register"
            state={{ from }}
            className="font-semibold text-accent-strong hover:underline"
          >
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert type="error">{error}</Alert>}
        {info && <Alert type="success">{info}</Alert>}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="button"
          onClick={forgot}
          className="self-end text-sm font-medium text-accent-strong hover:underline"
        >
          Forgot password?
        </button>

        <Button type="submit" disabled={busy}>
          {busy ? "Logging in..." : "Log in"}
        </Button>
      </form>

      <Divider />

      <GoogleButton disabled={busy} onClick={() => run(loginWithGoogle)} />
    </AuthCard>
  );
}

export default Login;
