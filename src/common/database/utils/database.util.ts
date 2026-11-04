import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import { ObjectId } from 'bson';
import {
    DatabaseIdInvalidCode,
    DatabaseTransactionExpiredCode,
    DatabaseUnavailableCodes,
    DatabaseUniqueConstraintCode,
    DatabaseUrlCensoredValue,
    DatabaseWriteConflictCode,
} from '@common/database/constants/database.constant';
import type { AppBaseException } from '@app/exceptions/app.base.exception';
import { DatabaseIdInvalidException } from '@common/database/exceptions/database.id-invalid.exception';
import { DatabaseTransactionExpiredException } from '@common/database/exceptions/database.transaction-expired.exception';
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
     * Masks a connection url for a log line: the password is dropped, the username keeps its first
     * letter, every host stays, and the query is removed. A string without the `scheme://` shape
     * returns the censored value.
     */
    censorUrl(url: string): string {
        const schemeEnd = url.indexOf('://');
        if (schemeEnd === -1) {
            return DatabaseUrlCensoredValue;
        }

        const scheme = url.slice(0, schemeEnd + 3);
        const rest = url.slice(schemeEnd + 3);
        const queryStart = rest.indexOf('?');
        const withoutQuery =
            queryStart === -1 ? rest : rest.slice(0, queryStart);
        const pathStart = withoutQuery.indexOf('/');
        const authority =
            pathStart === -1 ? withoutQuery : withoutQuery.slice(0, pathStart);
        const path = pathStart === -1 ? '' : withoutQuery.slice(pathStart);
        const credentialEnd = authority.lastIndexOf('@');
        if (credentialEnd === -1) {
            return `${scheme}${authority}${path}`;
        }

        const username = authority
            .slice(0, credentialEnd)
            .split(':', 1)
            .join('');
        const hosts = authority.slice(credentialEnd + 1);
        const user =
            username === ''
                ? ''
                : `${username.slice(0, 1)}${DatabaseUrlCensoredValue}@`;

        return `${scheme}${user}${hosts}${path}`;
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
     * Returns the exception for a Prisma write conflict (`P2034`), malformed id (`P2023`), expired transaction (`P2028`), or a connection failure, or `null` for any other error.
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

        if (error.code === DatabaseIdInvalidCode) {
            return new DatabaseIdInvalidException();
        }

        if (error.code === DatabaseTransactionExpiredCode) {
            return new DatabaseTransactionExpiredException();
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
