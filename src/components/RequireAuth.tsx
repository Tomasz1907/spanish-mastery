import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { isFirebaseConfigured } from "../lib/firebase";
import Navbar from "./Navbar";
import Splash from "./Splash";

// Wszystko poza /login i /register wymaga zalogowania
function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!isFirebaseConfigured) {
    return (
      <Splash message="Firebase is not configured. Fill in .env.local (see .env.example)." />
    );
  }

  if (loading) return <Splash />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return (
    <>
      <Navbar />

      <main className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </>
  );
}

export default RequireAuth;
