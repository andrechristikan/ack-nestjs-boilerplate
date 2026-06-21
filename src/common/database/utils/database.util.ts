import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client';
import ObjectID from 'bson-objectid';

/**
 * BSON ObjectID helpers and deep-clone casts to Prisma `JsonObject` types.
 */
@Injectable()
export class DatabaseUtil {
    checkIdIsValid(id: string): boolean {
        return ObjectID.isValid(id);
    }

    createId(): string {
        return ObjectID().toHexString();
    }

    /**
     * Deep-clones `data` and casts it to a Prisma-compatible plain object.
     */
    toPlainObject<T, N = Prisma.JsonObject>(data: T): N {
        return structuredClone(data as unknown) as N;
    }

    /**
     * Deep-clones `data` and casts it to a Prisma-compatible plain array.
     */
    toPlainArray<T, N = Prisma.JsonObject>(data: T): N[] {
        return structuredClone(data) as N[];
    }
}
