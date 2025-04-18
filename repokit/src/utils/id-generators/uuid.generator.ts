import { v4 as uuidv4 } from "uuid";
import { IIdGenerator } from "../../interfaces/id-generator.interface";

/**
 * UUID v4 ID generator implementation
 */
export class UuidGenerator implements IIdGenerator {
  /**
   * Generate a new UUID v4
   * @returns A UUID v4 string
   */
  generateId(): string {
    return uuidv4();
  }
}
