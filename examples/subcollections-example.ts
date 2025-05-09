import "reflect-metadata";
import { BurnKit, Collection, Field, Subcollection } from "../src";
import { initializeFirebase } from "../src/firebase-init";

initializeFirebase(require("../serviceAccountKey.json"));

// Define parent entity
@Collection("posts")
class Post {
  @Field()
  title!: string;

  @Field()
  content!: string;

  @Field()
  authorId!: string;

  @Field({ index: true })
  tags!: string[];

  @Field({ index: true })
  published!: boolean;
}

// Define subcollection entity
@Subcollection(Post)
class Comment {
  @Field()
  content!: string;

  @Field()
  authorId!: string;

  @Field()
  authorName!: string;
}

// Example usage
async function runExample() {
  try {
    // Get post repository
    const postRepo = BurnKit.getRepository(Post);

    // Create a post
    console.log("Creating a post...");
    const post = await postRepo.create({
      title: "Getting Started with Firekit Subcollections",
      content:
        "Firekit provides a clean, type-safe API for working with subcollections in Firestore...",
      authorId: "user123",
      tags: ["firebase", "typescript", "subcollections"],
      published: true,
    });
    console.log(`Post created with ID: ${post.id}`);

    // Get comments repository for this post
    const commentsRepo = BurnKit.getSubcollectionRepository(Comment, post.id);

    // Add comments to the post
    console.log("\nAdding comments to the post...");

    const comment1 = await commentsRepo.create({
      content: "Great article! Thanks for sharing.",
      authorId: "user456",
      authorName: "Jane Smith",
    });
    console.log(`Comment 1 created with ID: ${comment1.id}`);

    const comment2 = await commentsRepo.create({
      content: "This saved me a lot of time. Keep up the good work!",
      authorId: "user789",
      authorName: "Bob Johnson",
    });
    console.log(`Comment 2 created with ID: ${comment2.id}`);

    // Get all comments for the post
    console.log("\nGetting all comments for the post...");
    const comments = await commentsRepo.findAll();
    console.log(`Found ${comments.length} comments:`);
    comments.forEach((comment, index) => {
      console.log(`${index + 1}. ${comment.authorName}: ${comment.content}`);
    });

    // Query for specific comments
    console.log("\nQuerying for comments by a specific author...");
    const authorComments = await commentsRepo
      .query()
      .where("authorId", "==", "user456")
      .get();
    console.log(`Found ${authorComments.length} comments by user456`);

    // Update a comment
    console.log("\nUpdating a comment...");
    await commentsRepo.update(comment1.id, {
      content: "Updated: Great article! Thanks for sharing. I learned a lot.",
    });
    console.log("Comment updated");

    // Retrieve the post and manually add i ts comments
    console.log("\nRetrieving post with comments...");
    const retrievedPost = await postRepo.findById(post.id);
    if (retrievedPost) {
      // Load comments into the post object
      const comments = await commentsRepo.findAll();

      console.log(`Post: ${retrievedPost.title}`);
      console.log(`Comments (${comments.length}):`);
      comments.forEach((comment, index) => {
        console.log(`${index + 1}. ${comment.authorName}: ${comment.content}`);
      });
    }

    // Clean up (optional - for demonstration purposes)
    console.log("\nCleaning up...");
    // Delete comments first
    for (const comment of comments) {
      await commentsRepo.delete(comment.id);
    }
    // Then delete the post
    await postRepo.delete(post.id);
    console.log("Post and comments deleted");

    console.log("\nExample completed successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
runExample();
