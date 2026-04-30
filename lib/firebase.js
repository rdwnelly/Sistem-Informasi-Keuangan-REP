// lib/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Konfigurasi Firebase Anda
// Nanti kita akan mengganti nilai-nilai ini dengan environment variables (.env.local) demi keamanan
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inisialisasi aplikasi Firebase
// Logika ini memastikan Firebase tidak diinisialisasi ulang setiap kali komponen React di-render (mencegah error)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Firestore dan Auth
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };