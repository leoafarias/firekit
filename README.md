# TorchKit

[![npm version](https://badge.fury.io/js/torchkit.svg)](https://badge.fury.io/js/torchkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A decorator-based TypeScript SDK for Firebase that provides a clean, type-safe API for working with Firestore and Realtime Database.

## Features

- **TypeScript Decorators** for simple entity and field mapping
- **Type-Safe Queries** with strongly typed fields and values
- **Automatic Timestamps** for created and updated fields
- **Repository Pattern** for clean data access
- **Batch Operations** for efficient data manipulation
- **Custom Field Transformers** for complex data types
- **Subcollection Support** with dedicated decorator for defining subcollections
- **Nested Entity Support** for managing subcollections and relationships
- **Realtime Database Support** for working with Firebase RTDB

## Installation

```bash
npm install torchkit firebase-admin reflect-metadata
# or
yarn add torchkit firebase-admin reflect-metadata
```

> **Note**: TorchKit requires `reflect-metadata` for decorators to work properly. Make sure to import it once in your application's entry point.

## Quick Start

### Initialize Firebase

```typescript
// Initialize Firebase Admin SDK in your application's entry point
import * as admin from "firebase-admin";
import "reflect-metadata"; // Important: Import this once in your app

admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});
```

### Define Entity Models

```typescript
import {
  Collection,
  Field,
  ID,
  CreatedAt,
  UpdatedAt,
  Subcollection,
} from "torchkit";

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

  // Non-persisted field to hold the profile data
  profile?: UserProfile;
}

// Define a subcollection for posts
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

// Define a comment as a subcollection of Post
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

// You can also customize the subcollection name
@Subcollection(Post, "post-comments")
class CustomComment {
  // fields...
}
```

### Use the Repository

```typescript
import { TorchKit } from "torchkit";

// Get a repository for the User entity
const userRepo = TorchKit.getRepository(User);

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

// Find a user by ID
async function findUser(id: string) {
  const user = await userRepo.findById(id);
  if (user) {
    console.log(`Found user: ${user.name}`);
  }
  return user;
}

// Query users
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

// Update a user
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

```typescript
import { TorchKit } from "torchkit";

// First, get a regular repository for posts
const postRepo = TorchKit.getRepository(Post);

// Create a post
const post = await postRepo.create({
  title: "Getting Started with TorchKit",
  content: "TorchKit is an amazing TypeScript SDK for Firebase...",
  authorId: "user123",
});

// Get a repository for the comments subcollection of a specific post
const commentsRepo = TorchKit.getSubcollectionRepository(Comment, post.id);

// Add a comment to the post
const comment = await commentsRepo.create({
  content: "Great article!",
  authorId: "user456",
});

// Get all comments for the post
const comments = await commentsRepo.findAll();

// Query for specific comments
const recentComments = await commentsRepo
  .query()
  .orderBy("createdAt", "desc")
  .limit(5)
  .get();

// Get a post and load its comments
const postWithComments = await postRepo.findById(post.id);
if (postWithComments) {
  // Load comments into the post object
  postWithComments.comments = await commentsRepo.findAll();
}
```

### Working with Nested Entities

```typescript
import { NestedEntityRepository, TorchKit } from "torchkit";

// Create a nested entity repository for users and their profiles
const userProfileRepo = new NestedEntityRepository(
  User, // Parent entity class
  UserProfile, // Child entity class
  "profile", // Field name in User to store the profile
  (userId) => `users/${userId}/profile` // Path builder for the nested collection
);

// Create a user with a profile
async function createUserWithProfile() {
  const userData = {
    name: "Jane Doe",
    email: "jane@example.com",
    age: 28,
    roles: ["user"],
  };

  const profileData = {
    bio: "Software engineer and hiking enthusiast",
    avatarUrl: "https://example.com/avatar.jpg",
    phoneNumber: "+1234567890",
  };

  const user = await userProfileRepo.createWithNested(userData, profileData);
  console.log(`Created user with profile: ${user.id}`);
  console.log(`Profile bio: ${user.profile?.bio}`);

  return user;
}

// Load a user with their profile
async function loadUserWithProfile(userId: string) {
  const user = await userProfileRepo.loadWithNested(userId);

  if (user && user.profile) {
    console.log(`User: ${user.name}`);
    console.log(`Profile: ${user.profile.bio}`);
  }

  return user;
}
```

### Using the Realtime Database

```typescript
import { RealtimeRepository } from "torchkit";

// Create a repository for the realtime database
const chatRepo = new RealtimeRepository<{
  message: string;
  sender: string;
  timestamp: number;
}>("chats");

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

// Listen for new messages in real-time
function listenForMessages(callback: (messages: any[]) => void) {
  const unsubscribe = chatRepo
    .query()
    .orderByChild("timestamp")
    .onValue(callback);

  // Return unsubscribe function to stop listening
  return unsubscribe;
}
```

## API Documentation

### Decorators

#### `@Collection(name: string)`

Marks a class as a Firestore collection.

```typescript
@Collection("users")
class User {}
```

#### `@Subcollection(parentEntity, collectionName?)`

Marks a class as a Firestore subcollection.

```typescript
// Basic usage - will use lowercase class name as collection name
@Subcollection(Post)
class Comment {}

// With custom collection name
@Subcollection(Post, "post-comments")
class CustomComment {}
```

#### `@Field(options?: FieldOptions)`

Marks a property as a field in the Firestore document.

```typescript
@Field({ index: true })
email: string;
```

Options:

- `name?: string` - Custom field name in Firestore
- `index?: boolean` - Whether the field is indexed
- `transformer?: { toFirestore?, fromFirestore? }` - Custom transformers for the field

#### `@ID()`

Marks a property as the document ID field.

```typescript
@ID()
id: string;
```

#### `@CreatedAt()`

Marks a property to be automatically set with the creation timestamp.

```typescript
@CreatedAt()
createdAt: Date;
```

#### `@UpdatedAt()`

Marks a property to be automatically updated with the update timestamp.

```typescript
@UpdatedAt()
updatedAt: Date;
```

### TorchKit

#### `getRepository<T>(entityClass: new () => T): EntityRepository<T>`

Gets a repository for an entity class.

```typescript
const userRepo = TorchKit.getRepository(User);
```

#### `getSubcollectionRepository<T>(entityClass: new () => T, parentId: string): EntityRepository<T>`

Gets a repository for a subcollection of a specific parent document.

```typescript
const commentsRepo = TorchKit.getSubcollectionRepository(Comment, postId);
```

#### `clearCache(): void`

Clears the repository cache.

```typescript
TorchKit.clearCache();
```

### EntityRepository

#### `create(data: Partial<T>, id?: string): Promise<T>`

Creates a new entity.

```typescript
const user = await userRepo.create(
  {
    name: "John Doe",
    email: "john@example.com",
  },
  "custom-id"
); // ID is optional
```

#### `findById(id: string): Promise<T | null>`

Finds an entity by ID, returns null if not found.

```typescript
const user = await userRepo.findById("user-id");
```

#### `getById(id: string): Promise<T>`

Gets an entity by ID, throws if not found.

```typescript
try {
  const user = await userRepo.getById("user-id");
} catch (error) {
  // Entity not found
}
```

#### `update(id: string, data: Partial<T>): Promise<void>`

Updates an entity.

```typescript
await userRepo.update("user-id", {
  name: "Updated Name",
});
```

#### `delete(id: string): Promise<void>`

Deletes an entity.

```typescript
await userRepo.delete("user-id");
```

#### `findAll(): Promise<T[]>`

Finds all entities in the collection.

```typescript
const allUsers = await userRepo.findAll();
```

#### `query(): QueryBuilder<T>`

Creates a query builder for the entity.

```typescript
const users = await userRepo.query().where("age", ">", 18).get();
```

### NestedEntityRepository

#### `constructor(parentEntity, childEntity, childField, pathBuilder)`

Creates a repository for managing nested entities.

```typescript
const userProfileRepo = new NestedEntityRepository(
  User, // Parent entity class
  UserProfile, // Child entity class
  "profile", // Field name in User to store the profile
  (userId) => `users/${userId}/profile` // Path builder for the nested collection
);
```

#### `loadWithNested(parentId: string): Promise<T | null>`

Loads a parent entity with its nested child entity(ies).

```typescript
const userWithProfile = await userProfileRepo.loadWithNested("user-id");
```

#### `createWithNested(parentData: Partial<T>, childData: Partial<R>): Promise<T>`

Creates a parent entity with a nested child entity.

```typescript
const user = await userProfileRepo.createWithNested(
  { name: "John Doe" },
  { bio: "Software engineer" }
);
```

### RealtimeRepository

#### `constructor(path: string)`

Creates a repository for Firebase Realtime Database.

```typescript
const chatRepo = new RealtimeRepository<ChatMessage>("chats");
```

#### `push(data: Partial<T>): Promise<T & { id: string }>`

Creates a new entity with auto-generated ID.

```typescript
const message = await chatRepo.push({
  message: "Hello",
  sender: "John",
});
```

#### `query(): RealtimeQueryBuilder<T>`

Creates a query builder for the realtime database.

```typescript
const messages = await chatRepo
  .query()
  .orderByChild("timestamp")
  .limitToLast(10)
  .get();
```

## License

MIT

## Firebase Setup

To use TorchKit with your Firebase project, you need to set up Firebase credentials:

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)

2. Generate a service account key:

   - Go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the downloaded JSON file

3. Run the setup script to configure your Firebase credentials:

   ```
   npm run setup-firebase
   ```

   This script will guide you through the process of setting up your Firebase configuration.

4. Test your Firebase connection:

   ```
   npm run test-firebase
   ```

5. Run the example files:
   ```
   ts-node examples/main-collection-example.ts
   ts-node examples/relationships-example.ts
   ```

Note: The `serviceAccountKey.json` file contains sensitive information and should not be committed to your repository. It is already added to the `.gitignore` file.

## Usage

// Add usage instructions here

## Firebase Realtime Database

TorchKit supports Firebase Realtime Database operations through the `RealtimeRepository` class. This repository provides CRUD operations, advanced query capabilities, and real-time updates for interacting with your Firebase RTDB.

### Features

- **Initialization**: Configure Firebase Admin SDK using your service account and database URL.
- **CRUD Operations**: Easily create, read, update, and delete entries with methods like `push()`, `set()`, `get()`, `update()`, and `remove()`.
- **Querying**: Build complex queries with `orderByChild()`, `equalTo()`, `startAt()`, `limitToLast()`, and `between()` methods.
- **Real-time Updates**: Listen for live updates with the `onValue()` listener.

### Usage Example

```typescript
import { RealtimeRepository } from "torchkit";

interface ChatMessage {
  text: string;
  sender: string;
  timestamp: number;
  isRead?: boolean;
}

const chatRepo = new RealtimeRepository<ChatMessage>("chats");

// Create a new chat message
const newMessage = await chatRepo.push({
  text: "Hello, world!",
  sender: "user-123",
  timestamp: Date.now(),
});

// Listen for real-time updates
const unsubscribe = chatRepo
  .query()
  .orderByChild("timestamp")
  .onValue((messages) => {
    console.log("Real-time messages:", messages);
  });

// Delete the message and clean up
await chatRepo.remove(newMessage.id);
unsubscribe();
```

### Setup

Ensure that your Firebase project has the Realtime Database enabled. Configure your Firebase Admin SDK with the correct `databaseURL`:

```typescript
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL: `https://${
    (serviceAccount as any).project_id
  }-default-rtdb.firebaseio.com`,
});
```

This configuration is essential for the Realtime Database to function correctly.

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

### Automated Workflow

1. **Testing & Linting**: On every push and pull request to the main branch, the workflow:

   - Runs all unit tests
   - Verifies Firebase connectivity
   - Executes TypeScript Firebase tests (Firestore and Realtime Database)
   - Performs code linting

2. **Deployment**: When a new version tag (e.g., `v1.0.0`) is pushed:
   - All tests and linting are run
   - If successful, the package is automatically published to npm

### Setting Up Secrets

To use the CI/CD pipeline, you need to set up the following GitHub secrets:

- `FIREBASE_SERVICE_ACCOUNT_KEY`: Your Firebase service account key JSON (base64 encoded)
- `NPM_TOKEN`: Your npm access token for publishing

### Manual Release Process

1. Update the version in `package.json`
2. Commit changes: `git commit -am "Release v1.0.0"`
3. Create a new tag: `git tag v1.0.0`
4. Push changes and tags: `git push && git push --tags`
5. GitHub Actions will automatically publish to npm

---

_This section is automatically maintained by TorchKit documentation._
