// Import reflect-metadata for decorators to work in tests
require('reflect-metadata');

// Setup Firebase Admin mock
jest.mock('firebase-admin/firestore', () => {
  // Mock implementation will be provided in individual test files
  return {
    getFirestore: jest.fn(),
    FieldValue: {
      serverTimestamp: jest.fn()
    },
    Timestamp: {
      fromDate: jest.fn(),
      now: jest.fn()
    }
  };
});
