// Firebase setup — AUTH ONLY. All data (users, posts, groups, messages)
// lives in MongoDB, reached through our Express API with jQuery Ajax (§25).
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

// Web app config from the Firebase console (project: socialnet-1a5ec).
// Not secret — safe to commit (unlike server/config/serviceAccountKey.json!).
const firebaseConfig = {
  apiKey: 'AIzaSyBYTQTH8vEDUIjap2F_leOfakpYbdyzyqg',
  authDomain: 'socialnet-1a5ec.firebaseapp.com',
  projectId: 'socialnet-1a5ec',
  storageBucket: 'socialnet-1a5ec.firebasestorage.app',
  messagingSenderId: '255150840146',
  appId: '1:255150840146:web:90d1482934302b129ac28b',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Create a new Firebase account (email + password).
export function firebaseRegister(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

// Log in to an existing Firebase account.
export function firebaseLogin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Log out.
export function firebaseLogout() {
  return signOut(auth);
}

// Watch login state; runs the callback on every login/logout.
export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Current ID token — sent to our server on every Ajax call (see api.js).
export async function getToken() {
  const user = auth.currentUser;
  return user ? user.getIdToken() : null;
}
