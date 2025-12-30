import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import ObjectID from 'bson-objectid';

/**
 * Database utility service providing common database operations.
 *
 * This injectable service provides utility methods for database-related operations,
 * including ID generation using BSON ObjectID format. The generated IDs are
 * compatible with MongoDB ObjectID format and provide unique identifiers
 * for database records.
 *
 * @class DatabaseUtil
 * @injectable
 */
@Injectable()
export class DatabaseUtil {
    /**
     * Checks if the provided ID string is a valid BSON ObjectID.
     *
     * Utilizes the BSON ObjectID library's isValid method to determine
     * if the given string conforms to the ObjectID format.
     *
     * @param {string} id - The ID string to validate
     * @returns {boolean} True if the ID is a valid ObjectID, false otherwise
     */
    checkIdIsValid(id: string): boolean {
        return ObjectID.isValid(id);
    }

    /**
     * Creates a new unique identifier using BSON ObjectID.
     *
     * Generates a new ObjectID and converts it to a hexadecimal string format.
     * The generated ID is unique and follows the BSON ObjectID specification,
     * making it suitable for use as primary keys in database records.
     *
     * @returns {string} A 24-character hexadecimal string representing the ObjectID
     */
    createId(): string {
        return ObjectID().toHexString();
    }

    /**
     * Converts the provided data to a plain object compatible with Prisma JsonObject format.
     *
     * Performs a deep clone of the input and casts it to Prisma.JsonObject, ensuring
     * compatibility for Prisma JSON fields.
     *
     * @template T Input data type
     * @template N Output type, defaults to Prisma.JsonObject
     * @param {T} data - The data to convert
     * @returns {N} The plain object representation, compatible with Prisma JsonObject
     */
    toPlainObject<T, N = Prisma.JsonObject>(data: T): N {
        return structuredClone(data as unknown) as N;
    }

    /**
     * Converts the provided data to a plain array compatible with Prisma JsonObject array format.
     *
     * Performs a deep clone of the input and casts it to an array of Prisma.JsonObject,
     * making it suitable for Prisma JSON array fields.
     *
     * @template T Input data type
     * @template N Output array element type, defaults to Prisma.JsonObject
     * @param {T} data - The data to convert
     * @returns {N[]} The plain array representation, compatible with Prisma JsonObject[]
     */
    toPlainArray<T, N = Prisma.JsonObject>(data: T): N[] {
        return structuredClone(data) as N[];
    }
}
