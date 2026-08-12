import {
    PaginationCursorFingerprintLength,
    PaginationDefaultCursorField,
    PaginationDefaultOrderBy,
} from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import {
    IPaginationCursorArgs,
    IPaginationCursorReturn,
    IPaginationCursorValue,
    IPaginationOffsetArgs,
    IPaginationOffsetReturn,
    IPaginationOrderBy,
    IPaginationRepository,
} from '@common/pagination/interfaces/pagination.interface';
import { IPaginationService } from '@common/pagination/interfaces/pagination.service.interface';
import { HelperService } from '@common/helper/services/helper.service';
import { Injectable } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';
import { PaginationInvalidCursorPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-cursor-pagination-params.exception';
import { PaginationInvalidCursorDataException } from '@common/pagination/exceptions/pagination.invalid-cursor-data.exception';
import { PaginationFailedToEncodeCursorException } from '@common/pagination/exceptions/pagination.failed-to-encode-cursor.exception';
import { PaginationFailedToDecodeCursorException } from '@common/pagination/exceptions/pagination.failed-to-decode-cursor.exception';

@Injectable()
export class PaginationService implements IPaginationService {
    constructor(private readonly helperService: HelperService) {}

    private canonicalize(value: unknown): unknown {
        if (value instanceof Date) {
            return value.toISOString();
        }

        if (Array.isArray(value)) {
            return value.map(item => this.canonicalize(item));
        }

        if (value !== null && typeof value === 'object') {
            const source = value as Record<string, unknown>;

            return Object.keys(source)
                .sort()
                .reduce<Record<string, unknown>>((acc, key) => {
                    acc[key] = this.canonicalize(source[key]);

                    return acc;
                }, {});
        }

        return value;
    }

    private fingerprint(where: unknown, orderBy: IPaginationOrderBy[]): string {
        return this.helperService
            .sha256Hash(JSON.stringify(this.canonicalize({ where, orderBy })))
            .slice(0, PaginationCursorFingerprintLength);
    }

    private encodeCursor(data: IPaginationCursorValue): string {
        if (!data || data.cursor === undefined || data.cursor === null) {
            throw new PaginationInvalidCursorDataException();
        }

        try {
            return Buffer.from(JSON.stringify(data))
                .toString('base64')
                .replaceAll(/\+/g, '-')
                .replaceAll(/\//g, '_')
                .replaceAll(/=/g, '');
        } catch {
            throw new PaginationFailedToEncodeCursorException();
        }
    }

    private decodeCursor(cursor: string): IPaginationCursorValue {
        if (!cursor || typeof cursor !== 'string') {
            throw new PaginationInvalidCursorFormatException();
        }

        try {
            const padded = cursor + '='.repeat((4 - (cursor.length % 4)) % 4);
            const base64 = padded.replaceAll(/-/g, '+').replaceAll(/_/g, '/');
            const decoded = JSON.parse(
                Buffer.from(base64, 'base64').toString()
            );

            if (!decoded.cursor || !decoded.fingerprint) {
                throw new PaginationInvalidCursorDataException();
            }

            return decoded as IPaginationCursorValue;
        } catch (error) {
            if (error instanceof AppBaseException) {
                throw error;
            }

            throw new PaginationFailedToDecodeCursorException();
        }
    }

    private resolveOrderBy(
        orderBy?: IPaginationOrderBy[]
    ): IPaginationOrderBy[] {
        if (!orderBy || orderBy.length === 0) {
            return [...PaginationDefaultOrderBy];
        }

        return orderBy;
    }

    private resolveCursorOrderBy(
        orderBy: IPaginationOrderBy[] | undefined,
        cursorField: string
    ): IPaginationOrderBy[] {
        const resolved = this.resolveOrderBy(orderBy);

        if (resolved.some(term => cursorField in term)) {
            return resolved;
        }

        const lastTerm = resolved[resolved.length - 1];
        const direction =
            Object.values(lastTerm)[0] ?? EnumPaginationOrderDirectionType.desc;

        return [...resolved, { [cursorField]: direction }];
    }

    async offset<TReturn, TArgsWhere = unknown>(
        repository: IPaginationRepository,
        args: IPaginationOffsetArgs<TArgsWhere>
    ): Promise<IPaginationOffsetReturn<TReturn>> {
        const { limit, skip, where, include } = args;
        const orderBy = this.resolveOrderBy(args.orderBy);

        const currentPage = Math.floor(skip / limit) + 1;

        const [count, items] = await Promise.all([
            repository.count({
                where,
            }),
            repository.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include,
            }),
        ]);

        const totalPage = Math.ceil(count / limit);
        const hasNext = currentPage < totalPage;
        const hasPrevious = currentPage > 1;
        const nextPage = hasNext ? currentPage + 1 : undefined;
        const previousPage = hasPrevious ? currentPage - 1 : undefined;

        return {
            type: EnumPaginationType.offset,
            count,
            perPage: limit,
            page: currentPage,
            totalPage,
            hasNext,
            hasPrevious,
            data: items as TReturn[],
            ...(nextPage && { nextPage }),
            ...(previousPage && { previousPage }),
        };
    }

    async cursor<TReturn, TArgsWhere = unknown>(
        repository: IPaginationRepository,
        args: IPaginationCursorArgs<TArgsWhere>
    ): Promise<IPaginationCursorReturn<TReturn>> {
        const {
            limit,
            where,
            include,
            cursor,
            cursorField = PaginationDefaultCursorField,
            includeCount,
        } = args;
        const orderBy = this.resolveCursorOrderBy(args.orderBy, cursorField);
        const fingerprint = this.fingerprint(where, orderBy);

        let decodedCursor: IPaginationCursorValue | undefined;

        if (cursor) {
            try {
                decodedCursor = this.decodeCursor(cursor);
            } catch {
                throw new PaginationInvalidCursorFormatException();
            }

            if (decodedCursor.fingerprint !== fingerprint) {
                throw new PaginationInvalidCursorPaginationParamsException();
            }
        }

        const take = limit + 1;
        const queries: Promise<unknown>[] = [
            repository.findMany({
                where,
                take,
                cursor: decodedCursor
                    ? { [cursorField]: decodedCursor.cursor }
                    : undefined,
                skip: cursor ? 1 : 0,
                orderBy,
                include,
            }),
        ];

        if (includeCount) {
            queries.push(repository.count({ where }));
        }

        const results = await Promise.all(queries);
        const items = results[0] as TReturn[];
        const count = includeCount ? (results[1] as number) : undefined;

        const hasNext = items.length > limit;
        const data = hasNext ? items.slice(0, limit) : items;

        let nextCursor: string | undefined;
        if (hasNext) {
            const nextItem = data[data.length - 1] as Record<string, unknown>;
            nextCursor = this.encodeCursor({
                cursor: nextItem[cursorField] as string,
                fingerprint,
            });
        }

        return {
            type: EnumPaginationType.cursor,
            cursor: nextCursor,
            perPage: limit,
            hasNext,
            data: data as TReturn[],
            ...(includeCount && { count }),
        };
    }
}
