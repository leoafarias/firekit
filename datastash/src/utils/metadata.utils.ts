import "reflect-metadata";

/**
 * Metadata keys for storing decorator information
 */
export const COLLECTION_KEY = Symbol("collectionName");
export const FIELDS_KEY = Symbol("fields");
export const ID_FIELD_KEY = Symbol("idField");
export const CREATED_AT_FIELD_KEY = Symbol("createdAtField");
export const UPDATED_AT_FIELD_KEY = Symbol("updatedAtField");
export const DELETED_AT_FIELD_KEY = Symbol("deletedAtField");
export const SUBCOLLECTION_KEY = Symbol("subcollection");

/**
 * Field metadata interface for storing field information
 */
export interface FieldMetadata {
  /**
   * Property key in the class
   */
  propertyKey: string | symbol;

  /**
   * Field configuration options
   */
  options: FieldOptions;
}

/**
 * Field configuration options
 */
export interface FieldOptions {
  /**
   * Whether this field should be indexed
   */
  index?: boolean;

  /**
   * Additional field options (adapter-specific)
   */
  [key: string]: unknown;
}

/**
 * Add field metadata to a class
 * @param constructor - The class constructor
 * @param propertyKey - The property key for the field
 * @param options - Field options
 */
export function addFieldMetadata(
  constructor: object,
  propertyKey: string | symbol,
  options: FieldOptions = {}
): void {
  // Get existing fields metadata or initialize empty array
  const fields: FieldMetadata[] =
    (Reflect.getMetadata(FIELDS_KEY, constructor) as FieldMetadata[]) ?? [];

  // Add new field metadata
  fields.push({ propertyKey, options });

  // Store updated metadata
  Reflect.defineMetadata(FIELDS_KEY, fields, constructor);
}

/**
 * Get all field metadata for a class
 * @param target - The class to get field metadata from
 * @returns Array of field metadata
 */
export function getFieldsMetadata(target: object): FieldMetadata[] {
  return (Reflect.getMetadata(FIELDS_KEY, target) as FieldMetadata[]) ?? [];
}
