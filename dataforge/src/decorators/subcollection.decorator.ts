import "reflect-metadata";
import { SUBCOLLECTION_KEY } from "../utils/metadata.utils";
import { applyStandardEntityFields } from "./index";

/**
 * Options for the Subcollection decorator
 */
export interface SubcollectionOptions {
  /**
   * Name of the subcollection
   */
  name: string;

  /**
   * Parent collection name or type
   */
  parent: string | Function;

  /**
   * Field in the parent entity that references this subcollection
   * Optional - defaults to the subcollection name
   */
  parentField?: string;
}

/**
 * Decorator to mark a class as a subcollection and apply standard entity fields.
 * This automatically applies ID, CreatedAt, and UpdatedAt decorators.
 * @param options - Subcollection options
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @Subcollection({ name: 'comments', parent: Post })
 * class Comment {
 *   id!: string;
 *   createdAt!: Date;
 *   updatedAt!: Date;
 *
 *   @Field()
 *   content!: string;
 *
 *   @Field()
 *   postId!: string; // Reference to parent
 * }
 * ```
 */
export function Subcollection(options: SubcollectionOptions): ClassDecorator {
  return function decorateSubcollection(target: any) {
    if (!options.name || options.name.trim() === "") {
      throw new Error("Subcollection name cannot be empty");
    }

    if (!options.parent) {
      throw new Error("Parent collection must be specified");
    }

    // Calculate parent name if parent is a class
    const parentName =
      typeof options.parent === "string" ? options.parent : options.parent.name;

    // Store subcollection metadata
    Reflect.defineMetadata(
      SUBCOLLECTION_KEY,
      {
        name: options.name,
        parent: parentName,
        parentField: options.parentField || options.name,
      },
      target
    );

    // Apply standard entity fields using the helper function
    applyStandardEntityFields(target.prototype);
  };
}

/**
 * Gets the subcollection metadata from a class decorated with @Subcollection
 * @param target - The class to get the subcollection metadata from
 * @returns The subcollection metadata or undefined if not found
 */
export function getSubcollectionMetadata(target: any):
  | {
      name: string;
      parent: string;
      parentField: string;
    }
  | undefined {
  return Reflect.getMetadata(SUBCOLLECTION_KEY, target);
}
