import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAFezHmPEK8kNhQExjB5HL0ndrHSHV8vhY",
  authDomain: "atp-atentado.firebaseapp.com",
  projectId: "atp-atentado",
  storageBucket: "atp-atentado.firebasestorage.app",
  messagingSenderId: "247388969952",
  appId: "1:247388969952:web:a1ecb5f101e822392d6985",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
export default app;
