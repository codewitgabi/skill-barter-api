import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = getApps().length === 0 ? initializeApp() : getApps()[0];

export const firestore = getFirestore(app);
