import "reflect-metadata";
import {
  Collection,
  getCollectionName,
} from "../../src/decorators/collection.decorator";
import { COLLECTION_KEY } from "../../src/utils/metadata.utils";

describe("Collection Decorator", () => {
  // Define test class
  @Collection("users")
  class User {
    id!: string;
    name!: string;
  }

  it("should store collection name metadata", () => {
    // Get metadata directly
    const collectionName = Reflect.getMetadata(COLLECTION_KEY, User);

    // Assert
    expect(collectionName).toBe("users");
  });

  it("should retrieve collection name using getCollectionName function", () => {
    // Get collection name using helper function
    const collectionName = getCollectionName(User);

    // Assert
    expect(collectionName).toBe("users");
  });

  it("should return undefined when getting collection name from a class without the decorator", () => {
    // Arrange
    class Regular {
      id!: string;
    }

    // Act
    const collectionName = getCollectionName(Regular);

    // Assert
    expect(collectionName).toBeUndefined();
  });

  it("should throw error when collection name is empty", () => {
    // Act & Assert
    expect(() => {
      @Collection("")
      class EmptyCollection {}
    }).toThrow("Collection name cannot be empty");
  });

  it("should throw error when collection name is whitespace", () => {
    // Act & Assert
    expect(() => {
      @Collection("   ")
      class WhitespaceCollection {}
    }).toThrow("Collection name cannot be empty");
  });
});
