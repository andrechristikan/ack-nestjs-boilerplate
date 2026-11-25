import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@generated/prisma-client/client';
import { ObjectId } from 'bson';
import {
    DatabaseIdInvalidCode,
    DatabaseRawQueryFailedCode,
    DatabaseRecordNotFoundCode,
    DatabaseTransactionExpiredCode,
    DatabaseUnavailableCodes,
    DatabaseUnavailableMessages,
    DatabaseUniqueConstraintCode,
    DatabaseUrlCensoredValue,
    DatabaseWriteConflictCode,
} from '@common/database/constants/database.constant';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { AppBaseException } from '@app/exceptions/app.base.exception';
import type {
    IDatabaseScalarField,
    IDatabaseUniqueCollision,
} from '@common/database/interfaces/database.interface';
import { DatabaseIdInvalidException } from '@common/database/exceptions/database.id-invalid.exception';
import { DatabaseTransactionExpiredException } from '@common/database/exceptions/database.transaction-expired.exception';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';

@Injectable()
export class DatabaseUtil {
    private readonly serverSelectionTimeoutInMs: number;
    private readonly connectTimeoutInMs: number;

    constructor(private readonly configService: ConfigService) {
        this.serverSelectionTimeoutInMs = this.configService.get<number>(
            'database.serverSelectionTimeoutInMs'
        )!;
        this.connectTimeoutInMs = this.configService.get<number>(
            'database.connectTimeoutInMs'
        )!;
    }

    /** Appends the configured server-selection and connect timeouts to a connection url; the caller passes a url that carries neither parameter. */
    buildClientUrl(url: string): string {
        const separator = url.includes('?') ? '&' : '?';

        return `${url}${separator}serverSelectionTimeoutMS=${this.serverSelectionTimeoutInMs}&connectTimeoutMS=${this.connectTimeoutInMs}`;
    }

    checkIdIsValid(id: string): boolean {
        return ObjectId.isValid(id);
    }

    createId(): string {
        return new ObjectId().toHexString();
    }

    /** Masks a connection url for a log line: the password and query are dropped, the username keeps its first letter, and a string without `scheme://` returns `DatabaseUrlCensoredValue`. */
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

    isUniqueCollision(error: unknown, field: IDatabaseScalarField): boolean {
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

    isRecordNotFound(error: unknown): boolean {
        return (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === DatabaseRecordNotFoundCode
        );
    }

    /** Maps a Prisma write conflict, malformed id, expired transaction, connection failure, or server-selection timeout to its exception; null for any other error. */
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

        if (DatabaseUnavailableCodes.has(error.code)) {
            return new DatabaseUnavailableException();
        }

        if (
            error.code === DatabaseRawQueryFailedCode &&
            DatabaseUnavailableMessages.some(message =>
                error.message.includes(message)
            )
        ) {
            return new DatabaseUnavailableException();
        }

        return null;
    }

    /** Maps the error a write raised: a record-not-found or write-conflict error returns `miss`, the answer the calling statement names; any other error returns its `toException` mapping or an `AppUnknownException`. Returns, never throws. */
    toWriteException(error: unknown, miss: AppBaseException): AppBaseException {
        const isRecordNotFound = this.isRecordNotFound(error);
        if (
            isRecordNotFound ||
            (error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === DatabaseWriteConflictCode)
        ) {
            return miss;
        }

        const mapped = this.toException(error);

        return mapped ?? new AppUnknownException(error);
    }

    /** Maps the error a write on a unique field raised: the first `collisions` entry whose field the unique error names returns its exception; a record-not-found or write-conflict error returns `miss`, the answer the calling statement names; any other error maps as `toWriteException`. Returns, never throws. */
    toUniqueException(
        error: unknown,
        collisions: IDatabaseUniqueCollision[],
        miss: AppBaseException
    ): AppBaseException {
        const collision = collisions.find(entry =>
            this.isUniqueCollision(error, entry.field)
        );
        if (collision) {
            return collision.exception;
        }

        return this.toWriteException(error, miss);
    }

    toPlainObject<T, N = Prisma.JsonObject>(data: T): N {
        return structuredClone(data as unknown) as N;
    }

    toPlainArray<T, N = Prisma.JsonObject>(data: T): N[] {
        return structuredClone(data) as N[];
    }
}
