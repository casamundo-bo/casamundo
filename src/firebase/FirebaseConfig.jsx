// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBoA6hcYMbpl1eKBiLzOjAagDF5uVkKyyk",
  authDomain: "casamundo-7edf9.firebaseapp.com",
  projectId: "casamundo-7edf9",
  storageBucket: "casamundo-7edf9.firebasestorage.app",
  messagingSenderId: "686028321496",
  appId: "1:686028321496:web:9f17cfcedaac614efd5dad",
  measurementId: "G-X7KHZ1MLY0"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

const fireDB = getFirestore(app);
const auth = getAuth(app);

const analytics = getAnalytics(app);

export { fireDB, auth }