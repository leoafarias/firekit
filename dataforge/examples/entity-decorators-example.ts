// @ts-nocheck
/**
 * ENTITY DECORATOR PATTERN EXPLAINED
 *
 * This example demonstrates how to use the Collection and Subcollection decorators
 * to create a clean and maintainable domain model. The @Entity decorator is no longer needed.
 *
 * DECORATORS:
 *
 * 1. @Collection({ name: "collection-name" }) - Marks a class as a top-level collection
 *    - Automatically adds standard entity fields (id, createdAt, updatedAt)
 *    - Required for repository operations
 *    - Defines how the class is stored in the database
 *
 * 2. @Subcollection({ name: "subcollection-name", parent: ParentClass }) - Marks a class as a subcollection
 *    - Automatically adds standard entity fields (id, createdAt, updatedAt)
 *    - Defines a nested collection under a parent
 *    - Allows for hierarchical data modeling
 *
 * BENEFITS:
 *
 * - Simpler API: Only one decorator needed per entity type
 * - Separation of concerns: Entity structure vs. storage location
 * - DRY code: No need to repeat standard fields
 * - Type safety: TypeScript knows about the fields
 *
 * EXAMPLES BELOW:
 */

import { IsEmail, IsString, Length, MinLength } from "class-validator";
import "reflect-metadata";
import { InMemoryAdapter, Stash } from "../src";
import { Collection, Field, Subcollection } from "../src/decorators";

/**
 * Example of a main entity using @Collection
 */
@Collection({ name: "users" })
class User {
  // These properties are declared for type-checking
  // The @Collection decorator automatically applies the appropriate decorators
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;

  @Field()
  @IsString()
  @Length(2, 50)
  name!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field({
    transformer: {
      toDatabaseFormat: (roles: string[]) => (roles ? roles.join(",") : ""),
      fromDatabaseFormat: (value: string | any) =>
        typeof value === "string"
          ? value
            ? value.split(",")
            : []
          : Array.isArray(value)
          ? value
          : [],
    },
  })
  roles!: string[];
}

/**
 * Example of a subcollection entity using @Subcollection
 */
@Subcollection({
  name: "posts",
  parent: User,
  parentField: "userId",
})
class Post {
  // These properties are declared for type-checking
  // The @Subcollection decorator automatically applies the appropriate decorators
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;

  @Field()
  @IsString()
  @Length(3, 100)
  title!: string;

  @Field()
  @IsString()
  @MinLength(10)
  content!: string;

  @Field()
  @IsString()
  userId!: string; // Reference to parent User
}

/**
 * Example of a nested subcollection
 */
@Subcollection({
  name: "comments",
  parent: Post,
  parentField: "postId",
})
class Comment {
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;

  @Field()
  @IsString()
  content!: string;

  @Field()
  @IsString()
  postId!: string; // Reference to parent Post

  @Field()
  @IsString()
  authorId!: string; // Reference to User
}

/**
 * Example demonstrating usage with the Stash API
 */
async function demoUsage() {
  // Setup
  const adapter = new InMemoryAdapter();
  await Stash.connect(adapter);

  // Get repositories
  const userRepo = Stash.getRepository<User>(User);
  const postRepo = Stash.getRepository<Post>(Post);
  const commentRepo = Stash.getRepository<Comment>(Comment);

  // Create a user
  const user = await userRepo.create({
    name: "John Doe",
    email: "john@example.com",
    roles: ["user", "admin"],
  });

  console.log("Created user:", user.id);

  // Create a post by the user
  const post = await postRepo.create({
    title: "My First Post",
    content: "This is the content of my first post.",
    userId: user.id,
  });

  console.log("Created post:", post.id);

  // Create a comment on the post
  const comment = await commentRepo.create({
    content: "Great post!",
    postId: post.id,
    authorId: user.id,
  });

  console.log("Created comment:", comment.id);

  // Query all posts by this user
  const userPosts = await postRepo
    .query()
    .where("userId", "==", user.id)
    .getResults();

  console.log(`Found ${userPosts.length} posts by user ${user.name}`);

  // Query all comments on this post
  const postComments = await commentRepo
    .query()
    .where("postId", "==", post.id)
    .getResults();

  console.log(`Found ${postComments.length} comments on post "${post.title}"`);

  // Clean up
  await Stash.disconnect();
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demoUsage().catch(console.error);
}
