import { ClassType } from "class-transformer-validator";
import * as fs from "fs/promises";
import * as path from "path";
import { getCollectionName } from "../../decorators";
import { IDatabaseAdapter, IIdGenerator, IRepository } from "../../interfaces";
import { UuidGenerator } from "../../utils/id-generators";
import { FileSystemRepository } from "./fs.repository";

// Define the expected structure within a collection file
// Using an array requires objects to have an 'id' field for lookups.
// Using Record<string, T> uses ID as key, maybe simpler for lookups.
// Let's stick with Array for now, repository needs to handle lookups.
type CollectionData<T> = T[];

export interface FileSystemAdapterOptions {
  /**
   * The root directory path where collection JSON files will be stored.
   */
  dbPath: string;
}

export class FileSystemAdapter implements IDatabaseAdapter {
  private dbPath: string = "";
  private connected: boolean = false;
  private idGenerator: IIdGenerator = new UuidGenerator();

  /**
   * Connects to the file system database.
   * Ensures the root database directory exists.
   * @param options - Filesystem adapter options.
   */
  async connect(options: FileSystemAdapterOptions): Promise<void> {
    if (this.connected) {
      throw new Error("FileSystemAdapter is already connected");
    }
    if (!options || !options.dbPath) {
      throw new Error("dbPath must be provided in options");
    }

    this.dbPath = path.resolve(options.dbPath); // Use absolute path

    try {
      // Ensure the root database directory exists
      await fs.mkdir(this.dbPath, { recursive: true });
      console.log(`FileSystemAdapter connected to directory: ${this.dbPath}`);
    } catch (error: any) {
      console.error(
        `Failed to create database directory: ${this.dbPath}`,
        error
      );
      throw new Error(
        `Failed to initialize database directory: ${error.message}`
      );
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      // Optional: Log a warning or throw? For fs, disconnecting might not mean much.
      // console.warn('FileSystemAdapter is not connected');
      return;
    }
    this.connected = false;
    this.dbPath = ""; // Reset path
    console.log("FileSystemAdapter disconnected.");
  }

  getRepository<T extends object>(entityClass: ClassType<T>): IRepository<T> {
    if (!this.connected) {
      throw new Error("FileSystemAdapter is not connected");
    }
    const collectionName = getCollectionName(entityClass);
    if (!collectionName) {
      throw new Error(
        `Class ${entityClass.name} is not decorated with @Collection`
      );
    }

    const collectionFilePath = this._getCollectionPath(collectionName);

    // Instantiate repository - it will need to handle potential lack of 'id'
    // during operations if T doesn't guarantee it, though our usage pattern implies it.
    // The constraint <T extends object> is now matched.
    return new FileSystemRepository<T>(entityClass, this, collectionFilePath);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getIdGenerator(): IIdGenerator {
    return this.idGenerator;
  }

  setIdGenerator(generator: IIdGenerator): void {
    this.idGenerator = generator;
  }

  // --- Helper Methods ---

  /**
   * Gets the full path to a collection's JSON file.
   * @param collectionName - The name of the collection.
   * @returns The absolute file path.
   */
  _getCollectionPath(collectionName: string): string {
    if (!this.dbPath) {
      throw new Error("Adapter not connected or dbPath not set.");
    }
    // Basic sanitization to prevent path traversal issues
    const safeCollectionName = collectionName.replace(/[.\/]/g, "_");
    return path.join(this.dbPath, `${safeCollectionName}.json`);
  }

  /**
   * Reads and parses the JSON data for a given collection file.
   * Returns an empty array if the file doesn't exist.
   * @param collectionPath - Path to the collection JSON file.
   * @returns The parsed collection data (array).
   */
  async _readCollectionFile<T extends object>(
    collectionPath: string
  ): Promise<CollectionData<T>> {
    try {
      const fileContent = await fs.readFile(collectionPath, "utf-8");
      // Add basic validation? Ensure it's an array?
      const parsedData = JSON.parse(fileContent);
      if (!Array.isArray(parsedData)) {
        throw new Error("Collection file does not contain a valid JSON array.");
      }
      return parsedData as CollectionData<T>;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // File doesn't exist, return empty array (treat as empty collection)
        return [];
      }
      console.error(
        `Error reading/parsing collection file: ${collectionPath}`,
        error
      );
      throw new Error(
        `Failed to read collection file ${path.basename(collectionPath)}: ${
          error.message
        }`
      );
    }
  }

  /**
   * Writes the given data array to the specified collection JSON file.
   * Overwrites the existing file.
   * @param collectionPath - Path to the collection JSON file.
   * @param data - The data array to write.
   */
  async _writeCollectionFile<T extends object>(
    collectionPath: string,
    data: CollectionData<T>
  ): Promise<void> {
    // Basic check if connected
    if (!this.connected) {
      throw new Error("Attempted to write data while adapter is disconnected.");
    }
    // Ensure data is an array before stringifying
    if (!Array.isArray(data)) {
      console.error(
        `Attempted to write non-array data to collection file: ${collectionPath}`
      );
      throw new Error("Internal error: Data to be written must be an array.");
    }
    try {
      const jsonData = JSON.stringify(data, null, 2); // Pretty print JSON
      await fs.writeFile(collectionPath, jsonData, "utf-8");
    } catch (error: any) {
      console.error(`Error writing collection file: ${collectionPath}`, error);
      throw new Error(
        `Failed to write collection file ${path.basename(collectionPath)}: ${
          error.message
        }`
      );
    }
  }
}
