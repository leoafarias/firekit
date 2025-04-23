import fs from "fs/promises";
import path from "path";
import { getCollectionName } from "../../decorators";
import { IDatabaseAdapter } from "../../interfaces/adapter.interface";
import { Entity } from "../../interfaces/entity.interface";
import { IIdGenerator } from "../../interfaces/id-generator.interface";
import { IRepository } from "../../interfaces/repository.interface";
import { ClassType } from "../../utils/class.type";
import { SequentialIdGenerator } from "../../utils/sequential-id.generator";
import { UuidGenerator } from "../../utils/uuid.generator";
import { FileSystemRepository } from "./filesystem.repository";

/**
 * Options for the FileSystemAdapter
 */
export interface FileSystemAdapterOptions {
  /**
   * Base directory for storing JSON files
   * @default './data'
   */
  baseDir?: string;

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

  /**
   * Whether to pretty-print JSON files
   * @default false
   */
  prettyPrint?: boolean;
}

/**
 * File system database adapter for JSON storage.
 * Manages FileSystemRepository instances for different entities.
 * Stores each collection in a separate directory with JSON files for each document.
 */
export class FileSystemAdapter implements IDatabaseAdapter {
  private connected = false;
  private repositories = new Map<string, IRepository<Entity>>();
  private idGenerator: IIdGenerator;
  private baseDir: string;
  private prettyPrint: boolean;

  /**
   * Create a new FileSystemAdapter
   * @param options - Adapter configuration options
   */
  constructor(options?: FileSystemAdapterOptions) {
    this.baseDir = options?.baseDir ?? "./data";
    this.prettyPrint = options?.prettyPrint ?? false;

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

  /**
   * Connect to the filesystem database
   * Creates the base directory if it doesn't exist
   */
  async connect(): Promise<void> {
    try {
      // Check if the base directory exists, create it if it doesn't
      try {
        await fs.access(this.baseDir);
      } catch {
        // Directory doesn't exist, create it
        await fs.mkdir(this.baseDir, { recursive: true });
      }

      this.connected = true;
      return Promise.resolve();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to connect to filesystem database: ${errorMessage}`
      );
    }
  }

  /**
   * Disconnect from the filesystem database
   * This is a no-op for a filesystem adapter but included for interface compatibility
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  /**
   * Check if the adapter is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get a repository for a specific entity type
   * @param entityClass - The entity class
   * @returns A repository for the entity
   */
  getRepository<T extends Entity>(entityClass: ClassType<T>): IRepository<T> {
    const collectionName = getCollectionName(entityClass);
    if (!collectionName) {
      throw new Error(
        `Cannot get repository for ${entityClass.name}: @Collection decorator missing.`
      );
    }

    if (!this.repositories.has(collectionName)) {
      // Create the collection directory if it doesn't exist
      const collectionDir = path.join(this.baseDir, collectionName);

      // Create and store a new repository instance for this collection
      const repository = new FileSystemRepository<T>(
        entityClass,
        collectionDir,
        this.prettyPrint
      );

      this.repositories.set(
        collectionName,
        repository as unknown as IRepository<Entity>
      );
    }

    // Return the existing or newly created repository, casting as needed
    const repo = this.repositories.get(collectionName);
    if (!repo) {
      throw new Error(`Repository for ${collectionName} not found`);
    }
    return repo as IRepository<T>;
  }

  /**
   * Get the ID generator used by this adapter
   * @returns The ID generator instance
   */
  getIdGenerator(): IIdGenerator {
    return this.idGenerator;
  }
}
