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
  loginWithGoogle,
  register,
} from "../lib/auth";

const MIN_PASSWORD = 6;

function Register() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // podczas rejestracji user pojawia się zanim zapiszemy imię - nie przekierowujemy wtedy
  if (loading) return <Splash />;

  if (user && !busy) return <Navigate to={from} replace />;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);

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

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    run(() => register(name.trim(), email.trim(), password));
  };

  return (
    <AuthCard
      title="Create account"
      subtitle="Join and start mastering Spanish."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            state={{ from }}
            className="font-semibold text-accent-strong hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert type="error">{error}</Alert>}

        <TextField
          label="Name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <Button type="submit" disabled={busy}>
          {busy ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      <Divider />

      <GoogleButton disabled={busy} onClick={() => run(loginWithGoogle)} />
    </AuthCard>
  );
}

export default Register;
