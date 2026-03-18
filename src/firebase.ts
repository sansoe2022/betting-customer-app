import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// သင့်ရဲ့ Firebase Config ကို ဒီနေရာမှာ အစားထိုးပါ
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDIfUCPNuX4H11E8orGEEO1i5qsGUOBJ_Q",
  authDomain: "d3dcustomer.firebaseapp.com",
  projectId: "d3dcustomer",
  storageBucket: "d3dcustomer.firebasestorage.app",
  messagingSenderId: "836308980018",
  appId: "1:836308980018:web:625b5e578dd522b25d872b",
  measurementId: "G-67C47ZDYWX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
