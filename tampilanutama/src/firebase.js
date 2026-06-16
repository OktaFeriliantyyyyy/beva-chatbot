// firebase.js
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBygcUk7dFXBZEzH0r4GmYQNZMXMFHlGbI",
    authDomain: "chatbot-89b2d.firebaseapp.com",
    projectId: "chatbot-89b2d",
    storageBucket: "chatbot-89b2d.appspot.com",
    messagingSenderId: "631304701399",
    appId: "1:631304701399:web:97b5fca0c851e1c0a8f792",
    measurementId: "G-RNQW1JJN9H"
  };

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firestore = getFirestore(app);

export { app, analytics, firestore, firebaseConfig };
