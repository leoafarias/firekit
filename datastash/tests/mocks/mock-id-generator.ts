import { IIdGenerator } from "../../src/interfaces/id-generator.interface";

/**
 * Mock ID Generator for testing purposes.
 * Returns sequential IDs like 'mock-id-1', 'mock-id-2'.
 */
export class MockIdGenerator implements IIdGenerator {
  private counter = 0;

  generateId(): string {
    this.counter++;
    return `mock-id-${this.counter}`;
  }

  // Add jest mock function if needed for spying
  // generateId = jest.fn(() => {
  //   this.counter++;
  //   return `mock-id-${this.counter}`;
  // });

  reset() {
    this.counter = 0;
  }
}
