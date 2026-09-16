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
     * True when `error` is a Prisma unique-constraint violation naming `field`, so a caller can tell
     * its own generated value apart from any other unique key on the same table.
     */
    isUniqueCollision(error: unknown, field: string): boolean {
        if (
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== 'P2002'
        ) {
            return false;
        }

        const target = error.meta?.target;
        const fields = Array.isArray(target) ? target : [target];

        return fields.some(
            entry =>
                typeof entry === 'string' &&
                entry.toLowerCase().includes(field.toLowerCase())
        );
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
