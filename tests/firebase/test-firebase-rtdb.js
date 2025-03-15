const admin = require("firebase-admin");
const serviceAccount = require("../../config/serviceAccountKey.json");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
});

console.log("Firebase Admin SDK initialized successfully");
console.log(`Project ID: ${serviceAccount.project_id}`);

// Get Realtime Database instance
const db = admin.database();
console.log("Realtime Database instance created");

// Test CRUD operations
async function testCrud() {
  try {
    // Reference to a test node
    const testRef = db.ref("test");

    // Create data
    console.log("Creating test data...");
    await testRef.set({
      message: "Hello from Firekit!",
      timestamp: admin.database.ServerValue.TIMESTAMP,
    });

    console.log("Data created");

    // Read data
    console.log("Reading data...");
    const snapshot = await testRef.once("value");
    console.log("Data:", snapshot.val());

    // Update data
    console.log("Updating data...");
    await testRef.update({
      message: "Updated message from Firekit!",
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });

    // Read updated data
    console.log("Reading updated data...");
    const updatedSnapshot = await testRef.once("value");
    console.log("Updated data:", updatedSnapshot.val());

    // Delete data
    console.log("Deleting data...");
    await testRef.remove();

    console.log("Data deleted");
    console.log("CRUD test completed successfully!");
  } catch (error) {
    console.error("Error during CRUD test:", error);
  }
}

// Run the test
testCrud();
