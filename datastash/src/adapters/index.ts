// Export in-memory adapter
export {
  BatchOperation,
  BatchOperationType,
  InMemoryAdapter,
  InMemoryBatchProcessor,
  InMemoryQueryBuilder,
  InMemoryRepository,
} from "./memory";

// Export file system adapter
export {
  FileSystemAdapter,
  FileSystemAdapterOptions,
  FileSystemBatchProcessor,
  FileSystemQueryBuilder,
  FileSystemRepository,
} from "./fs";
