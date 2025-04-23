import { CreatedAt, ID, UpdatedAt } from "../decorators";
import { DeletedAt } from "../decorators/timestamp.decorators";
import { Entity } from "../interfaces/entity.interface";

/**
 * Base class for entities providing standard fields.
 * Classes decorated with @Collection should extend this class.
 */
export abstract class BaseEntity implements Entity {
  /**
   * Unique identifier for the entity.
   * Auto-decorated by @ID.
   */
  @ID()
  id!: string;

  /**
   * Timestamp of when the entity was created.
   * Auto-decorated by @CreatedAt.
   */
  @CreatedAt()
  createdAt!: Date;

  /**
   * Timestamp of when the entity was last updated.
   * Auto-decorated by @UpdatedAt.
   */
  @UpdatedAt()
  updatedAt!: Date;

  /**
   * Timestamp of when the entity was deleted.
   * Auto-decorated by @DeletedAt.
   */
  @DeletedAt()
  deletedAt!: Date | null;
}
