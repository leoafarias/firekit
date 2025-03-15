import "reflect-metadata";
import {
  SubcollectionMetadata,
  SUBCOLLECTION_KEY,
} from "../utils/metadata.utils";
import { getCollectionName } from "./collection.decorator";

/**
 * Decorator to mark a class as a Firestore subcollection
 * @param parentEntity - Parent entity class
 * @param collectionName - Optional name for the subcollection (defaults to lowercase class name)
 * @returns Class decorator function
 *
 * @example
 * ```typescript
 * // Basic usage
 * @Subcollection(Post)
 * class Comment { }
 *
 * // With custom collection name
 * @Subcollection(Post, 'post-comments')
 * class Comment { }
 * ```
 */
export function Subcollection(
  parentEntity: any,
  collectionName?: string
): ClassDecorator {
  return function decorateSubcollection(target: any) {
    // Get the collection name from parameter, @Collection decorator, or use class name
    const actualCollectionName =
      collectionName || getCollectionName(target) || target.name.toLowerCase();

    // Get parent collection name
    const parentCollectionName =
      getCollectionName(parentEntity) || parentEntity.name.toLowerCase();

    // Store subcollection metadata
    Reflect.defineMetadata(
      SUBCOLLECTION_KEY,
      {
        parentEntity,
        collectionName: actualCollectionName,
        parentCollectionName,
      },
      target
    );
  };
}

/**
 * Gets the subcollection metadata from a class
 * @param target - The class to get the subcollection metadata from
 * @returns The subcollection metadata or undefined if not found
 */
export function getSubcollectionMetadata(
  target: any
): SubcollectionMetadata | undefined {
  return Reflect.getMetadata(SUBCOLLECTION_KEY, target);
}

/**
 * Builds a path to a subcollection for a specific parent document
 * @param childEntity - The subcollection entity class
 * @param parentId - The ID of the parent document
 * @returns The path to the subcollection
 * @throws Error if the class is not a subcollection
 */
export function buildSubcollectionPath(
  childEntity: any,
  parentId: string
): string {
  const metadata = getSubcollectionMetadata(childEntity);
  if (!metadata) {
    throw new Error(`${childEntity.name} is not a subcollection`);
  }

  return `${metadata.parentCollectionName}/${parentId}/${metadata.collectionName}`;
}
