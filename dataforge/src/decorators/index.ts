import "reflect-metadata";
import { Field } from "./field.decorator";
import { ID } from "./id.decorator";
import { CreatedAt, UpdatedAt } from "./timestamp.decorators";

/**
 * Helper function to apply standard entity fields (ID, CreatedAt, UpdatedAt)
 * @param targetPrototype - The prototype of the class to decorate
 */
export function applyStandardEntityFields(targetPrototype: any) {
  // Apply ID decorator to id property
  ID()(targetPrototype, "id");

  // Apply CreatedAt decorator to createdAt property
  CreatedAt()(targetPrototype, "createdAt");

  // Apply UpdatedAt decorator to updatedAt property
  UpdatedAt()(targetPrototype, "updatedAt");

  // Ensure 'id' is registered as a field for metadata purposes
  // This is important for field mapping and validation
  Field()(targetPrototype, "id");
}

// Export collection decorator
export {
  Collection,
  CollectionOptions,
  getCollectionName,
} from "./collection.decorator";
// Export field decorator
export { Field } from "./field.decorator";
// Export ID decorator
export { getIdField, ID } from "./id.decorator";
// Export timestamp decorators
export {
  CreatedAt,
  getCreatedAtField,
  getUpdatedAtField,
  UpdatedAt,
} from "./timestamp.decorators";
// Export subcollection decorator
export {
  getSubcollectionMetadata,
  Subcollection,
  SubcollectionOptions,
} from "./subcollection.decorator";
