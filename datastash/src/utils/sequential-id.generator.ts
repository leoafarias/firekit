import type { IIdGenerator } from "../interfaces/id-generator.interface";

/**
 * Sequential ID generator implementation
 */
export class SequentialIdGenerator implements IIdGenerator {
  private counter = 0;
  private prefix: string;

  /**
   * Creates a new sequential ID generator
   * @param prefix - Optional prefix for generated IDs (default: "id-")
   * @param startFrom - Optional starting number (default: 1)
   */
  constructor(prefix = "id-", startFrom = 1) {
    this.prefix = prefix;
    this.counter = startFrom - 1; // Will be incremented on first call
  }

  /**
   * Generate a sequential ID
   * @returns A sequential ID string in the format `${prefix}${counter}`
   */
  generateId(): string {
    this.counter++;
    return `${this.prefix}${this.counter}`;
  }

  /**
   * Reset the counter to a specific value
   * @param value - Value to reset the counter to (default: 1)
   */
  reset(value = 1): void {
    this.counter = value - 1;
  }

  /**
   * Get the current counter value
   * @returns The current counter value
   */
  getCurrentValue(): number {
    return this.counter;
  }
}
