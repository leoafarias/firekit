import { IDatabaseAdapter } from "./interfaces/adapter.interface";
import { IRepository } from "./interfaces/repository.interface";
import { ClassType } from "./utils/class.type";

/**
 * Main entry point for the Stash library
 * Manages connections to database adapters and provides repositories
 */
export class Stash {
  private static adapter: IDatabaseAdapter | null = null;

  /**
   * Connect to a database using the provided adapter
   * @param adapter - Database adapter implementation
   * @param options - Connection options (adapter-specific)
   * @throws Error if already connected
   */
  public static async connect(
    adapter: IDatabaseAdapter,
    options?: unknown
  ): Promise<void> {
    if (this.adapter) {
      throw new Error("Stash is already connected to an adapter");
    }

    if (!adapter) {
      throw new Error("Adapter cannot be null or undefined");
    }

    try {
      await adapter.connect(options);
      this.adapter = adapter;
    } catch (error) {
      // Re-throw with more context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to adapter: ${errorMessage}`);
    }
  }

  /**
   * Disconnect from the database
   * @throws Error if not connected
   */
  public static async disconnect(): Promise<void> {
    if (!this.adapter) {
      throw new Error("Stash is not connected to an adapter");
    }

    try {
      await this.adapter.disconnect();
      this.adapter = null;
    } catch (error) {
      // Re-throw with more context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to disconnect from adapter: ${errorMessage}`);
    }
  }

  /**
   * Get a repository for the specified domain entity class.
   * @param entityClass - The domain entity class (e.g., User).
   * @returns Repository for the domain entity.
   * @throws Error if not connected or entityClass is invalid.
   */
  public static getRepository<T>(entityClass: ClassType<T>): IRepository<T> {
    if (!this.adapter) {
      throw new Error(
        "Stash is not connected to an adapter. Call Stash.connect() first."
      );
    }

    if (!entityClass) {
      throw new Error("Entity class cannot be null or undefined");
    }

    return this.adapter.getRepository<T>(entityClass);
  }

  /**
   * Check if Stash is connected to a database
   * @returns True if connected, false otherwise
   */
  public static isConnected(): boolean {
    return !!this.adapter && this.adapter.isConnected();
  }

  /**
   * Get the current database adapter
   * @returns The current database adapter or null if not connected
   */
  public static getAdapter(): IDatabaseAdapter | null {
    return this.adapter;
  }
}
