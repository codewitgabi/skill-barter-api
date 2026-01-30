import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { FIREBASE_SERVICE_ACCOUNT } from "../utils/constants";

function initializeFirebaseApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Parse service account JSON from environment variable
  if (!FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
  }

  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);

    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    throw new Error(
      `Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

const app = initializeFirebaseApp();

export const firestore = getFirestore(app);
export const messaging = getMessaging(app);
