import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  initializeFirestore,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAwzKVMoi2m3J-akCzIFdbHveT6ymo6Ig4",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "du-an-v2.firebaseapp.com",
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://du-an-v2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID || "du-an-v2",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "du-an-v2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "603046874028",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID || "1:603046874028:web:c66bd242d3c3b2fcb8c809",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KC5ZB9NVWV",
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

// Analytics (safe client-side initialization)
export let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logoutUser = () => signOut(auth);
