import { getFirestore } from "firebase-admin/firestore";
import {
  buildSubcollectionPath,
  getSubcollectionMetadata,
} from "../decorators/subcollection.decorator";
import { EntityRepository } from "../repository/entity.repository";

/**
 * Class to manage entity repositories
 * Serves as a central access point for repositories and handles caching
 */
class FirekitClass {
  /**
   * Map of entity classes to their repositories
   */
  private repositories: Map<string, EntityRepository<any>> = new Map();

  /**
   * Get a repository for an entity class
   * Creates a new repository if one doesn't exist
   *
   * @param entityClass - Entity class decorated with @Collection
   * @returns Repository for the entity
   *
   * @example
   * ```typescript
   * const userRepo = Firekit.getRepository(User);
   * const user = await userRepo.findById('user-id');
   * ```
   */
  getRepository<T>(entityClass: new () => T): EntityRepository<T> {
    const key = entityClass.name;

    if (!this.repositories.has(key)) {
      this.repositories.set(key, new EntityRepository<T>(entityClass));
    }
    return this.repositories.get(key) as EntityRepository<T>;
  }

  /**
   * Get a repository for a subcollection of a specific parent document
   *
   * @param entityClass - Entity class decorated with @Subcollection
   * @param parentId - ID of the parent document
   * @returns Repository for the subcollection
   *
   * @example
   * ```typescript
   * // Get repository for comments of a specific post
   * const commentsRepo = Firekit.getSubcollectionRepository(Comment, postId);
   * const comments = await commentsRepo.findAll();
   * ```
   */
  getSubcollectionRepository<T>(
    entityClass: new () => T,
    parentId: string
  ): EntityRepository<T> {
    // Check if the entity class is a subcollection
    const metadata = getSubcollectionMetadata(entityClass);
    if (!metadata) {
      throw new Error(
        `Class ${entityClass.name} is not decorated with @Subcollection`
      );
    }

    // Build the path to the subcollection
    const path = buildSubcollectionPath(entityClass, parentId);

    // Create a unique key for this repository instance
    const key = `${entityClass.name}:${path}`;

    if (!this.repositories.has(key)) {
      // Create a Firestore collection reference for the subcollection
      const db = getFirestore();
      const collectionRef = db.collection(path);

      // Create a new repository for this subcollection
      this.repositories.set(
        key,
        new EntityRepository<T>(entityClass, collectionRef)
      );
    }

    return this.repositories.get(key) as EntityRepository<T>;
  }

  /**
   * Clear the repository cache
   * Useful for testing or when changing Firebase apps
   */
  clearCache(): void {
    this.repositories.clear();
  }
}

/**
 * Singleton instance of the Firekit class
 */
export const Firekit = new FirekitClass();

/**
 * @deprecated Use Firekit instead
 */
export const FirekitManager = Firekit;
