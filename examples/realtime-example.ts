import * as admin from "firebase-admin";
import "reflect-metadata";
import * as serviceAccount from "../config/serviceAccountKey.json";
import { RealtimeRepository } from "../src";

// Initialize Firebase Admin SDK with database URL
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL: `https://${
    (serviceAccount as any).project_id
  }-default-rtdb.firebafseio.com`,
});

console.log("Firebase Admin SDK initialized successfully");

// Define interface for a ChatMessage
interface ChatMessage {
  text: string;
  sender: string;
  timestamp: number;
  isRead?: boolean;
}

// Create a RealtimeRepository for 'chats'
const chatRepo = new RealtimeRepository<ChatMessage>("chats");

async function main() {
  try {
    // Create a new chat message using push() (auto-generated ID)
    console.log("Sending new chat message...");
    const newMessage = await chatRepo.push({
      text: "Hello, realtime world!",
      sender: "example-user",
      timestamp: Date.now(),
      isRead: false,
    });
    console.log("Message sent with ID:", newMessage.id);

    // Listen for real-time updates (e.g. new messages)
    console.log("Listening for real-time updates...");
    const unsubscribe = chatRepo
      .query()
      .orderByChild("timestamp")
      .onValue((messages: any[]) => {
        console.log("Real-time messages:", messages);
      });

    // Wait for 5 seconds to capture any real-time updates
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Cleanup: Remove the created message and stop listening.
    console.log(
      "Cleaning up: Removing the test message and stopping listener."
    );
    await chatRepo.remove(newMessage.id);
    unsubscribe();
    process.exit(0);
  } catch (error) {
    console.error("Error in realtime example:", error);
    process.exit(1);
  }
}

main();
