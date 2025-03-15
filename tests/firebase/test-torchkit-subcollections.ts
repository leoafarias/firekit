import "reflect-metadata";
import * as serviceAccount from "../../config/serviceAccountKey.json";
import {
  Collection,
  CreatedAt,
  Field,
  ID,
  Subcollection,
  TorchKit,
  UpdatedAt,
} from "../../src";
import { initializeFirebase } from "../../src/firebase-init";

// Initialize Firebase Admin SDK
initializeFirebase();

console.log("Firebase Admin SDK initialized successfully");
console.log(`Project ID: ${(serviceAccount as any).project_id}`);

// Define parent entity
@Collection("test-posts")
class Post {
  @ID()
  id!: string;

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

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;

  // This field is not stored in Firestore, but will be populated
  // with data from the comments subcollection
  comments?: Comment[];
}

// Define subcollection entity
@Subcollection(Post)
class Comment {
  @ID()
  id!: string;

  @Field()
  content!: string;

  @Field()
  authorId!: string;

  @Field()
  authorName!: string;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;
}

// Define subcollection entity with custom name
@Subcollection(Post, "post-reactions")
class Reaction {
  @ID()
  id!: string;

  @Field()
  type!: string; // "like", "love", "angry", etc.

  @Field()
  userId!: string;

  @CreatedAt()
  createdAt!: Date;
}

// Test subcollection CRUD operations
async function testSubcollectionCrud() {
  try {
    console.log("\n=== Testing Subcollection CRUD Operations ===\n");

    // Get post repository
    const postRepo = TorchKit.getRepository(Post);

    // Create a post
    console.log("Creating a post...");
    const post = await postRepo.create({
      title: "Testing TorchKit Subcollections",
      content: "This is a test post for subcollections",
      authorId: "test-user-123",
      tags: ["test", "subcollections"],
      published: true,
    });

    console.log(`Post created with ID: ${post.id}`);
    console.log("Post data:", post);

    // Get comments repository for this post
    console.log("\nGetting comments repository for the post...");
    const commentsRepo = TorchKit.getSubcollectionRepository(Comment, post.id);

    // Create a comment
    console.log("\nCreating a comment...");
    const comment = await commentsRepo.create({
      content: "This is a test comment",
      authorId: "test-user-456",
      authorName: "Test User",
    });

    console.log(`Comment created with ID: ${comment.id}`);
    console.log("Comment data:", comment);

    // Find comment by ID
    console.log("\nFinding comment by ID...");
    const foundComment = await commentsRepo.findById(comment.id);
    console.log("Found comment:", foundComment);

    if (!foundComment) {
      throw new Error("Failed to find comment by ID");
    }

    if (foundComment.content !== "This is a test comment") {
      throw new Error(
        `Expected content to be "This is a test comment", got "${foundComment.content}"`
      );
    }

    // Update the comment
    console.log("\nUpdating the comment...");
    const updatedComment = await commentsRepo.update(comment.id, {
      content: "This is an updated test comment",
    });

    console.log("Updated comment:", updatedComment);

    if (updatedComment.content !== "This is an updated test comment") {
      throw new Error(
        `Expected content to be "This is an updated test comment", got "${updatedComment.content}"`
      );
    }

    // Get all comments for the post
    console.log("\nGetting all comments for the post...");
    const comments = await commentsRepo.findAll();
    console.log(`Found ${comments.length} comments`);

    if (comments.length !== 1) {
      throw new Error(`Expected to find 1 comment, found ${comments.length}`);
    }

    // Delete the comment
    console.log("\nDeleting the comment...");
    await commentsRepo.delete(comment.id);

    // Verify deletion
    const deletedComment = await commentsRepo.findById(comment.id);
    console.log("After deletion, comment exists:", !!deletedComment);

    if (deletedComment) {
      throw new Error("Comment was not deleted successfully");
    }

    // Delete the post
    console.log("\nDeleting the post...");
    await postRepo.delete(post.id);

    // Verify deletion
    const deletedPost = await postRepo.findById(post.id);
    console.log("After deletion, post exists:", !!deletedPost);

    if (deletedPost) {
      throw new Error("Post was not deleted successfully");
    }

    console.log("\n✅ Subcollection CRUD test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during subcollection CRUD test:", error);
    throw error;
  }
}

