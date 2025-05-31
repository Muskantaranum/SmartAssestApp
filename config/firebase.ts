import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNd_DF0G2OT8pyiwoDJJGX_J105TjOfTA",
  databaseURL: "https://smartassestapp-712dc-default-rtdb.firebaseio.com",
  projectId: "smartassestapp-712dc",
  storageBucket: "smartassestapp-712dc.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // You'll need to add this
  appId: "YOUR_APP_ID" // You'll need to add this
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app); 