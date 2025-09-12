// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXBYAIhlb_UoyTV0JtycBhL_sTXbgQsgc",
  authDomain: "codesage-14326.firebaseapp.com",
  projectId: "codesage-14326",
  storageBucket: "codesage-14326.firebasestorage.app",
  messagingSenderId: "911826675300",
  appId: "1:911826675300:web:f4099d12d0650bebb4e171",
  measurementId: "G-YD5VNMKN43"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);