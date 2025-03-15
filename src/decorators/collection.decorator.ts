import "reflect-metadata";
import { COLLECTION_KEY } from "../utils/metadata.utils";

/**
 * Decorator to mark a class as a Firestore collection
 * @param collectionName - The name of the Firestore collection
 * @returns Class decorator function
 *
 * @example
 * ```typescript
 * @Collection('users')
 * class User {
 *   // properties...
 * }
 * ```
 */
export function Collection(collectionName: string): ClassDecorator {
  return function decorateCollection(target: any) {
    if (!collectionName || collectionName.trim() === "") {
      throw new Error("Collection name cannot be empty");
    }

    Reflect.defineMetadata(COLLECTION_KEY, collectionName, target);
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
