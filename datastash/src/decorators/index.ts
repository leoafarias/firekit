import "reflect-metadata";

// Export decorators
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
