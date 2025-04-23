// --- Core ---
export { Entity } from "./interfaces/entity.interface";
export { Stash } from "./stash";
export { ClassType } from "./utils/class.type";

// --- Adapters ---
export {
  FileSystemAdapter,
  FileSystemAdapterOptions,
} from "./adapters/filesystem/filesystem.adapter";
export {
  InMemoryAdapter,
  InMemoryAdapterOptions,
} from "./adapters/memory/memory.adapter";
export { IDatabaseAdapter } from "./interfaces/adapter.interface";
export { IIdGenerator } from "./interfaces/id-generator.interface";

// --- Repositories ---
export { IRepository } from "./interfaces/repository.interface";
export { AbstractRepository } from "./repository/base.repository";
// Direct export for InMemoryRepository is fine, as it's the only export from that file needed here
export { InMemoryRepository } from "./adapters/memory/memory.repository";

// --- Querying ---
export {
  ComparisonOperator,
  IQueryBuilder,
  QueryOptions,
  SortDirection,
} from "./interfaces/query.interface";

// --- Decorators ---
export {
  Collection,
  CollectionOptions,
  CreatedAt,
  Field,
  getCollectionName,
  getCreatedAtField,
  getIdField,
  getUpdatedAtField,
  ID,
  UpdatedAt,
} from "./decorators";

// --- Metadata ---
export {
  addFieldMetadata,
  FieldMetadata,
  FieldOptions,
  getFieldsMetadata,
} from "./utils/metadata.utils";
