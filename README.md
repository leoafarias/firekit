# BurnKit

[![npm version](https://badge.fury.io/js/burnkit.svg)](https://badge.fury.io/js/burnkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

BurnKit is a powerful, decorator-based TypeScript SDK for Firebase that provides a clean, type-safe API for working with both Firestore and the Realtime Database. Designed with a forward-thinking approach, BurnKit simplifies data modeling, validation, and querying while embracing modern best practices.

## Features

- **TypeScript Decorators** for intuitive entity and field mapping
- **Type-Safe Queries** with a robust, chainable query builder
- **Automatic Data Validation & Transformation** using class-transformer-validator
- **Repository Pattern** for clean, maintainable data access
- **Batch Operations** for efficient bulk updates
- **Enhanced Subcollection Support** with dedicated decorators and metadata utilities
- **Nested Entity Support** for managing complex relationships
- **Realtime Database Integration** with comprehensive CRUD and query capabilities

## Installation

```bash
npm install burnkit firebase-admin reflect-metadata
# or
yarn add burnkit firebase-admin reflect-metadata
```

Note: BurnKit requires reflect-metadata for decorators to function properly. Ensure it is imported once in your application's entry point.

## Quick Start

### Initialize Firebase

```typescript
import * as admin from "firebase-admin";
import "reflect-metadata"; // Ensure this is imported once

admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});
```

### Define Entity Models

BurnKit leverages decorators to define your Firestore and Realtime Database entities effortlessly. For example:

```typescript
import {
  Collection,
  Field,
  ID,
  CreatedAt,
  UpdatedAt,
  Subcollection,
} from "burnkit";

@Collection("users")
class User {
  @ID()
  id: string;

  @Field()
  name: string;

  @Field({ index: true })
  email: string;

  @Field()
  age: number;

  @Field({
    transformer: {
      toFirestore: (roles: string[]) => roles.join(","),
      fromFirestore: (value: string) => (value ? value.split(",") : []),
    },
  })
  roles: string[];

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  // Optional nested entity
  profile?: UserProfile;
}

@Collection("posts")
class Post {
  @ID()
  id: string;

  @Field()
  title: string;

  @Field()
  content: string;

  @Field()
  authorId: string;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  // Non-persisted field to hold comments
  comments?: Comment[];
}

// Define a subcollection for comments using the new Subcollection decorator
@Subcollection(Post)
class Comment {
  @ID()
  id: string;

  @Field()
  content: string;

  @Field()
  authorId: string;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

// Customize the subcollection name if desired
@Subcollection(Post, "post-comments")
class CustomComment {
  // Define fields as needed
}
```

### Use the Repository

BurnKit's repository pattern simplifies CRUD operations and query building:

```typescript
import { BurnKit } from "burnkit";

// Obtain a repository for the User entity
const userRepo = BurnKit.getRepository(User);

// Create a new user
async function createUser() {
  const newUser = await userRepo.create({
    name: "John Doe",
    email: "john@example.com",
    age: 30,
    roles: ["user"],
  });
  console.log(`Created user with ID: ${newUser.id}`);
  return newUser;
}

// Retrieve a user by ID
async function findUser(id: string) {
  const user = await userRepo.findById(id);
  if (user) {
    console.log(`Found user: ${user.name}`);
  }
  return user;
}

// Query users with type-safe queries
async function findActiveUsers() {
  const users = await userRepo
    .query()
    .where("age", ">", 18)
    .where("roles", "array-contains", "active")
    .orderBy("name")
    .limit(10)
    .get();

  console.log(`Found ${users.length} active users`);
  return users;
}

// Update a user's details
async function updateUser(id: string) {
  await userRepo.update(id, {
    name: "John Smith",
    age: 31,
  });
  console.log("User updated");
}

// Delete a user
async function deleteUser(id: string) {
  await userRepo.delete(id);
  console.log("User deleted");
}
```

### Working with Subcollections

BurnKit streamlines working with subcollections using dedicated decorators and helper functions. In addition to using the subcollection decorator, you can generate Firestore paths using metadata utilities:

```typescript
import { BurnKit } from "burnkit";

// Get the repository for posts
const postRepo = BurnKit.getRepository(Post);

// Create a post
const post = await postRepo.create({
  title: "Getting Started with BurnKit",
  content: "BurnKit is an innovative TypeScript SDK for Firebase...",
  authorId: "user123",
});

// Retrieve a repository for the comments subcollection of a specific post
const commentsRepo = BurnKit.getSubcollectionRepository(Comment, post.id);

// Add a comment to the post
const comment = await commentsRepo.create({
  content: "Great article!",
  authorId: "user456",
});

// Retrieve all comments for the post
const comments = await commentsRepo.findAll();
```

For cases where you need to generate a subcollection path manually, use:

```typescript
import { buildSubcollectionPath } from "burnkit";

const path = buildSubcollectionPath(Comment, "postId123");
console.log("Subcollection path:", path);
```

### Working with Nested Entities

BurnKit also supports managing nested entities, making it easy to model and interact with related data:

```typescript
import { NestedEntityRepository, BurnKit } from "burnkit";

const userProfileRepo = new NestedEntityRepository(
  User, // Parent entity class
  UserProfile, // Child entity class
  "profile", // Field name in User to store the profile
  (userId) => `users/${userId}/profile` // Path builder for the nested collection
);

async function createUserWithProfile() {
  const userData = {
    name: "Jane Doe",
    email: "jane@example.com",
    age: 28,
    roles: ["user"],
  };

  const profileData = {
    bio: "Software engineer and avid hiker",
    avatarUrl: "https://example.com/avatar.jpg",
    phoneNumber: "+1234567890",
  };

  const user = await userProfileRepo.createWithNested(userData, profileData);
  console.log(`Created user with profile: ${user.id}`);
  return user;
}

async function loadUserWithProfile(userId: string) {
  const user = await userProfileRepo.loadWithNested(userId);
  if (user && user.profile) {
    console.log(`User: ${user.name}`);
    console.log(`Profile Bio: ${user.profile.bio}`);
  }
  return user;
}
```

### Using the Realtime Database

BurnKit's Realtime Database integration provides comprehensive CRUD operations and advanced query capabilities:

```typescript
import { RealtimeRepository } from "burnkit";

interface ChatMessage {
  message: string;
  sender: string;
  timestamp: number;
  isRead?: boolean;
}

const chatRepo = new RealtimeRepository<ChatMessage>("chats");

// Add a new chat message
async function sendMessage(sender: string, message: string) {
  const newMessage = await chatRepo.push({
    message,
    sender,
    timestamp: Date.now(),
  });
  console.log(`Message sent with ID: ${newMessage.id}`);
  return newMessage;
}

// Listen for real-time updates
function listenForMessages(callback: (messages: ChatMessage[]) => void) {
  const unsubscribe = chatRepo
    .query()
    .orderByChild("timestamp")
    .onValue(callback);
  return unsubscribe;
}
```

## API Documentation

### Decorators

#### @Collection(name: string)

Marks a class as a Firestore collection.

```typescript
@Collection("users")
class User {}
```

#### @Subcollection(parentEntity, collectionName?)

Marks a class as a Firestore subcollection. The subcollection name defaults to the lowercase class name if not specified.

```typescript
// Basic usage
@Subcollection(Post)
class Comment {}

// With custom collection name
@Subcollection(Post, "post-comments")
class CustomComment {}
```

#### @Field(options?: FieldOptions)

Marks a property as a Firestore document field.

```typescript
@Field({ index: true })
email: string;
```

Options include:

- name?: string — Custom field name in Firestore
- index?: boolean — Enable indexing for this field
- transformer?: { toFirestore?, fromFirestore? } — Custom transformers

#### @ID()

Marks a property as the document ID.

```typescript
@ID()
id: string;
```

#### @CreatedAt()

Automatically sets the creation timestamp.

```typescript
@CreatedAt()
createdAt: Date;
```

#### @UpdatedAt()

Automatically updates the timestamp on modifications.

```typescript
@UpdatedAt()
updatedAt: Date;
```

### Utility Functions

#### getSubcollectionMetadata(target: any): SubcollectionMetadata | undefined

Retrieves metadata for a subcollection from a class.

#### buildSubcollectionPath(childEntity: any, parentId: string): string

Generates a Firestore path to a subcollection for a given parent document.

```typescript
import { buildSubcollectionPath } from "burnkit";
const path = buildSubcollectionPath(Comment, "parentDocId");
```

### BurnKit Functions

#### BurnKit.getRepository<T>(entityClass: new () => T): EntityRepository<T>

Retrieves a repository for a specified entity.

```typescript
const userRepo = BurnKit.getRepository(User);
```

#### BurnKit.getSubcollectionRepository<T>(entityClass: new () => T, parentId: string): EntityRepository<T>

Retrieves a repository for a subcollection belonging to a specific parent document.

```typescript
const commentsRepo = BurnKit.getSubcollectionRepository(Comment, postId);
```

#### BurnKit.clearCache(): void

Clears the internal repository cache.

```typescript
BurnKit.clearCache();
```

### EntityRepository Methods

- create(data: Partial<T>, id?: string): Promise<T> — Create a new entity.
- findById(id: string): Promise<T | null> — Retrieve an entity by ID.
- getById(id: string): Promise<T> — Retrieve an entity by ID (throws if not found).
- update(id: string, data: Partial<T>): Promise<void> — Update an entity.
- delete(id: string): Promise<void> — Delete an entity.
- findAll(): Promise<T[]> — Retrieve all entities in a collection.
- query(): QueryBuilder<T> — Create a query builder for advanced queries.
- batch(operations: (batch: FirestoreBatchHelper<T>) => void): Promise<void> — Execute batch operations.

### QueryBuilder Methods

- where(field: string, operator: FirestoreOperator, value: any): QueryBuilder<T> — Add filtering criteria.
- orderBy(field: string, direction?: "asc" | "desc"): QueryBuilder<T> — Sort query results.
- limit(limit: number): QueryBuilder<T> — Limit the number of documents.
- offset(offset: number): QueryBuilder<T> — Skip a number of documents.
- get(): Promise<T[]> — Execute the query.
- getFirst(): Promise<T | null> — Retrieve the first matching document.
- count(): Promise<number> — Count matching documents.

### RealtimeRepository Methods

- push(data: Partial<T>): Promise<T & { id: string }> — Create a new entry with an auto-generated ID.
- set(id: string, data: Partial<T>): Promise<void> — Create or update an entry.
- update(id: string, data: Partial<T>): Promise<void> — Update an existing entry.
- get(id: string): Promise<(T & { id: string }) | null> — Retrieve an entry by ID.
- getAll(): Promise<(T & { id: string })[]> — Retrieve all entries.
- remove(id: string): Promise<void> — Delete an entry.
- query(): RealtimeQueryBuilder<T> — Create a query builder for the Realtime Database.

### RealtimeQueryBuilder Methods

- orderByChild(child: string): RealtimeQueryBuilder<T> — Order results by a specific child key.
- equalTo(child: string, value: string | number | boolean | null): RealtimeQueryBuilder<T> — Filter results by equality.
- between(child: string, startValue: any, endValue: any): RealtimeQueryBuilder<T> — Filter results within a range.
- limitToFirst(limit: number): RealtimeQueryBuilder<T> — Limit to the first N results.
- limitToLast(limit: number): RealtimeQueryBuilder<T> — Limit to the last N results.
- startAt(value: any): RealtimeQueryBuilder<T> — Start results at a specific value.
- endAt(value: any): RealtimeQueryBuilder<T> — End results at a specific value.
- get(): Promise<(T & { id: string })[]> — Execute the query.
- onValue(callback: (data: (T & { id: string })[]) => void): () => void — Listen for real-time updates.

## Firebase Setup

1. Create a Firebase Project: Visit the Firebase Console.
2. Generate a Service Account Key:
   - Navigate to Project Settings > Service Accounts.
   - Click "Generate New Private Key" and download the JSON file.
3. Configure Firebase:

```bash
npm run setup-firebase
```

4. Test Firebase Connection:

```bash
npm run test-firebase
```

5. Run Example Files:

```bash
ts-node examples/main-collection-example.ts
```

Security Note: The serviceAccountKey.json file contains sensitive information and should not be committed to version control. It is excluded via .gitignore.

## CI/CD Pipeline

BurnKit utilizes GitHub Actions for continuous integration and deployment.

### Automated Workflow

1. Testing & Linting: On each push or pull request to the main branch:
   - Unit tests and Firebase connectivity tests are run.
   - Code linting and TypeScript checks are executed.
2. Deployment: When a new version tag (e.g., v1.0.0) is pushed:
   - All tests and linting are performed.
   - If successful, the package is published to npm.

### Setting Up Secrets

Configure the following GitHub secrets:

- FIREBASE_SERVICE_ACCOUNT_KEY: Base64 encoded Firebase service account key JSON.
- NPM_TOKEN: Your npm access token.

### Manual Release Process

1. Update the version in package.json.
2. Commit changes: git commit -am "Release v1.0.0".
3. Tag the release: git tag v1.0.0.
4. Push commits and tags: git push && git push --tags.
5. GitHub Actions will automatically publish the package to npm.

---

This section is automatically maintained by BurnKit documentation.
