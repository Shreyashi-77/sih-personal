
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDqml7MP8SW_Wjs4GmaJQXpoFVdh2LIRE4",
  authDomain: "sih2026-7656e.firebaseapp.com",
  projectId: "sih2026-7656e",
  storageBucket: "sih2026-7656e.firebasestorage.app",
  messagingSenderId: "376342762164",
  appId: "1:376342762164:web:6f3b97f528082d5c3efde1",
  measurementId: "G-M9PMLGH7BN"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

