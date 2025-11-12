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
     * Converts data to a plain object compatible with Prisma JsonObject format.
     *
     * @param {T} data - The data to convert to plain object
     * @returns {Prisma.JsonObject} Plain object representation of the data
     */
    toPlainObject<T>(data: T): Prisma.JsonObject {
        return structuredClone(data) as unknown as Prisma.JsonObject;
    }

    /**
     * Converts data to a plain array compatible with Prisma JsonObject array format.
     *
     * @param {T} data - The data to convert to plain array
     * @returns {Prisma.JsonObject[]} Plain array representation of the data
     */
    toPlainArray<T>(data: T): Prisma.JsonObject[] {
        return structuredClone(data) as unknown as Prisma.JsonObject[];
    }
}
