import { initializeApp, type FirebaseApp } from "firebase/app";

// Wartości pochodzą z pliku .env.local (patrz .env.example).
// Firebase Console -> Project settings -> Your apps -> Web app -> SDK config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

// null dopóki nie uzupełnisz .env.local - aplikacja działa bez Firebase
export const app: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;

// Gdy będziesz potrzebować logowania lub bazy danych:
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// export const auth = app ? getAuth(app) : null;
// export const db = app ? getFirestore(app) : null;
