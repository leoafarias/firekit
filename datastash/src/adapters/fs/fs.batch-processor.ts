import { ClassType } from "class-transformer-validator";
import { getCollectionName } from "../../decorators";
import { IBatchProcessor } from "../../interfaces";
import { FileSystemAdapter } from "./fs.adapter";

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
 * File system batch processor implementation.
 * Attempts to provide atomicity for operations across multiple JSON files.
 * Note: This implementation cannot guarantee true atomicity if the process crashes
 * during the file I/O operations.
 */
export class FileSystemBatchProcessor implements IBatchProcessor {
  /**
   * Array of operations to be executed in the batch.
   */
  private operations: BatchOperation[] = [];

  /**
   * Creates a file system batch processor instance.
   * @param adapter - The FileSystemAdapter instance
   */
  constructor(private readonly adapter: FileSystemAdapter) {}

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
   * Commit the batch operations.
   * Note: This implementation attempts to provide batch atomicity but cannot guarantee it
   * if the process crashes during file operations.
   * @returns Promise resolving when the batch is committed
   */
  async commit(): Promise<void> {
    if (this.operations.length === 0) {
      return;
    }

    // Group operations by collection name to minimize file I/O
    const operationsByCollection: {
      [collectionName: string]: BatchOperation[];
    } = {};

    // First, group operations by collection
    for (const op of this.operations) {
      if (!operationsByCollection[op.collectionName]) {
        operationsByCollection[op.collectionName] = [];
      }
      operationsByCollection[op.collectionName].push(op);
    }

    // For each collection, apply all operations at once
    for (const [collectionName, collectionOps] of Object.entries(
      operationsByCollection
    )) {
      const collectionPath = this.adapter._getCollectionPath(collectionName);

      // Read the collection file once
      let collectionData = await this.adapter._readCollectionFile<any>(
        collectionPath
      );

      try {
        // First check if all entities exist for update/delete operations
        for (const op of collectionOps) {
          if (op.type === "update" || op.type === "delete") {
            const existingEntityIndex = collectionData.findIndex(
              (item) => item.id === op.id
            );
            if (existingEntityIndex === -1) {
              throw new Error(
                `Entity ${op.id} not found in collection ${op.collectionName}`
              );
            }
          }
        }

        // Now apply all operations to the in-memory data
        for (const op of collectionOps) {
          switch (op.type) {
            case "create": {
              collectionData.push({
                ...op.data,
                id: op.id,
              });
              break;
            }
            case "update": {
              const index = collectionData.findIndex(
                (item) => item.id === op.id
              );
              if (index !== -1) {
                const existingData = collectionData[index];
                collectionData[index] = {
                  ...existingData,
                  ...op.data,
                  id: op.id,
                  _metadata: {
                    createTime:
                      existingData._metadata?.createTime || new Date(),
                    updateTime: new Date(),
                  },
                };
              }
              break;
            }
            case "delete": {
              collectionData = collectionData.filter(
                (item) => item.id !== op.id
              );
              break;
            }
          }
        }

        // Write the modified collection data back to file
        await this.adapter._writeCollectionFile(collectionPath, collectionData);
      } catch (error) {
        // If an error occurs, we might have left the collection in an inconsistent state.
        // There's no simple way to roll back file changes here.
        // A more robust implementation would write to temporary files and rename atomically.
        console.error(
          `Batch operation failed for collection ${collectionName}:`,
          error
        );
        throw error;
      }
    }

    // Clear operations on successful completion
    this.operations = [];
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
}
