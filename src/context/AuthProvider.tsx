import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../lib/firebase";
import { AuthContext, type AuthState } from "./AuthContext";

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    // bez Firebase nie ma na co czekać
    loading: auth !== null,
  });

  useEffect(() => {
    if (!auth) return;

    return onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
