/**
 * Interface for ID generation strategies
 */
export interface IIdGenerator {
  /**
   * Generate a unique ID
   * @returns A unique ID string
   */
  generateId(): string | Promise<string>;
}
