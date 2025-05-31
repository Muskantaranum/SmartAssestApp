import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCNd_DF0G2OT8pyiwoDJJGX_J105TjOfTA",
  authDomain: "smartassestapp-712dc.firebaseapp.com",
  projectId: "smartassestapp-712dc",
  storageBucket: "smartassestapp-712dc.appspot.com",
  messagingSenderId: "414619725992",
  appId: "1:414619725992:web:6574006d8f2493ab10529d",
  measurementId: "G-SZGGDF6X8R" // optional
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Firestore only (no Auth)
const db = getFirestore(app);

// ✅ Export
export { db, app };
