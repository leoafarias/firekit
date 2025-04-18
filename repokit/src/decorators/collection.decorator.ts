import "reflect-metadata";
import { COLLECTION_KEY } from "../utils/metadata.utils";

/**
 * Collection options for the Collection decorator
 */
export interface CollectionOptions {
  /**
   * Collection name in the database
   */
  name: string;
}

/**
 * Decorator to mark a class as a database collection
 * @param options - Collection options
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @Collection({ name: 'users' })
 * class User {
 *   // properties...
 * }
 * ```
 */
export function Collection(options: CollectionOptions): ClassDecorator {
  return function decorateCollection(target: any) {
    if (!options.name || options.name.trim() === "") {
      throw new Error("Collection name cannot be empty");
    }

    Reflect.defineMetadata(COLLECTION_KEY, options.name, target);
  };
}

/**
 * Gets the collection name from a class decorated with @Collection
 * @param target - The class to get the collection name from
 * @returns The collection name or undefined if not found
 */
export function getCollectionName(target: any): string | undefined {
  return Reflect.getMetadata(COLLECTION_KEY, target);
}
