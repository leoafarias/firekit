import { ClassType } from "class-transformer-validator";
import {
  IBatchProcessor,
  IDatabaseAdapter,
  IQueryBuilder,
} from "../../interfaces";
import { EntityWithData } from "../../models/entity.model";
import { AbstractRepository } from "../../repository";
import { InMemoryBatchProcessor } from "./in-memory.batch-processor";
import { InMemoryQueryBuilder } from "./in-memory.query-builder";

/**
 * In-memory repository implementation.
 * Provides CRUD operations on an in-memory data store.
 */
export class InMemoryRepository<
  T extends object
> extends AbstractRepository<T> {
  /**
   * Creates an in-memory repository instance.
   * @param entityClass - Entity class constructor
   * @param adapter - Database adapter instance
   * @param collectionMap - Map storing the collection data
   */
  constructor(
    entityClass: ClassType<T>,
    private readonly adapter: IDatabaseAdapter,
    private readonly collectionMap: Map<string, any>
  ) {
    super(entityClass, adapter);
  }

  /**
   * Create a query builder for querying in-memory data.
   * @returns In-memory query builder instance
   */
  query(): IQueryBuilder<EntityWithData<T>> {
    return new InMemoryQueryBuilder<EntityWithData<T>>(() =>
      this._getAllEntities()
    );
  }

  /**
   * Create a batch processor for batch operations.
   * @returns In-memory batch processor instance
   */
  batch(): IBatchProcessor {
    // Get reference to the adapter's store to allow cross-collection operations
    const store = this._getStore();
    return new InMemoryBatchProcessor(store);
  }

  /**
   * Get all entities as an array.
   * @private
   * @returns Array of entity data with IDs
   */
  private _getAllEntities(): EntityWithData<T>[] {
    const entities: EntityWithData<T>[] = [];

    // Convert all entities in the collection to entity format
    this.collectionMap.forEach((data, id) => {
      entities.push(
        this._fromDatabaseFormat(
          data,
          id,
          data._metadata?.createTime,
          data._metadata?.updateTime
        )
      );
    });

    return entities;
  }

  /**
   * Get the store for batch operations.
   * @private
   * @returns The store object containing all collections
   */
  private _getStore(): { [collectionName: string]: Map<string, any> } {
    // This is a bit of a hack - we assume the in-memory adapter's store
    // is the parent object of our collection map
    const store: { [collectionName: string]: Map<string, any> } = {};
    store[this.collectionName] = this.collectionMap;
    return store;
  }

  /**
   * Find all entities in the collection.
   * @protected
   * @returns Promise resolving to array of entity data with IDs
   */
  protected async _findAll(): Promise<
    Array<{ id: string; data: Record<string, any> }>
  > {
    const results: Array<{ id: string; data: Record<string, any> }> = [];

    this.collectionMap.forEach((data, id) => {
      // Clone the data to prevent unintended modifications
      results.push({
        id,
        data: { ...data },
      });
    });

    return results;
  }

  /**
   * Save an entity to the in-memory store.
   * @protected
   * @param id - Entity ID
   * @param data - Entity data
   * @returns Promise resolving to the saved entity ID and timestamps
   */
  protected async _save(
    id: string | null,
    data: Record<string, any>
  ): Promise<{ id: string; createTime: Date; updateTime: Date }> {
    if (!id) {
      throw new Error("ID must be provided");
    }

    const now = new Date();

    // Add metadata to track timestamps
    const dataWithMetadata = {
      ...data,
      _metadata: {
        createTime: now,
        updateTime: now,
      },
    };

    // Store the entity
    this.collectionMap.set(id, dataWithMetadata);

    return {
      id,
      createTime: now,
      updateTime: now,
    };
  }

  /**
   * Find an entity by ID in the in-memory store.
   * @protected
   * @param id - Entity ID
   * @returns Promise resolving to entity data or null if not found
   */
  protected async _findById(id: string): Promise<Record<string, any> | null> {
    const data = this.collectionMap.get(id);

    if (!data) {
      return null;
    }

    // Return a clone of the data without metadata
    const { _metadata, ...entityData } = data;
    return { ...entityData };
  }

  /**
   * Update an entity in the in-memory store.
   * @protected
   * @param id - Entity ID
   * @param data - Entity data to update
   * @returns Promise resolving to update timestamp
   */
  protected async _update(
    id: string,
    data: Record<string, any>
  ): Promise<{ updateTime: Date }> {
    const existingData = this.collectionMap.get(id);

    if (!existingData) {
      throw new Error(`Entity with ID ${id} not found`);
    }

    const now = new Date();

    // Merge existing data with updated data
    const updatedData = {
      ...existingData,
      ...data,
      _metadata: {
        createTime: existingData._metadata?.createTime || now,
        updateTime: now,
      },
    };

    // Update entity in store
    this.collectionMap.set(id, updatedData);

    return {
      updateTime: now,
    };
  }

  /**
   * Delete an entity from the in-memory store.
   * @protected
   * @param id - Entity ID
   * @returns Promise resolving when entity is deleted
   */
  protected async _delete(id: string): Promise<void> {
    if (!this.collectionMap.has(id)) {
      throw new Error(`Entity with ID ${id} not found`);
    }

    this.collectionMap.delete(id);
  }

  /**
   * Get entity metadata from the in-memory store.
   * @protected
   * @param id - Entity ID
   * @returns Promise resolving to entity metadata or undefined if not found
   */
  protected async _getMetadata(
    id: string
  ): Promise<{ createTime?: Date; updateTime?: Date } | undefined> {
    const data = this.collectionMap.get(id);

    if (!data || !data._metadata) {
      return undefined;
    }

    return {
      createTime: data._metadata.createTime,
      updateTime: data._metadata.updateTime,
    };
  }
}
