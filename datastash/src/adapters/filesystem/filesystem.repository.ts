import fs from "fs/promises";
import path from "path";
import { Entity } from "../../interfaces/entity.interface";
import { IQueryBuilder } from "../../interfaces/query.interface";
import { AbstractRepository } from "../../repository/base.repository";
import { ClassType } from "../../utils/class.type";
import { FileSystemQueryBuilder } from "./filesystem-query-builder";

/**
 * FileSystem storage entry with metadata
 */
interface FileSystemStorageEntry {
  data: Record<string, unknown>;
  createTime: Date;
  updateTime: Date;
  id: string;
}

/**
 * Raw entry as stored in JSON
 */
interface RawFileSystemStorageEntry {
  data: Record<string, unknown>;
  createTime: string;
  updateTime: string;
  id: string;
}

/**
 * File system repository implementation.
 * Stores entities as JSON files in a directory.
 */
export class FileSystemRepository<
  T extends Entity
> extends AbstractRepository<T> {
  private collectionDir: string;
  private prettyPrint: boolean;

  /**
   * Creates a new file system repository
   * @param entityClass - Entity class constructor
   * @param dataDtoClass - Data DTO class constructor
   * @param collectionDir - Directory path for this collection
   * @param prettyPrint - Whether to pretty-print JSON files
   */
  constructor(
    entityClass: ClassType<T>,
    collectionDir: string,
    prettyPrint = false
  ) {
    super(entityClass);
    this.collectionDir = collectionDir;
    this.prettyPrint = prettyPrint;

    // Ensure the collection directory exists
    this.ensureCollectionDir().catch((err: Error) => {
      console.error(`Failed to create collection directory: ${err.message}`);
    });
  }

  /**
   * Create a query builder for this repository
   */
  query(): IQueryBuilder<T> {
    return new FileSystemQueryBuilder<T>(
      this.collectionName,
      this.collectionDir,
      this._fromDatabaseFormat.bind(this)
    );
  }

  // --- Implementation of Abstract Methods ---

  /**
   * Save an entity to the file system
   * @param id - Entity ID
   * @param data - Entity data
   */
  protected async _save(
    id: string,
    data: Record<string, unknown>
  ): Promise<{ id: string; createTime?: Date; updateTime?: Date }> {
    await this.ensureCollectionDir();

    const filePath = this.getEntityFilePath(id);

    // Check if file exists
    try {
      await fs.access(filePath);
      throw new Error(`Entity with ID ${id} already exists.`);
    } catch (error: unknown) {
      // File doesn't exist, proceed with save
      if (this.isErrnoException(error) && error.code === "ENOENT") {
        const now = new Date();
        const entry: FileSystemStorageEntry = {
          data,
          createTime: now,
          updateTime: now,
          id,
        };

        await this.writeEntityFile(filePath, entry);
        return { id, createTime: now, updateTime: now };
      }
      throw error;
    }
  }

  /**
   * Find an entity by ID
   * @param id - Entity ID
   */
  protected async _findById(
    id: string
  ): Promise<Record<string, unknown> | null> {
    const filePath = this.getEntityFilePath(id);

    try {
      const entry = await this.readEntityFile(filePath);
      return entry.data;
    } catch (error: unknown) {
      if (this.isErrnoException(error) && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update an entity
   * @param id - Entity ID
   * @param data - Entity data to update
   */
  protected async _update(
    id: string,
    data: Record<string, unknown>
  ): Promise<{ updateTime?: Date }> {
    const filePath = this.getEntityFilePath(id);

    try {
      // Read existing entry
      const entry = await this.readEntityFile(filePath);

      // Merge new data with existing data
      const updatedData = { ...entry.data, ...data };

      // Update the entry
      const now = new Date();
      const updatedEntry: FileSystemStorageEntry = {
        ...entry,
        data: updatedData,
        updateTime: now,
      };

      await this.writeEntityFile(filePath, updatedEntry);
      return { updateTime: now };
    } catch (error: unknown) {
      if (this.isErrnoException(error) && error.code === "ENOENT") {
        throw new Error(`Entity with ID ${id} not found.`);
      }
      throw error;
    }
  }

  /**
   * Delete an entity
   * @param id - Entity ID
   */
  protected async _delete(id: string): Promise<void> {
    const filePath = this.getEntityFilePath(id);

    try {
      await fs.unlink(filePath);
    } catch (error: unknown) {
      if (this.isErrnoException(error) && error.code === "ENOENT") {
        // File doesn't exist, consider it already deleted
        return;
      }
      throw error;
    }
  }

  /**
   * Find all entities in the collection
   */
  protected async _findAll(): Promise<
    { id: string; data: Record<string, unknown> }[]
  > {
    await this.ensureCollectionDir();

    try {
      // Get all files in the collection directory
      const files = await fs.readdir(this.collectionDir);

      // Filter only JSON files and extract IDs
      const idFiles = files.filter((file) => file.endsWith(".json"));

      // Read all entities in parallel
      const results = await Promise.all(
        idFiles.map(async (file) => {
          const id = file.slice(0, -5); // Remove .json extension
          const filePath = this.getEntityFilePath(id);

          try {
            const entry = await this.readEntityFile(filePath);
            return { id, data: entry.data };
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(`Error reading entity ${id}: ${errorMessage}`);
            return null;
          }
        })
      );

      // Filter out any entities that failed to load
      return results.filter(
        (result): result is { id: string; data: Record<string, unknown> } =>
          result !== null
      );
    } catch (error: unknown) {
      // If directory doesn't exist yet, return empty array
      if (this.isErrnoException(error) && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get entity metadata
   * @param id - Entity ID
   */
  protected async _getMetadata(
    id: string
  ): Promise<{ createTime?: Date; updateTime?: Date } | undefined> {
    const filePath = this.getEntityFilePath(id);

    try {
      const entry = await this.readEntityFile(filePath);
      return {
        createTime: entry.createTime,
        updateTime: entry.updateTime,
      };
    } catch (error: unknown) {
      if (this.isErrnoException(error) && error.code === "ENOENT") {
        return undefined;
      }
      throw error;
    }
  }

  // --- Helper Methods ---

  /**
   * Type guard for NodeJS.ErrnoException
   */
  private isErrnoException(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error && "code" in error;
  }

  /**
   * Get the file path for an entity
   * @param id - Entity ID
   */
  private getEntityFilePath(id: string): string {
    return path.join(this.collectionDir, `${id}.json`);
  }

  /**
   * Ensure the collection directory exists
   */
  private async ensureCollectionDir(): Promise<void> {
    try {
      await fs.access(this.collectionDir);
    } catch (error: unknown) {
      if (this.isErrnoException(error) && error.code === "ENOENT") {
        await fs.mkdir(this.collectionDir, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Read an entity file
   * @param filePath - Path to the entity file
   */
  private async readEntityFile(
    filePath: string
  ): Promise<FileSystemStorageEntry> {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const rawEntry = JSON.parse(fileContent) as RawFileSystemStorageEntry;

    // Convert ISO string dates back to Date objects
    return {
      data: rawEntry.data,
      id: rawEntry.id,
      createTime: new Date(rawEntry.createTime),
      updateTime: new Date(rawEntry.updateTime),
    };
  }

  /**
   * Write an entity file
   * @param filePath - Path to the entity file
   * @param entry - Entity entry to write
   */
  private async writeEntityFile(
    filePath: string,
    entry: FileSystemStorageEntry
  ): Promise<void> {
    const jsonContent = JSON.stringify(
      entry,
      null,
      this.prettyPrint ? 2 : undefined
    );
    await fs.writeFile(filePath, jsonContent, "utf-8");
  }
}
