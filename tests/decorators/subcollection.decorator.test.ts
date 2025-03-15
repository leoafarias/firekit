import "reflect-metadata";
import { Collection } from "../../src/decorators/collection.decorator";
import {
  Subcollection,
  buildSubcollectionPath,
  getSubcollectionMetadata,
} from "../../src/decorators/subcollection.decorator";
import { SUBCOLLECTION_KEY } from "../../src/utils/metadata.utils";

describe("Subcollection Decorator", () => {
  // Define test classes
  @Collection("posts")
  class Post {
    id!: string;
    title!: string;
  }

  @Subcollection(Post)
  class Comment {
    id!: string;
    content!: string;
  }

  @Subcollection(Post, "post-comments")
  class CustomComment {
    id!: string;
    content!: string;
  }

  it("should store subcollection metadata with parent entity", () => {
    // Assert
    const metadata = Reflect.getMetadata(SUBCOLLECTION_KEY, Comment);
    expect(metadata).toBeDefined();
    expect(metadata.parentEntity).toBe(Post);
    expect(metadata.collectionName).toBe("comment");
    expect(metadata.parentCollectionName).toBe("posts");
  });

  it("should accept custom collection name", () => {
    // Assert
    const metadata = Reflect.getMetadata(SUBCOLLECTION_KEY, CustomComment);
    expect(metadata).toBeDefined();
    expect(metadata.parentEntity).toBe(Post);
    expect(metadata.collectionName).toBe("post-comments");
    expect(metadata.parentCollectionName).toBe("posts");
  });

  it("should retrieve subcollection metadata using getSubcollectionMetadata", () => {
    // Act
    const metadata = getSubcollectionMetadata(Comment);

    // Assert
    expect(metadata).toBeDefined();
    expect(metadata?.parentEntity).toBe(Post);
    expect(metadata?.collectionName).toBe("comment");
    expect(metadata?.parentCollectionName).toBe("posts");
  });

  it("should return undefined when getting subcollection metadata from a class without the decorator", () => {
    // Arrange
    class Regular {}

    // Act
    const metadata = getSubcollectionMetadata(Regular);

    // Assert
    expect(metadata).toBeUndefined();
  });

  it("should build correct subcollection path", () => {
    // Act
    const path = buildSubcollectionPath(Comment, "post-123");

    // Assert
    expect(path).toBe("posts/post-123/comment");
  });

  it("should build correct subcollection path with custom collection name", () => {
    // Act
    const path = buildSubcollectionPath(CustomComment, "post-123");

    // Assert
    expect(path).toBe("posts/post-123/post-comments");
  });

  it("should throw error when building path for non-subcollection class", () => {
    // Arrange
    class Regular {}

    // Act & Assert
    expect(() => buildSubcollectionPath(Regular, "id-123")).toThrow();
  });

  it("should use lowercase class name if no collection name is specified", () => {
    // Arrange
    class Parent {}

    @Subcollection(Parent)
    class Child {}

    // Act
    const metadata = getSubcollectionMetadata(Child);

    // Assert
    expect(metadata).toBeDefined();
    expect(metadata?.collectionName).toBe("child");
    expect(metadata?.parentCollectionName).toBe("parent");
  });
});
