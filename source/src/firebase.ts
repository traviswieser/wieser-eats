import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB6Tcr6hpz0NkzWsgUXYW0JZbiGMkSRosw",
  authDomain: "wieser-eats.firebaseapp.com",
  projectId: "wieser-eats",
  storageBucket: "wieser-eats.firebasestorage.app",
  messagingSenderId: "312709995000",
  appId: "1:312709995000:web:98a448fdeb1fb53a981e0d",
  measurementId: "G-ESYY9MTDFN",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
};
export type { User };
