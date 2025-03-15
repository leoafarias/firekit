/**
 * Utility constants and functions for handling metadata
 */

// Metadata keys
export const COLLECTION_KEY = "firekit:collection";
export const FIELDS_KEY = "firekit:fields";
export const ID_FIELD_KEY = "firekit:idField";
export const CREATED_AT_KEY = "firekit:createdAt";
export const UPDATED_AT_KEY = "firekit:updatedAt";
export const SUBCOLLECTION_KEY = "firekit:subcollection";

// Field metadata interface
export interface FieldMetadata {
  propertyKey: string | symbol;
  options: FieldOptions;
}

// Field options interface
export interface FieldOptions {
  name?: string;
  index?: boolean;
  transformer?: {
    toFirestore?: (value: any) => any;
    fromFirestore?: (value: any) => any;
  };
}

/**
 * Metadata for a subcollection
 */
export interface SubcollectionMetadata {
  /**
   * Parent entity class
   */
  parentEntity: any;

  /**
   * Collection name for the subcollection
   */
  collectionName: string;

  /**
   * Collection name of the parent entity
   */
  parentCollectionName: string;
}

/**
 * Gets or creates an array of field metadata for a class
 * @param target - Class constructor
 * @returns Array of field metadata
 */
export function getOrCreateFieldsMetadata(target: any): FieldMetadata[] {
  if (!Reflect.hasMetadata(FIELDS_KEY, target)) {
    Reflect.defineMetadata(FIELDS_KEY, [], target);
  }
  return Reflect.getMetadata(FIELDS_KEY, target) || [];
}

/**
 * Adds field metadata to a class
 * @param target - Class constructor
 * @param propertyKey - Property name
 * @param options - Field options
 */
export function addFieldMetadata(
  target: any,
  propertyKey: string | symbol,
  options: FieldOptions = {}
): void {
  const fields = getOrCreateFieldsMetadata(target);
  fields.push({ propertyKey, options });
  Reflect.defineMetadata(FIELDS_KEY, fields, target);
}
