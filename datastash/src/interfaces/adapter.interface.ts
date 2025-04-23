import { ClassType } from "../utils/class.type";
import { Entity } from "./entity.interface";
import { IIdGenerator } from "./id-generator.interface";
import { IRepository } from "./repository.interface";

/**
 * Interface for database adapter implementations.
 * Adapters bridge the core repository logic with specific database technologies.
 */
export interface IDatabaseAdapter {
  /**
   * Connect to the database.
   * @param options - Adapter-specific connection options.
   */
  connect(options?: unknown): Promise<void>;

  /**
   * Disconnect from the database.
   */
  disconnect(): Promise<void>;

  /**
   * Check if the adapter is currently connected.
   */
  isConnected(): boolean;

  /**
   * Get a repository instance for a specific entity type.
   * Adapters are responsible for creating and managing repository instances.
   * @param entityClass - The main entity class.
   * @returns An instance of IRepository for the given entity.
   */
  getRepository<T extends Entity>(entityClass: ClassType<T>): IRepository<T>;

  /**
   * Optional: Get an ID generator specific to this adapter.
   * Repositories can use this if available.
   */
  getIdGenerator?(): IIdGenerator;
}
