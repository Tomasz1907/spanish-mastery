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

      <main className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-6 sm:py-6">
        {/* klucz = adres, więc każda podstrona wjeżdża z animacją */}
        <div key={location.pathname} className="animate-page">
          <Outlet />
        </div>
      </main>
    </>
  );
}

export default RequireAuth;
