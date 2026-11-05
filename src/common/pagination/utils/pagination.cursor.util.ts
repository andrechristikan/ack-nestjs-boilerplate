import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import {
    PaginationCursorDateKey,
    PaginationCursorEncryptionContext,
    PaginationCursorEncryptionPurpose,
    PaginationCursorFingerprintLength,
    PaginationCursorFormatRegex,
    PaginationFingerprintExcludedFields,
    PaginationMaxCursorLength,
} from '@common/pagination/constants/pagination.constant';
import type { PaginationCursorQueryDto } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorTooLongException } from '@common/pagination/exceptions/pagination.cursor-too-long.exception';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';
import type {
    IPaginationCursorJsonValue,
    IPaginationCursorKeyset,
    IPaginationCursorScalar,
    IPaginationCursorToken,
    IPaginationOrderBy,
} from '@common/pagination/interfaces/pagination.interface';

@Injectable()
export class PaginationCursorUtil {
    constructor(
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService
    ) {}

    private terms(
        orderBy: IPaginationOrderBy[]
    ): [string, EnumPaginationOrderDirectionType][] {
        return orderBy.flatMap(term => Object.entries(term));
    }

    private canonicalize(value: unknown): string {
        if (value instanceof Date) {
            return JSON.stringify(value.toISOString());
        }

        if (Array.isArray(value)) {
            return `[${value.map(item => this.canonicalize(item)).join(',')}]`;
        }

        if (value !== null && typeof value === 'object') {
            const source = value as Record<string, unknown>;
            const entries: string[] = [];
            for (const key of Object.keys(source).sort()) {
                const nested = this.canonicalize(source[key]);
                entries.push(`${JSON.stringify(key)}:${nested}`);
            }

            return `{${entries.join(',')}}`;
        }

        return JSON.stringify(value);
    }

    private isFilled(value: unknown): boolean {
        if ((value ?? null) === null) {
            return false;
        }

        if (typeof value === 'string') {
            return value !== '';
        }

        return !Array.isArray(value) || value.length > 0;
    }

    seal(token: IPaginationCursorToken): string {
        const secret = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;

        return this.helperEncryptionService.aes256Encrypt(
            JSON.stringify(token),
            secret,
            PaginationCursorEncryptionPurpose,
            PaginationCursorEncryptionContext
        );
    }

    open(cursor: string): IPaginationCursorToken | null {
        const secret = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;

        try {
            const plain = this.helperEncryptionService.aes256Decrypt(
                cursor,
                secret,
                PaginationCursorEncryptionPurpose,
                PaginationCursorEncryptionContext
            );

            return JSON.parse(plain) as IPaginationCursorToken;
        } catch {
            return null;
        }
    }

    encodeValues(
        item: object,
        orderBy: IPaginationOrderBy[]
    ): Record<string, IPaginationCursorJsonValue> | null {
        const row = item as Record<
            string,
            IPaginationCursorJsonValue | Date | null
        >;
        const values: Record<string, IPaginationCursorJsonValue> = {};
        const terms = this.terms(orderBy);
        for (const [field] of terms) {
            const value = row[field] ?? null;
            if (value === null) {
                return null;
            }

            values[field] =
                value instanceof Date
                    ? { [PaginationCursorDateKey]: value.toISOString() }
                    : value;
        }

        return values;
    }

    decodeValues(
        values: Record<string, IPaginationCursorJsonValue>,
        orderBy: IPaginationOrderBy[]
    ): Record<string, IPaginationCursorScalar> | null {
        const terms = this.terms(orderBy);
        const fields = terms.map(([field]) => field);
        if (
            Object.keys(values).length !== fields.length ||
            fields.some(field => !Object.hasOwn(values, field))
        ) {
            return null;
        }

        const decoded: Record<string, IPaginationCursorScalar> = {};
        for (const field of fields) {
            const value = values[field]!;
            if (typeof value === 'object') {
                decoded[field] = this.helperDateService.createFromIso(
                    value[PaginationCursorDateKey]
                );
            } else {
                decoded[field] = value;
            }
        }

        return decoded;
    }

    keyset(
        orderBy: IPaginationOrderBy[],
        values: Record<string, IPaginationCursorScalar>
    ): IPaginationCursorKeyset {
        const terms = this.terms(orderBy);

        return {
            OR: terms.flatMap(([field, direction], index) => {
                const equal = terms
                    .slice(0, index)
                    .map(([prior]) => [prior, values[prior]]);
                const value = values[field];
                const isAscending =
                    direction === EnumPaginationOrderDirectionType.asc;

                if (typeof value === 'boolean') {
                    return value === isAscending
                        ? []
                        : [Object.fromEntries([...equal, [field, !value]])];
                }

                const operator = isAscending ? 'gt' : 'lt';

                return [
                    Object.fromEntries([
                        ...equal,
                        [field, { [operator]: value }],
                    ]),
                ];
            }),
        };
    }

    fingerprint(
        scope: string,
        dto: PaginationCursorQueryDto,
        orderBy: IPaginationOrderBy[]
    ): string {
        const filters: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(dto)) {
            const trimmed = typeof value === 'string' ? value.trim() : value;
            const isFilled = this.isFilled(trimmed);
            if (
                isFilled &&
                !PaginationFingerprintExcludedFields.includes(key)
            ) {
                filters[key] = trimmed;
            }
        }

        const canonical = this.canonicalize({ scope, filters, orderBy });
        const hash = this.helperHashService.sha256Hash(canonical);

        return hash.slice(0, PaginationCursorFingerprintLength);
    }

    checkFormat(
        cursor: string
    ):
        | PaginationCursorTooLongException
        | PaginationInvalidCursorFormatException
        | null {
        if (cursor.length > PaginationMaxCursorLength) {
            return new PaginationCursorTooLongException(
                PaginationMaxCursorLength
            );
        }

        if (!PaginationCursorFormatRegex.test(cursor)) {
            return new PaginationInvalidCursorFormatException();
        }

        return null;
    }
}
