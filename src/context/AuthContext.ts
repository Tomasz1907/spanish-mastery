import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export type AuthState = {
  user: User | null;
  // true dopóki Firebase nie sprawdzi, czy ktoś jest zalogowany
  loading: boolean;
};

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}
