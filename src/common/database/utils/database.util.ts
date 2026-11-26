import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@generated/prisma-client/client';
import { ObjectId } from 'bson';
import {
    DatabaseUniqueConstraintCode,
    DatabaseUrlCensoredValue,
} from '@common/database/constants/database.constant';
import type { IDatabaseScalarField } from '@common/database/interfaces/database.interface';

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

    toPlainObject<T, N = Prisma.JsonObject>(data: T): N {
        return structuredClone(data as unknown) as N;
    }

    toPlainArray<T, N = Prisma.JsonObject>(data: T): N[] {
        return structuredClone(data) as N[];
    }
}
