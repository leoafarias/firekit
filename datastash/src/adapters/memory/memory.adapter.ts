import { getCollectionName } from "../../decorators";
import { IDatabaseAdapter } from "../../interfaces/adapter.interface";
import { IIdGenerator } from "../../interfaces/id-generator.interface";
import { IRepository } from "../../interfaces/repository.interface";
import { ClassType } from "../../utils/class.type";
import { SequentialIdGenerator } from "../../utils/sequential-id.generator";
import { UuidGenerator } from "../../utils/uuid.generator";
import { InMemoryRepository } from "./memory.repository";

// Define the structure for storing data and metadata in the map
interface InMemoryStorageEntry {
  data: Record<string, unknown>;
  createTime: Date;
  updateTime: Date;
  id: string;
}

/**
 * Options for the InMemoryAdapter
 */
export interface InMemoryAdapterOptions {
  /**
   * ID generator strategy to use
   * - 'uuid': Use UUID v4 generator (default)
   * - 'sequential': Use sequential ID generator
   * - Or provide a custom IIdGenerator instance
   */
  idGenerator?: "uuid" | "sequential" | IIdGenerator;

  /**
   * Prefix for sequential IDs when using sequential generator
   * Ignored for other generator types
   * @default 'id-'
   */
  sequentialIdPrefix?: string;
}

/**
 * In-memory database adapter.
 * Manages InMemoryRepository instances for different entities.
 */
export class InMemoryAdapter implements IDatabaseAdapter {
  private connected = false;
  // Using object type for slightly better safety than any
  private repositories = new Map<string, IRepository<unknown>>();
  // Shared storage for all repositories managed by this adapter instance
  private sharedStorage = new Map<string, InMemoryStorageEntry>();
  // ID generator to use for this adapter
  private idGenerator: IIdGenerator;

  /**
   * Create a new InMemoryAdapter
   * @param options - Adapter configuration options
   */
  constructor(options?: InMemoryAdapterOptions) {
    // Set up ID generator based on options
    if (!options?.idGenerator || options.idGenerator === "uuid") {
      this.idGenerator = new UuidGenerator();
    } else if (options.idGenerator === "sequential") {
      this.idGenerator = new SequentialIdGenerator(options.sequentialIdPrefix);
    } else {
      // Custom generator provided
      this.idGenerator = options.idGenerator;
    }
  }

  async connect(): Promise<void> {
    this.connected = true;
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    // Optionally clear storage on disconnect
    // this.repositories.clear();
    // this.sharedStorage.clear();
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getRepository<T>(entityClass: ClassType<T>): IRepository<T> {
    const collectionName = getCollectionName(entityClass);
    if (!collectionName) {
      throw new Error(
        `Cannot get repository for ${entityClass.name}: @Collection decorator missing.`
      );
    }

    if (!this.repositories.has(collectionName)) {
      // Create and store a new repository instance for this collection
      // Pass the shared storage map to the repository constructor
      const repository = new InMemoryRepository<T>(entityClass);
      this.repositories.set(collectionName, repository as IRepository<unknown>);
    }

    // Return the existing or newly created repository, casting as needed
    // Type assertion is necessary due to using object in the Map
    return this.repositories.get(collectionName) as IRepository<T>;
  }

  /**
   * Get the ID generator used by this adapter
   * @returns The ID generator instance
   */
  getIdGenerator(): IIdGenerator {
    return this.idGenerator;
  }
}
