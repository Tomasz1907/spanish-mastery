import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

import { auth, googleProvider } from "./firebase";

function requireAuth(): Auth {
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Fill in .env.local (see .env.example).",
    );
  }

  return auth;
}

export async function register(
  name: string,
  email: string,
  password: string,
) {
  const { user } = await createUserWithEmailAndPassword(
    requireAuth(),
    email,
    password,
  );

  await updateProfile(user, { displayName: name });

  // nie blokujemy rejestracji, jeśli mail się nie wyśle
  sendEmailVerification(user).catch((err) =>
    console.error("Verification email failed:", err),
  );

  return user;
}

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(requireAuth(), email, password);
}

export function loginWithGoogle() {
  return signInWithPopup(requireAuth(), googleProvider);
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(requireAuth(), email);
}

export function logout() {
  return signOut(requireAuth());
}

// kody błędów Firebase -> czytelne komunikaty
const messages: Record<string, string> = {
  "auth/invalid-email": "This email address is not valid.",
  "auth/missing-email": "Enter your email address.",
  "auth/missing-password": "Enter your password.",
  "auth/invalid-credential": "Wrong email or password.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/user-not-found": "No account with this email.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Try again in a few minutes.",
  "auth/network-request-failed": "Network error. Check your connection.",
  "auth/popup-closed-by-user": "The sign-in window was closed.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup.",
  "auth/operation-not-allowed":
    "This sign-in method is not enabled in Firebase Console.",
  "auth/configuration-not-found":
    "Authentication is not set up in Firebase Console yet.",
  "auth/unauthorized-domain":
    "This domain is not authorized in Firebase Console.",
};

export function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    return messages[err.code] ?? `Something went wrong (${err.code}).`;
  }

  return err instanceof Error ? err.message : "Something went wrong.";
}

// błędy, przy których nie pokazujemy komunikatu (użytkownik sam przerwał)
export function isCancelled(err: unknown): boolean {
  return (
    err instanceof FirebaseError &&
    err.code === "auth/cancelled-popup-request"
  );
}
