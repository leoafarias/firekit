import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import * as admin from "firebase-admin";
import "reflect-metadata";
import {
  BurnKit,
  Collection,
  EntityRepository,
  Field,
  Subcollection,
} from "../../src";
import { initializeFirebase } from "../../src/firebase-init";
import { Entity } from "../../src/models/entity.model";

// Define parent entity
@Collection("test-posts")
class Post {
  @Field()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @Field()
  @IsString()
  content!: string;

  @Field()
  @IsString()
  authorId!: string;

  @Field({ index: true })
  @IsArray()
  @IsOptional()
  tags!: string[];

  @Field({ index: true })
  @IsBoolean()
  published!: boolean;
}

// Define subcollection entity
@Subcollection(Post)
class Comment {
  @Field()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @Field()
  @IsString()
  authorName!: string;
}

// Define subcollection entity with custom name
@Subcollection(Post, "post-reactions")
class Reaction {
  @Field()
  @IsString()
  @IsNotEmpty()
  type!: string;
}

describe("BurnKit Subcollections", () => {
  // Use a longer timeout for real Firebase operations
  jest.setTimeout(10000);

  beforeAll(async () => {
    try {
      // Initialize Firebase Admin SDK
      const app = initializeFirebase(require("../../serviceAccountKey.json"));

      // Log success message with project ID
      console.log("Firebase Admin SDK initialized successfully");
      console.log(`Project ID: ${app.options.projectId}`);

      // Verify Firebase connection works by attempting a simple operation
      const db = admin.firestore(app);
      await db
        .collection("test-connection")
        .doc("test")
        .set({ timestamp: new Date() });
      console.log(
        "Firebase connection verified - test document written successfully"
      );
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      throw error; // Fail the tests if Firebase can't be initialized
    }
  });

  describe("Basic Subcollection CRUD Operations", () => {
    // Initialize repositories at the suite level
    let postRepo: EntityRepository<Post>;
    let post: Entity<Post> | null = null;
    let commentsRepo: EntityRepository<Comment>;
    let comment: Entity<Comment> | null = null;

    // Cleanup after tests
    afterAll(async () => {
      try {
        // Delete the comment first if it exists
        if (comment?.id && post?.id) {
          const repo = BurnKit.getSubcollectionRepository(Comment, post.id);
          await repo.delete(comment.id);
          console.log(`Cleaned up comment ${comment.id}`);
        }

        // Then delete the post
        if (post?.id) {
          await postRepo.delete(post.id);
          console.log(`Cleaned up post ${post.id}`);
        }
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    });

    test("should create a post", async () => {
      // Initialize the repository here
      postRepo = BurnKit.getRepository(Post);

      post = await postRepo.create({
        title: "Testing BurnKit Subcollections",
        content: "This is a test post for subcollections",
        authorId: "test-user-123",
        tags: ["test", "subcollections"],
        published: true,
      });

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.title).toBe("Testing BurnKit Subcollections");
      expect(post.tags).toEqual(["test", "subcollections"]);
      expect(post.published).toBe(true);
      console.log(`Created post with ID: ${post.id}`);
    });

    test("should get comments repository for the post", async () => {
      expect(post).not.toBeNull();
      commentsRepo = BurnKit.getSubcollectionRepository(Comment, post!.id);
      expect(commentsRepo).toBeDefined();
    });

    test("should create a comment", async () => {
      comment = await commentsRepo.create({
        content: "This is a test comment",
        authorName: "Test User",
      });

      expect(comment).toBeDefined();
      expect(comment.id).toBeDefined();
      expect(comment.content).toBe("This is a test comment");
    });

    test("should find a comment by ID", async () => {
      const foundComment = await commentsRepo.findById(comment!.id);

      expect(foundComment).toBeDefined();
      expect(foundComment!.id).toBe(comment!.id);
      expect(foundComment!.content).toBe("This is a test comment");
    });

    test("should update a comment", async () => {
      const updatedComment = await commentsRepo.update(comment!.id, {
        content: "This is an updated test comment",
      });

      expect(updatedComment).toBeDefined();
      expect(updatedComment!.content).toBe("This is an updated test comment");

      // Update our reference for future tests
      comment = updatedComment;
      console.log(`Updated comment with ID: ${comment.id}`);
    });

    test("should get all comments for the post", async () => {
      const comments = await commentsRepo.findAll();

      expect(comments).toBeInstanceOf(Array);
      expect(comments.length).toBe(1);
      expect(comments[0].id).toBe(comment!.id);
    });

    test("should delete a comment", async () => {
      await commentsRepo.delete(comment!.id);

      const deletedComment = await commentsRepo.findById(comment!.id);
      expect(deletedComment).toBeNull();

      // Clear the reference since we've deleted the comment
      console.log(`Deleted comment with ID: ${comment!.id}`);
      comment = null;
    });

    test("should delete the post", async () => {
      await postRepo.delete(post!.id);

      const deletedPost = await postRepo.findById(post!.id);
      expect(deletedPost).toBeNull();

      // Clear the reference since we've deleted the post
      console.log(`Deleted post with ID: ${post!.id}`);
      post = null;
    });
  });

  describe("Custom Named Subcollection", () => {
    let post: Entity<Post> | null = null;
    let reactionsRepo: EntityRepository<Reaction>;
    let reaction: Entity<Reaction> | null = null;

    // Cleanup after tests
    afterAll(async () => {
      try {
        // Delete the reaction first if it exists
        if (reaction?.id && post?.id) {
          const repo = BurnKit.getSubcollectionRepository(Reaction, post.id);
          await repo.delete(reaction.id);
          console.log(`Cleaned up reaction ${reaction.id}`);
        }

        // Then delete the post
        if (post?.id) {
          const postRepo = BurnKit.getRepository(Post);
          await postRepo.delete(post.id);
          console.log(`Cleaned up post ${post.id}`);
        }
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    });

    test("should create a post with custom named subcollection", async () => {
      // Initialize the repository here
      const postRepo: EntityRepository<Post> = BurnKit.getRepository(Post);

      post = await postRepo.create({
        title: "Testing Custom Named Subcollections",
        content: "This is a test post for custom named subcollections",
        authorId: "test-user-456",
        tags: ["test", "custom-subcollections"],
        published: true,
      });

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.title).toBe("Testing Custom Named Subcollections");
      console.log(`Created post with ID: ${post.id}`);
    });

    test("should get reactions repository for the post", async () => {
      expect(post).not.toBeNull();
      reactionsRepo = BurnKit.getSubcollectionRepository(Reaction, post!.id);
      expect(reactionsRepo).toBeDefined();
    });

    test("should create reactions", async () => {
      const reaction1 = await reactionsRepo.create({
        type: "like",
      });

      expect(reaction1).toBeDefined();
      expect(reaction1.id).toBeDefined();
      expect(reaction1.type).toBe("like");
      reaction = reaction1;
      console.log(`Created 'like' reaction with ID: ${reaction1.id}`);
    });

    test("should find a reaction by ID", async () => {
      expect(reaction).not.toBeNull();
      const foundReaction = await reactionsRepo.findById(reaction!.id);

      expect(foundReaction).toBeDefined();
      expect(foundReaction!.id).toBe(reaction!.id);
      expect(foundReaction!.type).toBe("like");
    });

    test("should clean up reactions and post", async () => {
      // Delete the reaction
      if (reaction) {
        await reactionsRepo.delete(reaction.id);
        console.log(`Deleted reaction with ID: ${reaction.id}`);
      }

      // Delete the post
      if (post) {
        const postRepo = BurnKit.getRepository(Post);
        await postRepo.delete(post.id);
        console.log(`Deleted post with ID: ${post.id}`);
      }

      // Clear references
      reaction = null;
      post = null;
    });
  });

  describe("Multiple Subcollections", () => {
    let post: Entity<Post> | null = null;
    let commentsRepo: EntityRepository<Comment>;
    let reactionsRepo: EntityRepository<Reaction>;
    let comment: Entity<Comment> | null = null;
    let reaction: Entity<Reaction> | null = null;

    // Cleanup after tests
    afterAll(async () => {
      try {
        // Delete the comment and reaction first if they exist
        if (comment?.id && post?.id) {
          const commentRepo = BurnKit.getSubcollectionRepository(
            Comment,
            post.id
          );
          await commentRepo.delete(comment.id);
          console.log(`Cleaned up comment ${comment.id}`);
        }

        if (reaction?.id && post?.id) {
          const reactionRepo = BurnKit.getSubcollectionRepository(
            Reaction,
            post.id
          );
          await reactionRepo.delete(reaction.id);
          console.log(`Cleaned up reaction ${reaction.id}`);
        }

        // Then delete the post
        if (post?.id) {
          const postRepo = BurnKit.getRepository(Post);
          await postRepo.delete(post.id);
          console.log(`Cleaned up post ${post.id}`);
        }
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    });

    test("should create a post with multiple subcollections", async () => {
      // Initialize the repository here
      const postRepo = BurnKit.getRepository(Post);

      post = await postRepo.create({
        title: "Testing Multiple Subcollections",
        content: "This is a test post for multiple subcollections",
        authorId: "test-user-789",
        tags: ["test", "multiple-subcollections"],
        published: true,
      });

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.title).toBe("Testing Multiple Subcollections");
      console.log(`Created post with ID: ${post.id}`);
    });

    test("should get repositories for both subcollections", async () => {
      expect(post).not.toBeNull();
      commentsRepo = BurnKit.getSubcollectionRepository(Comment, post!.id);
      reactionsRepo = BurnKit.getSubcollectionRepository(Reaction, post!.id);

      expect(commentsRepo).toBeDefined();
      expect(reactionsRepo).toBeDefined();
    });

    test("should create a comment in the comments subcollection", async () => {
      comment = await commentsRepo.create({
        content: "This is a test comment for multiple subcollections",
        authorName: "Test User",
      });

      expect(comment).toBeDefined();
      expect(comment.id).toBeDefined();
      expect(comment.content).toBe(
        "This is a test comment for multiple subcollections"
      );
      console.log(`Created comment with ID: ${comment.id}`);
    });

    test("should create a reaction in the reactions subcollection", async () => {
      reaction = await reactionsRepo.create({
        type: "wow",
      });

      expect(reaction).toBeDefined();
      expect(reaction.id).toBeDefined();
      expect(reaction.type).toBe("wow");
      console.log(`Created reaction with ID: ${reaction.id}`);
    });

    test("should find entities in both subcollections", async () => {
      const foundComment = await commentsRepo.findById(comment!.id);
      const foundReaction = await reactionsRepo.findById(reaction!.id);

      expect(foundComment).toBeDefined();
      expect(foundComment!.id).toBe(comment!.id);
      expect(foundComment!.content).toBe(
        "This is a test comment for multiple subcollections"
      );

      expect(foundReaction).toBeDefined();
      expect(foundReaction!.id).toBe(reaction!.id);
      expect(foundReaction!.type).toBe("wow");
    });

    test("should clean up subcollections and post", async () => {
      // Delete the comment and reaction
      if (comment) {
        await commentsRepo.delete(comment.id);
        console.log(`Deleted comment with ID: ${comment.id}`);
      }

      if (reaction) {
        await reactionsRepo.delete(reaction.id);
        console.log(`Deleted reaction with ID: ${reaction.id}`);
      }

      // Delete the post
      if (post) {
        const postRepo = BurnKit.getRepository(Post);
        await postRepo.delete(post.id);
        console.log(`Deleted post with ID: ${post.id}`);
      }

      // Clear references
      comment = null;
      reaction = null;
      post = null;
    });
  });
});
