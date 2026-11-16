import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

// Temporary check. Call once, read the log, then remove the call.
export async function firebaseSmokeTest() {
  if (!isFirebaseConfigured) {
    console.warn("[Firebase] Smoke test skipped: .env is missing or incomplete.");
    return;
  }
  try {
    const snapshot = await getDocs(
      query(collection(db, "events"), where("status", "in", ["Published", "Rescheduled", "Closed"]), limit(1))
    );
    console.log(`[Firebase] OK. Connected to Firestore. Public events found: ${snapshot.size}`);
  } catch (error) {
    console.error(`[Firebase] FAILED: ${error.code} - ${error.message}`);
  }
}