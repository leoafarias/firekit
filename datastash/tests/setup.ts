import "reflect-metadata";

// Jest setup file

// Increase test timeout for slower CI environments
jest.setTimeout(10000);

// Add global setup and teardown hooks
console.log("Starting tests for Stash");

afterAll(() => {
  // Global cleanup
  console.log("Finished tests for Stash");
});
