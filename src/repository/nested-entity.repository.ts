import { Firestore, getFirestore } from "firebase-admin/firestore";

import { Firekit } from "../manager/entity-manager";
import { EntityRepository } from "./entity.repository";

/**
 * Repository that helps manage relationships between entities
 * This is useful for implementing nested documents and relationships
 */
export class NestedEntityRepository<T, R> {
  private db: Firestore;
  private parentRepo: EntityRepository<T>;
  private childRepo: EntityRepository<R>;
  private childField: keyof T;
  private pathBuilder: (parentId: string) => string;

  /**
   * Creates a nested entity repository
   * @param parentEntity - Parent entity class
   * @param childEntity - Child entity class
   * @param childField - Field name in parent entity to store child entity/entities
   * @param pathBuilder - Function to build path to child collection based on parent ID
   */
  constructor(
    parentEntity: new () => T,
    childEntity: new () => R,
    childField: keyof T,
    pathBuilder: (parentId: string) => string
  ) {
    this.db = getFirestore();
    this.parentRepo = Firekit.getRepository(parentEntity);
    this.childRepo = Firekit.getRepository(childEntity);
    this.childField = childField;
    this.pathBuilder = pathBuilder;
  }

  /**
   * Get the child repository for a specific parent
   * @param parentId - ID of the parent entity
   * @returns Entity repository for the child entity
   */
  private getChildRepositoryFor(parentId: string): EntityRepository<R> {
    // Get collection reference for the subcollection
    const path = this.pathBuilder(parentId);

    // Return a repository that uses this subcollection
    return new EntityRepository<R>(this.childRepo["entityClass"]);
  }

  /**
   * Load a parent entity with its nested child entity(ies)
   * @param parentId - ID of the parent entity
   * @returns Parent entity with loaded child entity(ies)
   */
  async loadWithNested(parentId: string): Promise<T | null> {
    // First get the parent
    const parent = await this.parentRepo.findById(parentId);
    if (!parent) {
      return null;
    }

    // Get child repository for this parent
    const childRepo = this.getChildRepositoryFor(parentId);

    // Load the child entity or entities (if it's an array field in the parent)
    try {
      if (Array.isArray(parent[this.childField])) {
        // If the field is an array, we're dealing with a one-to-many relationship
        // We need to load all child entities
        const childEntities = await childRepo.findAll();
        parent[this.childField] = childEntities as any;
      } else {
        // If the field is not an array, we're dealing with a one-to-one relationship
        // Load just the single child entity
        // We'll assume the ID of the child is the same as the parent for simplicity
        const childEntity = await childRepo.findById(parentId);
        parent[this.childField] = childEntity as any;
      }
    } catch (error) {
      // If there's an error, just return the parent without the child
      console.error(`Error loading nested entity for ${parentId}:`, error);
    }

    return parent;
  }

  /**
   * Create a parent entity with a nested child entity
   * @param parentData - Data for the parent entity
   * @param childData - Data for the child entity
   * @returns Created parent entity with nested child entity
   */
  async createWithNested(
    parentData: Partial<T>,
    childData: Partial<R>
  ): Promise<T> {
    const batch = this.db.batch();

    try {
      // First create the parent
      const parent = await this.parentRepo.create(parentData);

      // Type assertion to ensure we can access the id
      const parentWithId = parent as T & { id: string };

      // Get child repository for this parent
      const childRepo = this.getChildRepositoryFor(parentWithId.id);

      // Create the child entity in a subcollection
      const childId = Array.isArray(parentWithId[this.childField])
        ? undefined
        : parentWithId.id;
      const child = await childRepo.create(childData, childId);

      // Update the parent's field with the child entity
      if (Array.isArray(parentWithId[this.childField])) {
        // If it's an array field, add the child to the array
        (parentWithId[this.childField] as any) = [child];
      } else {
        // If it's a single field, set it to the child
        parentWithId[this.childField] = child as any;
      }

      return parent;
    } catch (error) {
      throw new Error(`Failed to create nested entity: ${error}`);
    }
  }

  /**
   * Update a parent entity and its nested child entity
   * @param parentId - ID of the parent entity
   * @param parentData - Data to update in the parent
   * @param childData - Data to update in the child
   * @param childId - ID of the child entity (defaults to parentId for one-to-one)
   * @returns Promise that resolves to the updated parent entity with nested child entity
   */
  async updateWithNested(
    parentId: string,
    parentData: Partial<T>,
    childData: Partial<R>,
    childId?: string
  ): Promise<T> {
    // Use a transaction to ensure atomicity
    const effectiveChildId = childId || parentId;

    await this.db.runTransaction(async (transaction) => {
      // Update the parent
      if (Object.keys(parentData).length > 0) {
        const parentRef = this.parentRepo.getCollectionRef().doc(parentId);
        transaction.update(parentRef, this.parentRepo.toFirestore(parentData));
      }

      // Get child repository for this parent
      const childRepo = this.getChildRepositoryFor(parentId);

      // Update the child
      if (Object.keys(childData).length > 0) {
        const childRef = childRepo.getCollectionRef().doc(effectiveChildId);
        transaction.update(childRef, childRepo.toFirestore(childData));
      }
    });

    // Load and return the updated entity with its nested entity
    return this.loadWithNested(parentId) as Promise<T>;
  }

  /**
   * Delete a parent entity and its nested child entity(ies)
   * @param parentId - ID of the parent entity
   */
  async deleteWithNested(parentId: string): Promise<void> {
    // Use a batch to ensure atomicity
    const batch = this.db.batch();

    // Delete the parent
    batch.delete(this.parentRepo.getCollectionRef().doc(parentId));

    // Get child repository for this parent
    const childRepo = this.getChildRepositoryFor(parentId);

    // Check if we need to delete multiple children or just one
    const parent = await this.parentRepo.findById(parentId);
    if (parent && Array.isArray(parent[this.childField])) {
      // If it's an array field, we need to find and delete all children
      const children = await childRepo.findAll();
      children.forEach((child) => {
        const childId = childRepo["idField"]
          ? child[childRepo["idField"] as keyof R]
          : undefined;
        if (childId) {
          batch.delete(childRepo.getCollectionRef().doc(childId as string));
        }
      });
    } else {
      // Otherwise, just delete the single child entity
      batch.delete(childRepo.getCollectionRef().doc(parentId));
    }

    await batch.commit();
  }
}
