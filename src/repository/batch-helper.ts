import { CollectionReference, WriteBatch } from "firebase-admin/firestore";
import { FieldsOnly, toPartialFields } from "../models/entity.model";
import { EntityRepository } from "./entity.repository";

/**
 * Helper class for batch operations on entities
 */
export class FirestoreBatchHelper<T extends object> {
  /**
   * Creates a new batch helper
   * @param batch - Firestore write batch
   * @param collectionRef - Firestore collection reference
   * @param repository - Entity repository
   */
  constructor(
    private batch: WriteBatch,
    private collectionRef: CollectionReference,
    private repository: EntityRepository<T>
  ) {}

  /**
   * Add a create operation to the batch
   * @param data - Entity data to create
   * @param id - Optional ID for the new document (auto-generated if not provided)
   * @returns This batch helper for chaining
   */
  create(data: FieldsOnly<T>, id?: string): FirestoreBatchHelper<T> {
    // Convert entity to Firestore data
    const firestoreData = this.repository.toFirestore(toPartialFields(data));

    // Add to batch
    if (id) {
      this.batch.set(this.collectionRef.doc(id), firestoreData);
    } else {
      this.batch.set(this.collectionRef.doc(), firestoreData);
    }

    return this;
  }

  /**
   * Add an update operation to the batch
   * @param id - ID of the document to update
   * @param data - Entity data to update
   * @returns This batch helper for chaining
   */
  update(id: string, data: Partial<T>): FirestoreBatchHelper<T> {
    // Convert entity to Firestore data
    const firestoreData = this.repository.toFirestore(data);

    // Add to batch
    this.batch.update(this.collectionRef.doc(id), firestoreData);

    return this;
  }

  /**
   * Add a delete operation to the batch
   * @param id - ID of the document to delete
   * @returns This batch helper for chaining
   */
  delete(id: string): FirestoreBatchHelper<T> {
    this.batch.delete(this.collectionRef.doc(id));
    return this;
  }

  /**
   * Commit the batch
   * @returns Promise that resolves when the batch is committed
   */
  async commit(): Promise<void> {
    await this.batch.commit();
  }

  /**
   * Create a batch helper for a specific subcollection
   * @param parentId - ID of the parent document
   * @param subcollectionName - Name of the subcollection
   * @param childRepo - Repository for the child entity
   * @returns A new batch helper for the subcollection
   */
  forSubcollection<R extends object>(
    parentId: string,
    subcollectionName: string,
    childRepo: EntityRepository<R>
  ): FirestoreBatchHelper<R> {
    // Get subcollection reference
    const subcollectionRef = this.collectionRef
      .doc(parentId)
      .collection(subcollectionName);

    // Create a new batch helper for the subcollection
    return new FirestoreBatchHelper<R>(this.batch, subcollectionRef, childRepo);
  }
}
