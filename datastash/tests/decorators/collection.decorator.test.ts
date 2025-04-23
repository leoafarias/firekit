import "reflect-metadata";
import {
  Collection,
  getCollectionName,
} from "../../src/decorators/collection.decorator";
import { COLLECTION_KEY } from "../../src/utils/metadata.utils";

// Define some test classes
@Collection({ name: "valid-collection" })
class ValidClass {}

@Collection({ name: "   spaces-around   " })
class SpacesAroundClass {}

class NoDecoratorClass {}

describe("Collection Decorator", () => {
  @Collection({ name: "users" })
  class User {}

  it("should store collection name in metadata", () => {
    const metadata = Reflect.getMetadata(COLLECTION_KEY, User);
    expect(metadata).toBe("users");
  });

  it("should retrieve collection name using helper function", () => {
    const collectionName = getCollectionName(User);
    expect(collectionName).toBe("users");
  });

  it("should return undefined for class without decorator", () => {
    const collectionName = getCollectionName(NoDecoratorClass);
    expect(collectionName).toBeUndefined();
  });

  it("should define collection metadata correctly", () => {
    const metadata = getCollectionName(ValidClass);
    expect(metadata).toBe("valid-collection");
  });

  it("should trim whitespace from collection name", () => {
    const metadata = getCollectionName(SpacesAroundClass);
    expect(metadata).toBe("spaces-around");
  });
});
