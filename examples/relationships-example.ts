import "reflect-metadata";
import {
  Collection,
  CreatedAt,
  Field,
  Firekit,
  ID,
  NestedEntityRepository,
  UpdatedAt,
} from "../src";
import { initializeFirebase } from "../src/firebase-init";

// Initialize Firebase Admin SDK
initializeFirebase();

// Define user entity
@Collection("users")
class User {
  @ID()
  id!: string;

  @Field()
  displayName!: string;

  @Field({ index: true })
  email!: string;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;

  // Non-persisted field to hold profile data
  profile?: UserProfile;
}

// Define profile as a separate entity in a subcollection
@Collection("profiles")
class UserProfile {
  @ID()
  id!: string;

  @Field()
  bio!: string;

  @Field()
  avatarUrl!: string;

  @Field()
  phoneNumber!: string;

  @Field()
  location!: string;

  @Field()
  website!: string;

  @Field()
  socialLinks!: Record<string, string>;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;
}

// Define post entity with a relationship to user
@Collection("posts")
class Post {
  @ID()
  id!: string;

  @Field()
  title!: string;

  @Field()
  content!: string;

  @Field({ index: true })
  authorId!: string;

  @Field({ index: true })
  tags!: string[];

  @Field({ index: true })
  published!: boolean;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;

  // Non-persisted field to hold the author data
  author?: User;
}

// Example usage
async function runExample() {
  try {
    // Get user repository
    const userRepo = Firekit.getRepository(User);
    const postRepo = Firekit.getRepository(Post);

    // Create a nested entity repository for users and their profiles
    const userProfileRepo = new NestedEntityRepository<User, UserProfile>(
      User,
      UserProfile,
      "profile",
      (userId) => `users/${userId}/profile`
    );

    // Create a user with profile
    console.log("Creating user with profile...");
    const user = await userProfileRepo.createWithNested(
      {
        displayName: "John Doe",
        email: "john@example.com",
      },
      {
        bio: "Software engineer and tech blogger",
        avatarUrl: "https://example.com/avatar.jpg",
        phoneNumber: "+1234567890",
        location: "New York, NY",
        website: "https://johndoe.com",
        socialLinks: {
          twitter: "https://twitter.com/johndoe",
          github: "https://github.com/johndoe",
          linkedin: "https://linkedin.com/in/johndoe",
        },
      }
    );

    console.log(`Created user: ${user.displayName}`);
    console.log(`User profile: ${user.profile?.bio}`);

    // Create some posts by this user
    console.log("\nCreating posts...");
    const post1 = await postRepo.create({
      title: "Getting Started with Firekit",
      content: "Firekit is an amazing TypeScript SDK for Firebase...",
      authorId: user.id,
      tags: ["firebase", "typescript", "sdk"],
      published: true,
    });
    console.log(`Created post 1: ${post1.title}`);

    const post2 = await postRepo.create({
      title: "Working with Firestore Relationships",
      content: "Learn how to model relationships in Firestore...",
      authorId: user.id,
      tags: ["firebase", "firestore", "data-modeling"],
      published: true,
    });
    console.log(`Created post 2: ${post2.title}`);

    const post3 = await postRepo.create({
      title: "Draft: Advanced Firekit Features",
      content: "This post is still a work in progress...",
      authorId: user.id,
      tags: ["firebase", "advanced"],
      published: false,
    });
    console.log(`Created post 3: ${post3.title}`);

    // Find posts by this author
    console.log("\nSkipping complex query that requires an index...");
    console.log(
      "Please create the index using the URL from the error message and try again later."
    );

    /*
    console.log("\nFinding posts by author...");
    const authorPosts = await postRepo
      .query()
      .where("authorId", "==", user.id)
      .where("published", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    console.log(
      `Found ${authorPosts.length} published posts by ${user.displayName}:`
    );
    authorPosts.forEach((post) => {
      console.log(`- ${post.title}`);
    });
    */

    // Load a user with their profile
    console.log("\nLoading user with profile...");
    const userWithProfile = await userProfileRepo.loadWithNested(user.id);
    if (userWithProfile && userWithProfile.profile) {
      console.log(`User: ${userWithProfile.displayName}`);
      console.log(`Profile: ${userWithProfile.profile.bio}`);
      console.log(`Location: ${userWithProfile.profile.location}`);
      console.log(`Website: ${userWithProfile.profile.website}`);
    }

    // Update user and profile in a single operation
    console.log("\nUpdating user and profile...");
    const updatedUser = await userProfileRepo.updateWithNested(
      user.id,
      { displayName: "John D. Doe" }, // User updates
      { bio: "Senior Software Engineer and Firebase enthusiast" } // Profile updates
    );

    // Verify updates
    console.log(`Updated user: ${updatedUser.displayName}`);
    console.log(`Updated profile: ${updatedUser.profile?.bio}`);

    // Manually enrich a post with author data
    console.log("\nLoading post with author data...");
    const postWithAuthor = await postRepo.findById(post1.id);
    if (postWithAuthor) {
      // Manually load the author with profile
      const author = await userProfileRepo.loadWithNested(
        postWithAuthor.authorId
      );
      if (author) {
        postWithAuthor.author = author;
      }

      console.log(`Post: ${postWithAuthor.title}`);
      console.log(`Author: ${postWithAuthor.author?.displayName}`);
      console.log(`Author bio: ${postWithAuthor.author?.profile?.bio}`);
    }

    // Clean up (optional - for demonstration purposes)
    console.log("\nCleaning up...");
    // Delete posts first
    await postRepo.delete(post1.id);
    await postRepo.delete(post2.id);
    await postRepo.delete(post3.id);

    // Then delete the user and profile
    await userProfileRepo.deleteWithNested(user.id);

    console.log("All data deleted");
    console.log("\nExample completed successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
runExample();
