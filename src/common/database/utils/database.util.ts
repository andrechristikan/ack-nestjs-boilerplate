import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client';
import { v7, validate } from 'uuid';

/**
 * UUID helpers and deep-clone casts to Prisma JSON input types.
 */
@Injectable()
export class DatabaseUtil {
    checkIdIsValid(id: string): boolean {
        return validate(id);
    }

    createId(): string {
        return v7();
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
     * `null` is converted to JSON null because Prisma JSON writes reserve raw
     * null for nullable-column ambiguity.
     */
    toPlainObject<T, N = Prisma.JsonObject>(data: T): N {
        if (data === null) {
            return Prisma.JsonNull as N;
        }

        return structuredClone(data as unknown) as N;
    }

    /**
     * Deep-clones `data` and casts it to a Prisma-compatible plain array.
     */
    toPlainArray<T, N = Prisma.JsonObject>(data: T): N[] {
        return structuredClone(data) as N[];
    }

    /**
     * Nested-write fragment for a to-many relation that is rewritten wholesale:
     * every existing row is deleted and the relation is repopulated from `rows`.
     * An empty list produces a pure delete, so `createMany` is omitted.
     */
    replaceMany<T>(rows: T[]): {
        deleteMany: Record<string, never>;
        createMany?: { data: T[] };
    } {
        return {
            deleteMany: {},
            ...(rows.length > 0 ? { createMany: { data: rows } } : {}),
        };
    }
}
