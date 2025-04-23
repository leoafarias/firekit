import { Entity } from "../../interfaces/entity.interface";
import { IQueryBuilder } from "../../interfaces/query.interface";
import { AbstractRepository } from "../../repository/base.repository";
import { ClassType } from "../../utils/class.type";
import { InMemoryQueryBuilder } from "./memory-query-builder"; // Import the query builder

// Define the structure for storing the full entity data along with metadata
interface InMemoryStorageEntry {
  entityData: Record<string, unknown>; // Store the plain object representation from _toDatabaseFormat
  createTime: Date;
  updateTime: Date;
  id: string; // id is also present within entityData but kept here for quick access/indexing
}

/**
 * In-memory repository implementation.
 * Stores entities in a Map.
 */
// Updated signature: Removed Data generic, extends AbstractRepository<T>
export class InMemoryRepository<
  T extends Entity
> extends AbstractRepository<T> {
  // In-memory storage using the new entry structure
  protected storage = new Map<string, InMemoryStorageEntry>();

  // Updated constructor: Removed dataDtoClass, updated super() call
  constructor(
    entityClass: ClassType<T>,
    // Optionally allow seeding initial data
    initialStorage?: Map<string, InMemoryStorageEntry> // Keep initialStorage optional for seeding
  ) {
    super(entityClass); // Call super with only entityClass
    if (initialStorage) {
      // If seeding, ensure the provided map matches the expected structure
      // Basic check, could be more robust
      if (initialStorage.size > 0) {
        // Explicitly type firstValue to resolve any type issue
        const firstValue: unknown = initialStorage.values().next().value;
        // Added type check for safety
        if (
          typeof firstValue !== "object" ||
          firstValue === null ||
          !("entityData" in firstValue)
        ) {
          console.warn(
            "InMemoryRepository: Initial storage format might be incompatible. Expected { entityData, createTime, updateTime, id }."
          );
        }
      }
      this.storage = initialStorage;
    }
  }

  // --- Implementation of Abstract Methods ---

  // _save receives the result of _toDatabaseFormat (full entity data)
  protected _save(
    id: string,
    data: Record<string, unknown> // data is the full entity data
  ): Promise<{ id: string; createTime?: Date; updateTime?: Date }> {
    if (this.storage.has(id)) {
      return Promise.reject(new Error(`Entity with ID ${id} already exists.`));
    }
    const now = new Date();
    const entry: InMemoryStorageEntry = {
      entityData: data, // Store the full data
      createTime: now,
      updateTime: now,
      id: id,
    };
    this.storage.set(id, entry);
    return Promise.resolve({ id, createTime: now, updateTime: now });
  }

  // _findById returns the stored entity data (Record<string, unknown>)
  protected _findById(id: string): Promise<Record<string, unknown> | null> {
    const entry = this.storage.get(id);
    return Promise.resolve(entry ? entry.entityData : null); // Return the entityData part
  }

  // _update receives partial entity data from _toDatabaseFormat
  protected _update(
    id: string,
    data: Record<string, unknown> // data is the partial entity data
  ): Promise<{ updateTime?: Date }> {
    const existingEntry = this.storage.get(id);
    if (!existingEntry) {
      return Promise.reject(new Error(`Entity with ID ${id} not found.`));
    }

    // Merge partial update data with existing entity data
    const updatedData = { ...existingEntry.entityData, ...data };

    const now = new Date();
    const updatedEntry: InMemoryStorageEntry = {
      ...existingEntry,
      entityData: updatedData, // Store the merged full data
      updateTime: now,
    };
    this.storage.set(id, updatedEntry);
    return Promise.resolve({ updateTime: now });
  }

  protected _delete(id: string): Promise<void> {
    if (!this.storage.has(id)) {
      // Consistent with AbstractRepository, deleting non-existent is often a no-op
      return Promise.resolve();
    }
    this.storage.delete(id);
    return Promise.resolve();
  }

  // _findAll returns an array of { id, data } where data is the full entity data
  protected _findAll(): Promise<
    { id: string; data: Record<string, unknown> }[]
  > {
    const results: { id: string; data: Record<string, unknown> }[] = [];
    this.storage.forEach((entry) => {
      // Push the id and the stored entityData
      results.push({ id: entry.id, data: entry.entityData });
    });
    return Promise.resolve(results);
  }

  // _getMetadata fetches timestamps from the storage entry
  protected _getMetadata(
    id: string
  ): Promise<{ createTime?: Date; updateTime?: Date } | undefined> {
    const entry = this.storage.get(id);
    return Promise.resolve(
      entry
        ? { createTime: entry.createTime, updateTime: entry.updateTime }
        : undefined
    );
  }

  // --- Query Builder ---

  query(): IQueryBuilder<T> {
    // Instantiate the query builder, passing storage and the correct transformer
    // NOTE: InMemoryQueryBuilder needs to be updated to handle the new storage format
    // and potentially the direct access to entity properties instead of entry.data.prop
    return new InMemoryQueryBuilder<T>(
      this.collectionName,
      this.storage, // Pass the storage map (QueryBuilder needs update)
      this._fromDatabaseFormat.bind(this) // Pass the correct transformer
    );
  }
}
