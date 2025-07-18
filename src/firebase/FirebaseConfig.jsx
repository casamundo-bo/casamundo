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
  apiKey: "AIzaSyD-TSVIiUfIbW-wWJzwuJl1juVl0zpWftE",
  authDomain: "casamundobolivia-bac9a.firebaseapp.com",
  projectId: "casamundobolivia-bac9a",
  storageBucket: "casamundobolivia-bac9a.firebasestorage.app",
  messagingSenderId: "153716530865",
  appId: "1:153716530865:web:e03820c45e96042e300c90"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore con configuración para mejorar el rendimiento
const fireDB = getFirestore(app);
const auth = getAuth(app);

// Inicializar Analytics
const analytics = getAnalytics(app);

// Exportar las instancias de Firebase
export { fireDB, auth }