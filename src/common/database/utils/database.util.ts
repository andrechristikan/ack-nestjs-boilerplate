import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import { ObjectId } from 'bson';
import {
    DatabaseUnavailableCodes,
    DatabaseUniqueConstraintCode,
    DatabaseWriteConflictCode,
} from '@common/database/constants/database.constant';
import type { AppBaseException } from '@app/exceptions/app.base.exception';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';

/**
 * BSON ObjectId helpers and deep-clone casts to Prisma `JsonObject` types.
 */
@Injectable()
export class DatabaseUtil {
    checkIdIsValid(id: string): boolean {
        return ObjectId.isValid(id);
    }

    createId(): string {
        return new ObjectId().toHexString();
    }

    /**
     * True when `error` is a Prisma unique-constraint violation naming `field`, so a caller can tell
     * its own generated value apart from any other unique key on the same table.
     */
    isUniqueCollision(error: unknown, field: string): boolean {
        if (
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== DatabaseUniqueConstraintCode
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
     * Returns the exception for a Prisma write conflict (`P2034`) or a connection failure, or `null` for any other error.
     */
    toException(error: unknown): AppBaseException | null {
        if (error instanceof Prisma.PrismaClientInitializationError) {
            return new DatabaseUnavailableException();
        }

        if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
            return null;
        }

        if (error.code === DatabaseWriteConflictCode) {
            return new DatabaseWriteConflictException();
        }

        if (DatabaseUnavailableCodes.includes(error.code)) {
            return new DatabaseUnavailableException();
        }

        return null;
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
