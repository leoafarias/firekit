import * as admin from "firebase-admin";

let firebaseApp: admin.app.App | undefined;

/**
 * Initialize Firebase Admin SDK
 * @param serviceAccountPath Optional path to service account JSON file
 * @returns The Firebase Admin app instance
 */
export function initializeFirebase(
  serviceAccountPathOrObject: string | admin.ServiceAccount
): admin.app.App {
  // Don't re-initialize if already done
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // If a service account path is provided, use it

    let adminServiceAccount: admin.ServiceAccount;

    // checkif serviceaccount is path if so load it
    if (typeof serviceAccountPathOrObject === "string") {
      const serviceAccount = require(serviceAccountPathOrObject);
      adminServiceAccount = serviceAccount;
    } else {
      adminServiceAccount = serviceAccountPathOrObject;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(adminServiceAccount),
      databaseURL: `https://${adminServiceAccount.projectId}-default-rtdb.firebaseio.com`,
    });

    return firebaseApp;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    throw error;
  }
}

export function getFirestore() {
  if (!firebaseApp) {
    throw new Error(
      "Firebase Admin SDK not initialized, call initializeFirebase first"
    );
  }
  return admin.firestore(firebaseApp);
}
