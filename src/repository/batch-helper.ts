import { CollectionReference, WriteBatch, FieldValue } from 'firebase-admin/firestore';
import { EntityRepository } from './entity.repository';

/**
 * Helper class for batch operations on entities
 */
export class FirestoreBatchHelper<T> {
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
  create(data: Partial<T>, id?: string): FirestoreBatchHelper<T> {
    // Convert entity to Firestore data
    const firestoreData = this.repository.toFirestore(data);
    
    // Add timestamps
    const createdAtField = this.repository.getCreatedAtField();
    const updatedAtField = this.repository.getUpdatedAtField();
    
    if (createdAtField) {
      firestoreData[createdAtField.toString()] = FieldValue.serverTimestamp();
    }
    
    if (updatedAtField) {
      firestoreData[updatedAtField.toString()] = FieldValue.serverTimestamp();
    }
    
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
    
    // Add updated timestamp
    const updatedAtField = this.repository.getUpdatedAtField();
    if (updatedAtField) {
      firestoreData[updatedAtField.toString()] = FieldValue.serverTimestamp();
    }
    
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
}
