import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FB_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error("ENV not loaded. Current values:", {
    VITE_FB_API_KEY: import.meta.env.VITE_FB_API_KEY,
    VITE_FB_AUTH_DOMAIN: import.meta.env.VITE_FB_AUTH_DOMAIN,
    VITE_FB_PROJECT_ID: import.meta.env.VITE_FB_PROJECT_ID,
    VITE_FB_STORAGE_BUCKET: import.meta.env.VITE_FB_STORAGE_BUCKET,
    VITE_FB_APP_ID: import.meta.env.VITE_FB_APP_ID,
  });
  throw new Error("Firebase env vars are missing. Check your .env and restart dev server.");
}


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { firebaseConfig };
export default app;
