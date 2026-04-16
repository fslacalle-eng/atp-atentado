import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const DOC_ID = "tennis-v11";
const COLLECTION = "app_state";

/**
 * Load the full app state from Firestore.
 * Returns null if no data exists yet.
 */
export async function loadState() {
  try {
    const ref = doc(db, COLLECTION, DOC_ID);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (e) {
    console.error("loadState error:", e);
    return null;
  }
}

/**
 * Save the full app state to Firestore.
 */
export async function saveState(state) {
  try {
    const ref = doc(db, COLLECTION, DOC_ID);
    await setDoc(ref, state);
  } catch (e) {
    console.error("saveState error:", e);
  }
}

/**
 * Subscribe to real-time updates.
 * Returns an unsubscribe function.
 */
export function subscribeState(callback) {
  const ref = doc(db, COLLECTION, DOC_ID);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
}
