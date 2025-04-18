import "reflect-metadata";
import {
  Collection,
  getCollectionName,
} from "../../src/decorators/collection.decorator";

describe("Collection Decorator", () => {
  @Collection({ name: "users" })
  class User {}

  @Collection({ name: "  " })
  class InvalidUser {}

  class NoDecoratorUser {}

  it("should store collection name in metadata", () => {
    const metadata = Reflect.getMetadata("collection:name", User);
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
  });
});
