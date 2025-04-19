import { ClassType } from "class-transformer-validator";
import { IBatchProcessor, IQueryBuilder } from "../../interfaces";
import { EntityWithData } from "../../models/entity.model";
import { AbstractRepository } from "../../repository";
import { FileSystemAdapter } from "./fs.adapter";
import { FileSystemBatchProcessor } from "./fs.batch-processor";
import { FileSystemQueryBuilder } from "./fs.query-builder";

/**
 * File system repository implementation.
 * Provides CRUD operations on a JSON file-based data store.
 */
export class FileSystemRepository<
  T extends object
> extends AbstractRepository<T> {
  /**
   * Creates a file system repository instance.
   * @param entityClass - Entity class constructor
   * @param adapter - File system adapter instance
   * @param collectionFilePath - Path to the collection's JSON file
   */
  constructor(
    entityClass: ClassType<T>,
    private readonly adapter: FileSystemAdapter,
    private readonly collectionFilePath: string
  ) {
    super(entityClass, adapter);
  }

  /**
   * Create a query builder for querying file-based data.
   * @returns File system query builder instance
   */
  query(): IQueryBuilder<EntityWithData<T>> {
    return new FileSystemQueryBuilder<EntityWithData<T>>(() =>
      this._getAllEntities()
    );
  }

  /**
   * Create a batch processor for batch operations.
   * @returns File system batch processor instance
   */
  batch(): IBatchProcessor {
    return new FileSystemBatchProcessor(this.adapter);
  }

  /**
   * Get all entities as an array for querying.
   * @private
   * @returns Array of entity data with IDs
   */
  private async _getAllEntities(): Promise<EntityWithData<T>[]> {
    // Read and parse the collection file
    const results = await this._findAll();

    // Convert to EntityWithData format
    const entities: EntityWithData<T>[] = await Promise.all(
      results.map(async (result) => {
        const metadata = await this._getMetadata(result.id);
        return this._fromDatabaseFormat(
          result.data,
          result.id,
          metadata?.createTime,
          metadata?.updateTime
        );
      })
    );

    return entities;
  }

  /**
   * Find all entities in the collection.
   * @protected
   * @returns Promise resolving to array of entity data with IDs
   */
  protected async _findAll(): Promise<
    Array<{ id: string; data: Record<string, any> }>
  > {
    // Read the collection file
    const collectionData = await this.adapter._readCollectionFile<any>(
      this.collectionFilePath
    );

    // Map to expected format
    return collectionData.map((item) => {
      // Extract the ID and metadata
      const { id, _metadata, ...data } = item;

      // Return in the format expected by AbstractRepository
      return {
        id,
        data,
      };
    });
  }

  /**
   * Save an entity to the file system.
   * @protected
   * @param id - Entity ID
   * @param data - Entity data
   * @returns Promise resolving to the saved entity ID and timestamps
   */
  protected async _save(
    id: string | null,
    data: Record<string, any>
  ): Promise<{ id: string; createTime?: Date; updateTime?: Date }> {
    if (!id) {
      throw new Error("ID must be provided");
    }

    const now = new Date();

    // Read the current collection data
    const collectionData = await this.adapter._readCollectionFile<any>(
      this.collectionFilePath
    );

    // Create entity data with metadata
    const entityData = {
      ...data,
      id, // Include ID in the object for easier lookups
      _metadata: {
        createTime: now,
        updateTime: now,
      },
    };

    // Add to collection
    collectionData.push(entityData);

    // Write the updated collection back to the file
    await this.adapter._writeCollectionFile(
      this.collectionFilePath,
      collectionData
    );

    return {
      id,
      createTime: now,
      updateTime: now,
    };
  }

  /**
   * Find an entity by ID in the file system.
   * @protected
   * @param id - Entity ID
   * @returns Promise resolving to entity data or null if not found
   */
  protected async _findById(id: string): Promise<Record<string, any> | null> {
    // Read the collection file
    const collectionData = await this.adapter._readCollectionFile<any>(
      this.collectionFilePath
    );

    // Find the entity with the given ID
    const entity = collectionData.find((item) => item.id === id);

    // Return null if not found
    if (!entity) {
      return null;
    }

    // Return a clone of the data without ID and metadata
    const { id: _, _metadata, ...entityData } = entity;
    return { ...entityData };
  }

  /**
   * Update an entity in the file system.
   * @protected
   * @param id - Entity ID
   * @param data - Entity data to update
   * @returns Promise resolving to update timestamp
   */
  protected async _update(
    id: string,
    data: Record<string, any>
  ): Promise<{ updateTime?: Date }> {
    // Read the collection file
    const collectionData = await this.adapter._readCollectionFile<any>(
      this.collectionFilePath
    );

    // Find the entity with the given ID
    const index = collectionData.findIndex((item) => item.id === id);

    // If not found, throw an error (should be caught by AbstractRepository)
    if (index === -1) {
      throw new Error(`Entity with ID ${id} not found for update`);
    }

    const now = new Date();

    // Update the entity
    const existingEntity = collectionData[index];
    const updatedEntity = {
      ...existingEntity,
      ...data,
      id, // Ensure ID is preserved
      _metadata: {
        ...(existingEntity._metadata || {}),
        updateTime: now,
      },
    };

    // Replace in the array
    collectionData[index] = updatedEntity;

    // Write the updated collection back to the file
    await this.adapter._writeCollectionFile(
      this.collectionFilePath,
      collectionData
    );

    return {
      updateTime: now,
    };
  }

  /**
   * Delete an entity from the file system.
   * @protected
   * @param id - Entity ID
   * @returns Promise resolving when entity is deleted
   */
  protected async _delete(id: string): Promise<void> {
    // Read the collection file
    const collectionData = await this.adapter._readCollectionFile<any>(
      this.collectionFilePath
    );

    // Check if entity exists
    const entityExists = collectionData.some((item) => item.id === id);
    if (!entityExists) {
      throw new Error(`Entity with ID ${id} not found for deletion`);
    }

    // Filter out the entity with the given ID
    const updatedCollectionData = collectionData.filter(
      (item) => item.id !== id
    );

    // Write the updated collection back to the file
    await this.adapter._writeCollectionFile(
      this.collectionFilePath,
      updatedCollectionData
    );
  }

  /**
   * Get entity metadata from the entity in the file system.
   * @protected
   * @param id - Entity ID
   * @returns Promise resolving to entity metadata or undefined if not found
   */
  protected async _getMetadata(
    id: string
  ): Promise<{ createTime?: Date; updateTime?: Date } | undefined> {
    // Read the collection file
    const collectionData = await this.adapter._readCollectionFile<any>(
      this.collectionFilePath
    );

    // Find the entity with the given ID
    const entity = collectionData.find((item) => item.id === id);

    // Return undefined if not found or no metadata
    if (!entity || !entity._metadata) {
      return undefined;
    }

    // Parse dates if they are stored as strings
    const createTime = entity._metadata.createTime
      ? new Date(entity._metadata.createTime)
      : undefined;

    const updateTime = entity._metadata.updateTime
      ? new Date(entity._metadata.updateTime)
      : undefined;

    return {
      createTime,
      updateTime,
    };
  }
}
