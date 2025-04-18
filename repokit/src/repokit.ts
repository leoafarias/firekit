import { IDatabaseAdapter, IRepository } from "./interfaces";

/**
 * Main entry point for the Repokit library
 * Manages connections to database adapters and provides repositories
 */
export class Repokit {
  private static adapter: IDatabaseAdapter | null = null;

  /**
   * Connect to a database using the provided adapter
   * @param adapter - Database adapter implementation
   * @param options - Connection options (adapter-specific)
   * @throws Error if already connected
   */
  public static async connect(
    adapter: IDatabaseAdapter,
    options?: any
  ): Promise<void> {
    if (this.adapter) {
      throw new Error("Repokit is already connected to a database");
    }

    if (!adapter) {
      throw new Error("A valid database adapter must be provided");
    }

    try {
      await adapter.connect(options);
      this.adapter = adapter;
    } catch (error) {
      // Re-throw with more context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to database: ${errorMessage}`);
    }
  }

  /**
   * Disconnect from the database
   * @throws Error if not connected
   */
  public static async disconnect(): Promise<void> {
    if (!this.adapter) {
      throw new Error("Repokit is not connected to a database");
    }

    try {
      await this.adapter.disconnect();
      this.adapter = null;
    } catch (error) {
      // Re-throw with more context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to disconnect from database: ${errorMessage}`);
    }
  }

  /**
   * Get a repository for the specified entity class
   * @param entityClass - Entity class
   * @returns Repository for the entity
   * @throws Error if not connected
   */
  public static getRepository<T extends object>(
    entityClass: any
  ): IRepository<T> {
    if (!this.adapter) {
      throw new Error(
        "Repokit is not connected to a database. Call Repokit.connect() first."
      );
    }

    if (!entityClass) {
      throw new Error("Entity class must be provided");
    }

    return this.adapter.getRepository<T>(entityClass);
  }

  /**
   * Check if Repokit is connected to a database
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
