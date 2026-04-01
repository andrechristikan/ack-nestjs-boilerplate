import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client';
import ObjectID from 'bson-objectid';

/**
 * Utility service for common database operations.
 *
 * Provides BSON ObjectID generation and validation, plus deep-clone helpers
 * for converting in-memory objects to Prisma-compatible `JsonObject` types.
 */
@Injectable()
export class DatabaseUtil {
    /**
     * Checks whether the given string is a valid BSON ObjectID.
     *
     * @param {string} id - The identifier string to validate
     * @returns {boolean} True when the string conforms to the 24-character hex ObjectID format
     */
    checkIdIsValid(id: string): boolean {
        return ObjectID.isValid(id);
    }

    /**
     * Generates a new unique BSON ObjectID as a hexadecimal string.
     *
     * @returns {string} A 24-character hex string suitable for use as a MongoDB document ID
     */
    createId(): string {
        return ObjectID().toHexString();
    }

    /**
     * Deep-clones the input and casts it to a Prisma-compatible plain object.
     *
     * @template T Input data type
     * @template N Output type, defaults to `Prisma.JsonObject`
     * @param {T} data - The value to clone and cast
     * @returns {N} A deep clone of `data` typed as `N`
     */
    toPlainObject<T, N = Prisma.JsonObject>(data: T): N {
        return structuredClone(data as unknown) as N;
    }

    /**
     * Deep-clones the input and casts it to a Prisma-compatible plain array.
     *
     * @template T Input data type
     * @template N Array element type, defaults to `Prisma.JsonObject`
     * @param {T} data - The value to clone and cast
     * @returns {N[]} A deep clone of `data` typed as `N[]`
     */
    toPlainArray<T, N = Prisma.JsonObject>(data: T): N[] {
        return structuredClone(data) as N[];
    }
}
