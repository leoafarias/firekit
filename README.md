# RepoKit

A lightweight, flexible data storage toolkit with pluggable adapters.

## Overview

RepoKit provides a simple, consistent interface for data storage operations while allowing you to easily switch between different storage backends. Whether you need to store data in memory, localStorage, IndexedDB, or a remote API, RepoKit offers a unified approach with minimal overhead.

## Features

- 🔄 **Consistent API** - Same interface regardless of storage backend
- 🔌 **Pluggable Adapters** - Easily switch between storage implementations
- 🪶 **Lightweight** - Minimal dependencies and small footprint
- 🧩 **Modular Design** - Use only what you need
- 📦 **Type-Safe** - Built with TypeScript for better developer experience
- 🧪 **Testable** - Easy to mock for testing

## Installation

```bash
npm install repokit
```

## Quick Start

```typescript
import { createRepository } from "repokit";
import { MemoryAdapter } from "repokit/adapters";

// Create a repository with the memory adapter
const userRepo = createRepository({
  adapter: new MemoryAdapter(),
});

// Store data
await userRepo.set("user-1", { name: "John", email: "john@example.com" });

// Retrieve data
const user = await userRepo.get("user-1");
console.log(user); // { name: 'John', email: 'john@example.com' }

// Check if data exists
const exists = await userRepo.has("user-1"); // true

// Remove data
await userRepo.remove("user-1");
```

## Available Adapters

RepoKit comes with several built-in adapters:

- **MemoryAdapter** - In-memory storage (perfect for testing)
- **LocalStorageAdapter** - Browser localStorage persistence
- **IndexedDBAdapter** - Browser IndexedDB for larger datasets
- **FirestoreAdapter** - Google Firestore integration
- **HttpAdapter** - RESTful API integration

## Creating Custom Adapters

You can easily create your own adapter by implementing the `StorageAdapter` interface:

```typescript
import { StorageAdapter } from "repokit";

class MyCustomAdapter implements StorageAdapter {
  async get(key: string): Promise<any> {
    // Implementation
  }

  async set(key: string, value: any): Promise<void> {
    // Implementation
  }

  async has(key: string): Promise<boolean> {
    // Implementation
  }

  async remove(key: string): Promise<void> {
    // Implementation
  }

  async clear(): Promise<void> {
    // Implementation
  }
}
```

## Advanced Usage

### Collections

RepoKit supports collection-based operations for grouped data:

```typescript
const productCollection = userRepo.collection("products");

// Add items to collection
await productCollection.add({ name: "Laptop", price: 999 });
await productCollection.add({ name: "Phone", price: 699 });

// Query collection
const expensiveProducts = await productCollection.query(
  (item) => item.price > 800
);
```

### Transactions

For adapters that support it, RepoKit provides transaction capabilities:

```typescript
await userRepo.transaction(async (repo) => {
  const user = await repo.get("user-1");
  user.points += 100;
  await repo.set("user-1", user);
});
```

## Why RepoKit?

- **Simplicity**: RepoKit focuses on providing a clean, intuitive API without unnecessary complexity
- **Flexibility**: Switch storage backends without changing your application code
- **Portability**: Works in browsers, Node.js, and React Native environments
- **Performance**: Optimized for efficient data operations

## License

MIT
