import {
    PAGINATION_DEFAULT_CURSOR_FIELD,
    PAGINATION_DEFAULT_MAX_PAGE,
    PAGINATION_DEFAULT_MAX_PER_PAGE,
} from '@common/pagination/constants/pagination.constant';
import { ENUM_PAGINATION_TYPE } from '@common/pagination/enums/pagination.enum';
import {
    IPaginationCursorReturn,
    IPaginationCursorValue,
    IPaginationOffsetReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
    IPaginationRepository,
} from '@common/pagination/interfaces/pagination.interface';
import { IPaginationService } from '@common/pagination/interfaces/pagination.service.interface';
import { Injectable } from '@nestjs/common';

/**
 * Service for handling pagination operations with offset and cursor-based pagination
 */
@Injectable()
export class PaginationService implements IPaginationService {
    /**
     * Performs offset-based pagination
     * @param {IPaginationRepository} repository - Repository instance that implements IPaginationRepository
     * @param {IPaginationOffsetParams} args - Pagination parameters including limit, skip, orderBy, search, and select
     * @returns {Promise<IPaginationOffsetReturn<TReturn>>} Promise that resolves to paginated result with items and pagination metadata
     */
    async offset<TReturn>(
        repository: IPaginationRepository,
        args: IPaginationQueryOffsetParams
    ): Promise<IPaginationOffsetReturn<TReturn>> {
        const { limit, skip, orderBy, where, select, includes } = args;
        const currentPage = Math.floor(skip / limit) + 1;

        if (limit <= 0) {
            throw new Error('Limit must be greater than 0');
        }

        if (skip < 0) {
            throw new Error('Skip must be greater than or equal to 0');
        }

        if (limit > PAGINATION_DEFAULT_MAX_PER_PAGE) {
            throw new Error(
                `Limit must be less than or equal to ${PAGINATION_DEFAULT_MAX_PER_PAGE}`
            );
        }

        if (currentPage > PAGINATION_DEFAULT_MAX_PAGE) {
            throw new Error(
                `Page must be less than or equal to ${PAGINATION_DEFAULT_MAX_PAGE}`
            );
        }

        const [count, items] = await Promise.all([
            repository.count({
                where,
            }),
            repository.findMany({
                where,
                skip,
                take: limit,
                select,
                orderBy,
                includes,
            }),
        ]);

        const totalPage = Math.ceil(count / limit);
        const hasNext = currentPage < totalPage;
        const hasPrevious = currentPage > 1;
        const nextPage = hasNext ? currentPage + 1 : undefined;
        const previousPage = hasPrevious ? currentPage - 1 : undefined;

        return {
            type: ENUM_PAGINATION_TYPE.OFFSET,
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

    /**
     * Performs cursor-based pagination
     * @param {IPaginationRepository} repository - Repository instance that implements IPaginationRepository
     * @param {IPaginationCursorParams} args - Cursor pagination parameters including limit, cursor, orderBy, search, select, cursorField, and includeCount
     * @returns {Promise<IPaginationCursorReturn<TReturn>>} Promise that resolves to cursor paginated result with items and cursor metadata
     */
    async cursor<TReturn>(
        repository: IPaginationRepository,
        args: IPaginationQueryCursorParams
    ): Promise<IPaginationCursorReturn<TReturn>> {
        const {
            limit,
            orderBy,
            where,
            select,
            cursorField = PAGINATION_DEFAULT_CURSOR_FIELD,
            includeCount,
        } = args;
        let { cursor } = args;

        if (limit <= 0) {
            throw new Error('Limit must be greater than 0');
        }

        if (limit > PAGINATION_DEFAULT_MAX_PER_PAGE) {
            throw new Error(
                `Limit must be less than or equal to ${PAGINATION_DEFAULT_MAX_PER_PAGE}`
            );
        }

        const decodedCursor = cursor ? this.decodeCursor(cursor) : undefined;
        if (decodedCursor) {
            if (
                JSON.stringify(decodedCursor.orderBy) !==
                    JSON.stringify(orderBy) ||
                JSON.stringify(decodedCursor.where) !== JSON.stringify(where)
            ) {
                cursor = undefined;
            }
        }

        const take = limit + 1;
        const queries: Promise<unknown>[] = [
            repository.findMany({
                where,
                take,
                cursor:
                    cursor && decodedCursor?.cursor
                        ? { [cursorField]: decodedCursor.cursor }
                        : undefined,
                skip: cursor ? 1 : 0,
                select,
                orderBy,
            }),
        ];

        if (includeCount) {
            queries.push(repository.count({ where }));
        }

        const [items, count] = (await Promise.all(queries)) as [
            TReturn[],
            number,
        ];
        const hasNext = items.length > limit;
        const data = hasNext ? items.slice(0, limit) : items;

        let nextCursor: string | undefined;
        if (hasNext) {
            const nextItem = data[data.length - 1];
            nextCursor = this.encodeCursor({
                cursor: nextItem[cursorField],
                orderBy,
                where,
            });
        }

        return {
            type: ENUM_PAGINATION_TYPE.CURSOR,
            cursor: nextCursor,
            perPage: limit,
            hasNext,
            data: items as TReturn[],
            ...(includeCount && { count }),
        };
    }

    private encodeCursor(data: IPaginationCursorValue): string {
        if (!data || data.cursor === undefined || data.cursor === null) {
            throw new Error('Invalid cursor data');
        }

        try {
            return Buffer.from(JSON.stringify(data))
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
        } catch {
            throw new Error('Failed to encode cursor');
        }
    }

    private decodeCursor(cursor: string): IPaginationCursorValue {
        if (!cursor || typeof cursor !== 'string') {
            throw new Error('Invalid cursor format');
        }

        try {
            // Add padding back
            const padded = cursor + '='.repeat((4 - (cursor.length % 4)) % 4);
            const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(Buffer.from(base64, 'base64').toString());
        } catch (_) {
            throw new Error(`Failed to decode cursor`);
        }
    }
}
