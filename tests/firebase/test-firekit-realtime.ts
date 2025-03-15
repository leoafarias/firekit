import * as admin from "firebase-admin";
import "reflect-metadata";
import * as serviceAccount from "../../config/serviceAccountKey.json";
import { RealtimeRepository } from "../../src";
import { RealtimeQueryBuilder } from "../../src/repository/realtime.repository";

// Initialize Firebase Admin SDK with database URL
try {
  admin.app();
} catch (error) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL: `https://${
      (serviceAccount as any).project_id
    }-default-rtdb.firebaseio.com`,
  });
}

console.log("Firebase Admin SDK initialized successfully");
console.log(`Project ID: ${(serviceAccount as any).project_id}`);

// Define a test interface for chat messages
interface ChatMessage {
  text: string;
  sender: string;
  timestamp: number;
  isRead?: boolean;
  score?: number; // Add score field for advanced queries
}

// Get the repository
const chatRepo = new RealtimeRepository<ChatMessage>("test-chats");

// Test CRUD operations
async function testRealtimeCrud() {
  try {
    console.log("Starting Realtime Database CRUD tests...");

    // Create data with auto-generated ID
    console.log("Creating test data with push()...");
    const newMessage = await chatRepo.push({
      text: "Hello from Firekit tests!",
      sender: "test-user",
      timestamp: Date.now(),
      isRead: false,
    });

    console.log(`Created message with ID: ${newMessage.id}`);
    console.log("Message data:", newMessage);

    // Create data with specific ID
    const specificId = "test-message-1";
    console.log(`Creating test data with set() at ID: ${specificId}...`);
    await chatRepo.set(specificId, {
      text: "This is a message with a specific ID",
      sender: "test-user",
      timestamp: Date.now(),
      isRead: false,
    });

    // Read data
    console.log("Reading data with get()...");
    const message = await chatRepo.get(specificId);
    console.log("Retrieved message:", message);

    // Update data
    console.log("Updating data with update()...");
    await chatRepo.update(specificId, {
      text: "This message has been updated",
      isRead: true,
    });

    // Read updated data
    console.log("Reading updated data...");
    const updatedMessage = await chatRepo.get(specificId);
    console.log("Updated message:", updatedMessage);

    // Get all data
    console.log("Getting all data with getAll()...");
    const allMessages = await chatRepo.getAll();
    console.log(`Retrieved ${allMessages.length} messages`);

    // Test query builder
    console.log("Testing query builder...");
    const unreadMessages = await chatRepo
      .query()
      .equalTo("isRead", false)
      .get();
    console.log(`Found ${unreadMessages.length} unread messages`);

    // Test ordering
    console.log("Testing ordering by timestamp...");
    const orderedMessages = await chatRepo
      .query()
      .orderByChild("timestamp")
      .get();
    console.log(`Retrieved ${orderedMessages.length} ordered messages`);

    // Delete data
    console.log("Deleting data...");
    await chatRepo.remove(specificId);
    await chatRepo.remove(newMessage.id);

    // Verify deletion
    const deletedMessage = await chatRepo.get(specificId);
    console.log("Deleted message should be null:", deletedMessage);

    console.log("CRUD test completed successfully!");
  } catch (error) {
    console.error("Error during CRUD test:", error);
  }
}

// Test real-time updates
async function testRealtimeUpdates() {
  try {
    console.log("Starting Realtime Database real-time updates test...");

    // Set up a listener
    console.log("Setting up onValue listener...");
    const unsubscribe = chatRepo.query().onValue((messages) => {
      console.log(`Real-time update received: ${messages.length} messages`);
    });

    // Add a message to trigger the listener
    console.log("Adding a message to trigger the listener...");
    const newMessage = await chatRepo.push({
      text: "This should trigger the real-time listener",
      sender: "test-user",
      timestamp: Date.now(),
      isRead: false,
    });

    // Wait a bit to see the update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update the message to trigger the listener again
    console.log("Updating the message to trigger the listener again...");
    await chatRepo.update(newMessage.id, {
      text: "This is an updated message",
      isRead: true,
    });

    // Wait a bit to see the update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Clean up
    console.log("Cleaning up...");
    unsubscribe();
    await chatRepo.remove(newMessage.id);

    console.log("Real-time updates test completed successfully!");
  } catch (error) {
    console.error("Error during real-time updates test:", error);
  }
}

