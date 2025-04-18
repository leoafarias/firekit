import { ClassType } from "class-transformer-validator";
import { getCollectionName } from "../../decorators";
import { IDatabaseAdapter, IRepository } from "../../interfaces";
import { InMemoryRepository } from "./in-memory.repository";

/**
 * In-memory database adapter implementation.
 * Useful for testing, prototyping, and offline development.
 */
export class InMemoryAdapter implements IDatabaseAdapter {
  /**
   * In-memory database store.
   * Data is organized by collection name and then by entity ID.
   */
  private dbStore: { [collectionName: string]: Map<string, any> } = {};

  /**
   * Flag indicating whether the adapter is connected.
   */
  private connected: boolean = false;

  /**
   * Connect to the in-memory database.
   * @param options - Optional initialization options
   * @returns Promise resolving when connected
   */
  async connect(options?: {
    initialData?: Record<string, Record<string, any>>;
  }): Promise<void> {
    if (this.connected) {
      throw new Error("InMemoryAdapter is already connected");
    }

    // Initialize empty database
    this.dbStore = {};

    // Load initial data if provided
    if (options?.initialData) {
      for (const [collectionName, entities] of Object.entries(
        options.initialData
      )) {
        const collection = new Map<string, any>();
        for (const [id, data] of Object.entries(entities)) {
          collection.set(id, { ...data });
        }
        this.dbStore[collectionName] = collection;
      }
    }

    this.connected = true;
  }

  /**
   * Disconnect from the in-memory database.
   * This clears all data in the store.
   * @returns Promise resolving when disconnected
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      throw new Error("InMemoryAdapter is not connected");
    }

    // Clear all data
    this.dbStore = {};
    this.connected = false;
  }

  /**
   * Get a repository for the specified entity class.
   * @param entityClass - Entity class constructor
   * @returns Repository instance
   * @throws Error if not connected or if entity class is not properly decorated
   */
  getRepository<T extends object>(entityClass: ClassType<T>): IRepository<T> {
    if (!this.connected) {
      throw new Error("InMemoryAdapter is not connected");
    }

    if (!entityClass) {
      throw new Error("Entity class must be provided");
    }

    // Get collection name from entity class
    const collectionName = getCollectionName(entityClass);
    if (!collectionName) {
      throw new Error(
        `Class ${entityClass.name} is not decorated with @Collection`
      );
    }

    // Create collection if it doesn't exist
    if (!this.dbStore[collectionName]) {
      this.dbStore[collectionName] = new Map<string, any>();
    }

    // Create and return repository instance
    return new InMemoryRepository<T>(entityClass, this.dbStore[collectionName]);
  }

  /**
   * Check if the adapter is connected.
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get direct access to the in-memory store for testing/debugging.
   * @returns The in-memory database store
   */
  getStore(): { [collectionName: string]: Map<string, any> } {
    return this.dbStore;
  }

  /**
   * Clear all data in a specific collection.
   * @param collectionName - Collection name to clear
   * @throws Error if the collection does not exist
   */
  clearCollection(collectionName: string): void {
    if (!this.connected) {
      throw new Error("InMemoryAdapter is not connected");
    }

    if (!this.dbStore[collectionName]) {
      throw new Error(`Collection ${collectionName} does not exist`);
    }

    this.dbStore[collectionName].clear();
  }

  /**
   * Clear all data in the database.
   */
  clearAllData(): void {
    if (!this.connected) {
      throw new Error("InMemoryAdapter is not connected");
    }

    for (const collectionName in this.dbStore) {
      this.dbStore[collectionName].clear();
    }
  }
}