// Test custom named subcollection
async function testCustomNamedSubcollection() {
  try {
    console.log("\n=== Testing Custom Named Subcollection ===\n");

    // Get post repository
    const postRepo = TorchKit.getRepository(Post);

    // Create a post
    console.log("Creating a post...");
    const post = await postRepo.create({
      title: "Testing Custom Named Subcollections",
      content: "This is a test post for custom named subcollections",
      authorId: "test-user-123",
      tags: ["test", "subcollections", "custom-name"],
      published: true,
    });

    console.log(`Post created with ID: ${post.id}`);

    // Get reactions repository for this post
    console.log("\nGetting reactions repository for the post...");
    const reactionsRepo = TorchKit.getSubcollectionRepository(
      Reaction,
      post.id
    );

    // Create reactions
    console.log("\nCreating reactions...");
    const reaction1 = await reactionsRepo.create({
      type: "like",
      userId: "test-user-456",
    });
    console.log(`Reaction 1 created with ID: ${reaction1.id}`);

    const reaction2 = await reactionsRepo.create({
      type: "love",
      userId: "test-user-789",
    });
    console.log(`Reaction 2 created with ID: ${reaction2.id}`);

    // Get all reactions for the post
    console.log("\nGetting all reactions for the post...");
    const reactions = await reactionsRepo.findAll();
    console.log(`Found ${reactions.length} reactions`);

    if (reactions.length !== 2) {
      throw new Error(
        `Expected to find 2 reactions, found ${reactions.length}`
      );
    }

    // Query for specific reactions
    console.log("\nQuerying for 'like' reactions...");
    const likeReactions = await reactionsRepo
      .query()
      .where("type", "==", "like")
      .get();
    console.log(`Found ${likeReactions.length} like reactions`);

    if (likeReactions.length !== 1) {
      throw new Error(
        `Expected to find 1 like reaction, found ${likeReactions.length}`
      );
    }

    // Clean up
    console.log("\nCleaning up...");
    for (const reaction of reactions) {
      await reactionsRepo.delete(reaction.id);
    }
    await postRepo.delete(post.id);
    console.log("Post and reactions deleted");

    console.log("\n✅ Custom named subcollection test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during custom named subcollection test:", error);
    throw error;
  }
}

// Test multiple subcollections
async function testMultipleSubcollections() {
  try {
    console.log("\n=== Testing Multiple Subcollections ===\n");

    // Get post repository
    const postRepo = TorchKit.getRepository(Post);

    // Create a post
    console.log("Creating a post...");
    const post = await postRepo.create({
      title: "Testing Multiple Subcollections",
      content: "This is a test post for multiple subcollections",
      authorId: "test-user-123",
      tags: ["test", "subcollections", "multiple"],
      published: true,
    });

    console.log(`Post created with ID: ${post.id}`);

    // Get repositories for both subcollections
    const commentsRepo = TorchKit.getSubcollectionRepository(Comment, post.id);
    const reactionsRepo = TorchKit.getSubcollectionRepository(
      Reaction,
      post.id
    );

    // Create a comment
    console.log("\nCreating a comment...");
    const comment = await commentsRepo.create({
      content: "This is a test comment for multiple subcollections",
      authorId: "test-user-456",
      authorName: "Test User",
    });
    console.log(`Comment created with ID: ${comment.id}`);

    // Create a reaction
    console.log("\nCreating a reaction...");
    const reaction = await reactionsRepo.create({
      type: "like",
      userId: "test-user-456",
    });
    console.log(`Reaction created with ID: ${reaction.id}`);

    // Retrieve the post and manually add its subcollections
    console.log("\nRetrieving post with subcollections...");
    const retrievedPost = await postRepo.findById(post.id);
    if (!retrievedPost) {
      throw new Error("Failed to find post by ID");
    }

    // Load comments and reactions into the post object
    retrievedPost.comments = await commentsRepo.findAll();
    const reactions = await reactionsRepo.findAll();

    console.log(`Post: ${retrievedPost.title}`);
    console.log(`Comments: ${retrievedPost.comments.length}`);
    console.log(`Reactions: ${reactions.length}`);

    if (retrievedPost.comments.length !== 1) {
      throw new Error(
        `Expected to find 1 comment, found ${retrievedPost.comments.length}`
      );
    }

    if (reactions.length !== 1) {
      throw new Error(`Expected to find 1 reaction, found ${reactions.length}`);
    }

    // Clean up
    console.log("\nCleaning up...");
    await commentsRepo.delete(comment.id);
    await reactionsRepo.delete(reaction.id);
    await postRepo.delete(post.id);
    console.log("Post and subcollections deleted");

    console.log("\n✅ Multiple subcollections test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during multiple subcollections test:", error);
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testSubcollectionCrud();
    await testCustomNamedSubcollection();
    await testMultipleSubcollections();

    console.log("\n🎉 All subcollection tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Some tests failed:", error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