// Test query capabilities
async function testQueryCapabilities() {
  try {
    console.log("Starting Realtime Database query capabilities test...");

    // Create test data
    console.log("Creating test data for queries...");
    const ids = [];

    // Add messages with different timestamps
    for (let i = 0; i < 5; i++) {
      const message = await chatRepo.push({
        text: `Test message ${i + 1}`,
        sender: i % 2 === 0 ? "user-1" : "user-2",
        timestamp: Date.now() + i * 1000,
        isRead: i % 2 === 0,
      });
      ids.push(message.id);
    }

    // Test filtering by equality
    console.log("Testing filtering by equality...");
    const user1Messages = await chatRepo
      .query()
      .equalTo("sender", "user-1")
      .get();
    console.log(`Found ${user1Messages.length} messages from user-1`);

    // Test ordering and limiting
    console.log("Testing ordering and limiting...");
    const latestMessages = await chatRepo
      .query()
      .orderByChild("timestamp")
      .limitToLast(3)
      .get();
    console.log(`Retrieved ${latestMessages.length} latest messages`);

    // Test range queries
    console.log("Testing range queries...");
    const currentTime = Date.now();
    const recentMessages = await chatRepo
      .query()
      .orderByChild("timestamp")
      .startAt(currentTime)
      .get();
    console.log(`Found ${recentMessages.length} recent messages`);

    // Clean up
    console.log("Cleaning up...");
    for (const id of ids) {
      await chatRepo.remove(id);
    }

    console.log("Query capabilities test completed successfully!");
  } catch (error) {
    console.error("Error during query capabilities test:", error);
  }
}

// Test advanced query capabilities
async function testAdvancedQueries() {
  try {
    console.log("Starting Realtime Database advanced query test...");

    // Create test data
    console.log("Creating test data for advanced queries...");
    const ids = [];

    // Add messages with different scores
    for (let i = 0; i < 10; i++) {
      const message = await chatRepo.push({
        text: `Advanced test message ${i + 1}`,
        sender: `user-${(i % 3) + 1}`,
        timestamp: Date.now(),
        isRead: i % 2 === 0,
        score: i * 10, // Add a score field for range queries
      });
      ids.push(message.id);
    }

    // Test between query
    console.log("Testing between query...");
    const mediumScoreMessages = await chatRepo
      .query()
      .between("score", 30, 70)
      .get();
    console.log(
      `Found ${mediumScoreMessages.length} messages with medium scores (30-70)`
    );

    // Test orderByKey
    console.log("Testing orderByKey...");
    const keyOrderedMessages = await chatRepo.query().orderByKey().get();
    console.log(
      `Retrieved ${keyOrderedMessages.length} messages ordered by key`
    );

    // Test orderByValue (requires a different structure)
    console.log("Testing orderByValue with a simple value structure...");
    const simpleRef = chatRepo.getRefAt("simple-values");

    // Set some simple values
    await simpleRef.set({
      item1: 100,
      item2: 50,
      item3: 75,
    });

    // Query by value
    const valueOrderedItems = await new RealtimeQueryBuilder<number>(simpleRef)
      .orderByValue()
      .get();
    console.log("Items ordered by value:", valueOrderedItems);

    // Clean up
    console.log("Cleaning up...");
    for (const id of ids) {
      await chatRepo.remove(id);
    }
    await simpleRef.remove();

    console.log("Advanced query test completed successfully!");
  } catch (error) {
    console.error("Error during advanced query test:", error);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testRealtimeCrud();
    console.log("\n-----------------------------------\n");

    await testRealtimeUpdates();
    console.log("\n-----------------------------------\n");

    await testQueryCapabilities();
    console.log("\n-----------------------------------\n");

    await testAdvancedQueries();
    console.log("\n-----------------------------------\n");

    console.log("All Realtime Database tests completed successfully!");
  } catch (error) {
    console.error("Error during tests:", error);
  }
}

// Run the tests
runAllTests();
