# Firebase Tests for Firekit

This directory contains tests for validating Firekit's functionality with Firebase.

## Test Files

- `test-firebase-connection.js` - Tests basic Firebase connection
- `test-firebase-crud.js` - Tests CRUD operations with Firestore
- `test-firebase-rtdb.js` - Tests CRUD operations with Realtime Database
- `test-firebase-direct.js` - Tests direct Firebase API access
- `test-firekit-core.js` - Tests Firekit core functionality with JavaScript
- `test-firekit-core.ts` - Tests Firekit core functionality with TypeScript
- `test-firekit-subcollections.ts` - Tests Firekit subcollection functionality

## Running the Tests

To run the tests, make sure you have a valid `serviceAccountKey.json` file in the `config` directory, then run:

```bash
# Test Firebase connection
node tests/firebase/test-firebase-connection.js

# Test Firestore CRUD operations
node tests/firebase/test-firebase-crud.js

# Test Realtime Database CRUD operations
node tests/firebase/test-firebase-rtdb.js

# Test direct Firebase API access
node tests/firebase/test-firebase-direct.js

```

## Testing Firekit with Firebase

For testing Firekit with Firebase, we recommend using the example files in the `examples` directory:

```bash
# Test main collection functionality
npx ts-node examples/main-collection-example.ts

# Test relationships functionality
npx ts-node examples/relationships-example.ts

# Test subcollections functionality
npx ts-node examples/subcollections-example.ts
```

## Subcollection Tests

The subcollection tests (`test-firekit-subcollections.ts`) validate the following functionality:

1. **Basic CRUD Operations** - Creating, reading, updating, and deleting documents in a subcollection
2. **Custom Named Subcollections** - Working with subcollections that have custom names
3. **Multiple Subcollections** - Managing multiple subcollections under a single parent document

These tests ensure that Firekit's subcollection functionality works correctly with Firebase Firestore.

## Creating Indexes

Some queries in the examples require Firestore indexes. When you run the examples, you'll see error messages with links to create the necessary indexes. Follow these links to create the indexes in the Firebase console.

## Troubleshooting

If you encounter any issues with the tests:

1. Make sure your `serviceAccountKey.json` file is valid and has the correct permissions
2. Ensure that both Firestore and Realtime Database are enabled in your Firebase project
3. Check that the Firebase project ID in your service account key matches the one in your Firebase console
4. Verify that you have the necessary Firebase APIs enabled in your project
