import { ClassType } from "class-transformer-validator";
import { getCollectionName } from "../../decorators";
import { IBatchProcessor } from "../../interfaces";

/**
 * Operation type in a batch.
 */
export type BatchOperationType = "create" | "update" | "delete";

/**
 * Represents a single operation in a batch.
 */
export interface BatchOperation {
  /**
   * The type of operation: create, update, or delete.
   */
  type: BatchOperationType;

  /**
   * The collection name for the operation.
   */
  collectionName: string;

  /**
   * The entity ID for the operation.
   */
  id: string;

  /**
   * The entity data for create/update operations.
   */
  data?: Record<string, any>;
}

/**
 * In-memory batch processor implementation.
 * Allows for atomic operations across multiple entities and collections.
 */
export class InMemoryBatchProcessor implements IBatchProcessor {
  /**
   * Array of operations to be executed in the batch.
   */
  private operations: BatchOperation[] = [];

  /**
   * Creates an in-memory batch processor instance.
   * @param dbStore - The database store containing all collections
   */
  constructor(
    private readonly dbStore: { [collectionName: string]: Map<string, any> }
  ) {}

  /**
   * Add a create operation to the batch.
   * @param entityClass - Entity class
   * @param data - Entity data
   * @param id - Optional custom ID
   */
  create<T extends object>(
    entityClass: ClassType<T>,
    data: any,
    id: string
  ): void {
    const collectionName = this._getCollectionName(entityClass);

    // Add create operation to the batch
    this.operations.push({
      type: "create",
      collectionName,
      id,
      data: {
        ...data,
        _metadata: {
          createTime: new Date(),
          updateTime: new Date(),
        },
      },
    });
  }

  /**
   * Add an update operation to the batch.
   * @param entityClass - Entity class
   * @param id - Entity ID
   * @param data - Entity data to update
   */
  update<T extends object>(
    entityClass: ClassType<T>,
    id: string,
    data: Partial<T>
  ): void {
    const collectionName = this._getCollectionName(entityClass);

    // Add update operation to the batch
    this.operations.push({
      type: "update",
      collectionName,
      id,
      data: {
        ...data,
        _metadata: {
          updateTime: new Date(),
        },
      },
    });
  }

  /**
   * Add a delete operation to the batch.
   * @param entityClass - Entity class
   * @param id - Entity ID
   */
  delete(entityClass: ClassType<any>, id: string): void {
    const collectionName = this._getCollectionName(entityClass);

    // Add delete operation to the batch
    this.operations.push({
      type: "delete",
      collectionName,
      id,
    });
  }

  /**
   * Commit the batch operations atomically.
   * If any operation fails, all operations are rolled back.
   * @returns Promise resolving when the batch is committed
   */
  async commit(): Promise<void> {
    if (this.operations.length === 0) {
      return;
    }

    // Store original data to enable rollback if needed
    const originals = new Map<string, any>();

    try {
      // First check if all entities exist for update/delete operations
      for (const op of this.operations) {
        const collection = this._getCollection(op.collectionName);
        const entityKey = `${op.collectionName}:${op.id}`;

        if (op.type === "update" || op.type === "delete") {
          const existingData = collection.get(op.id);
          if (!existingData) {
            throw new Error(
              `Entity ${op.id} not found in collection ${op.collectionName}`
            );
          }

          // Store original data for potential rollback
          originals.set(entityKey, { ...existingData });
        } else if (op.type === "create") {
          // Store null to indicate this is a new entity
          originals.set(entityKey, null);
        }
      }

      // Execute all operations
      for (const op of this.operations) {
        const collection = this._getCollection(op.collectionName);

        switch (op.type) {
          case "create": {
            collection.set(op.id, op.data);
            break;
          }
          case "update": {
            const existingData = collection.get(op.id);
            const mergedData = {
              ...existingData,
              ...op.data,
              _metadata: {
                createTime: existingData._metadata?.createTime || new Date(),
                updateTime: new Date(),
              },
            };
            collection.set(op.id, mergedData);
            break;
          }
          case "delete": {
            collection.delete(op.id);
            break;
          }
        }
      }
    } catch (error) {
      // Rollback all operations if any operation fails
      this._rollback(originals);
      throw error;
    } finally {
      // Clear the operations regardless of success or failure
      this.operations = [];
    }
  }

  /**
   * Rollback all operations.
   * @private
   * @param originals - Map of original entity data
   */
  private _rollback(originals: Map<string, any>): void {
    for (const [key, originalData] of originals.entries()) {
      const [collectionName, id] = key.split(":");
      const collection = this._getCollection(collectionName);

      if (originalData === null) {
        // Entity was created in this batch, so remove it
        collection.delete(id);
      } else {
        // Entity was updated or deleted in this batch, so restore it
        collection.set(id, originalData);
      }
    }
  }

  /**
   * Get the collection name for an entity class.
   * @private
   * @param entityClass - Entity class
   * @returns The collection name
   * @throws Error if the entity class is not properly decorated
   */
  private _getCollectionName(entityClass: ClassType<any>): string {
    const collectionName = getCollectionName(entityClass);
    if (!collectionName) {
      throw new Error(
        `Class ${entityClass.name} is not decorated with @Collection`
      );
    }
    return collectionName;
  }

  /**
   * Get a collection by name.
   * @private
   * @param collectionName - Collection name
   * @returns The collection map
   * @throws Error if the collection does not exist
   */
  private _getCollection(collectionName: string): Map<string, any> {
    // Create collection if it doesn't exist
    if (!this.dbStore[collectionName]) {
      this.dbStore[collectionName] = new Map<string, any>();
    }

    return this.dbStore[collectionName];
  }
}
