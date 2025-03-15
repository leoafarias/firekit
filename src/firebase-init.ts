import * as admin from "firebase-admin";
import path from "path";

// Initialize Firebase Admin SDK if not already initialized
export function initializeFirebase(): admin.app.App {
  try {
    return admin.app();
  } catch (error) {
    // App doesn't exist yet, initialize it
    const serviceAccountPath = path.resolve(
      __dirname,
      "../config/serviceAccountKey.json"
    );

    return admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
  }
}

// Get Firestore instance
export function getFirestore(): admin.firestore.Firestore {
  const app = initializeFirebase();
  return app.firestore();
}

// Export Firebase Admin SDK
export { admin };
