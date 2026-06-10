import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWtLlJ2YiPcFURvDkS_zbGwgxuipZlCmA",
  authDomain: "portfolio-e3ce0.firebaseapp.com",
  projectId: "portfolio-e3ce0",
  storageBucket: "portfolio-e3ce0.firebasestorage.app",
  messagingSenderId: "271809733474",
  appId: "1:271809733474:web:db7495eb3ac6cdcfffc23b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
