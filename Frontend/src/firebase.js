import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAGHyL6uFMLVm1j2IsZoXdOKnJ7VJsFg2g",
  authDomain: "recoveryai-34279.firebaseapp.com",
  projectId: "recoveryai-34279",
  storageBucket: "recoveryai-34279.firebasestorage.app",
  messagingSenderId: "614269917263",
  appId: "1:614269917263:web:325cfadef278e4b912723a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);