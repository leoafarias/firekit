import "reflect-metadata";
import {
  Collection,
  getCollectionName,
} from "../../src/decorators/collection.decorator";
import { COLLECTION_KEY } from "../../src/utils/metadata.utils";

describe("Collection Decorator", () => {
  @Collection({ name: "users" })
  class User {}

  class NoDecoratorUser {}

  it("should store collection name in metadata", () => {
    const metadata = Reflect.getMetadata(COLLECTION_KEY, User);
    expect(metadata).toBe("users");
  });

  it("should retrieve collection name using helper function", () => {
    const collectionName = getCollectionName(User);
    expect(collectionName).toBe("users");
  });

  it("should return undefined for class without decorator", () => {
    const collectionName = getCollectionName(NoDecoratorUser);
    expect(collectionName).toBeUndefined();
  });

  it("should throw error for empty or whitespace collection name", () => {
    expect(() => {
      @Collection({ name: "" })
      class EmptyNameClass {}
    }).toThrow("Collection name cannot be empty");

    expect(() => {
      @Collection({ name: "  " })
      class WhitespaceNameClass {}
    }).toThrow("Collection name cannot be empty");
  });
});
