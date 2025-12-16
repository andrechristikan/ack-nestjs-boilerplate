import {
    PaginationDefaultCursorField,
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
} from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
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
 * Service for handling pagination operations with offset and cursor-based pagination.
 *
 * This service provides two pagination strategies:
 * - **Offset-based pagination**: Traditional page number and limit approach
 * - **Cursor-based pagination**: Uses cursor tokens for efficient traversal of large datasets
 */
@Injectable()
export class PaginationService implements IPaginationService {
    /**
     * Performs offset-based pagination using page number and limit approach.
     *
     * **Default Values:**
     * - orderBy: `{ createdAt: 'DESC' }` - Results are sorted by creation date in descending order
     *
     * @template TReturn - The type of items being paginated
     * @param {IPaginationRepository} repository - Repository instance that implements IPaginationRepository
     * @param {IPaginationQueryOffsetParams} args - Pagination parameters.
     * @returns {Promise<IPaginationOffsetReturn<TReturn>>} Promise that resolves to paginated result with items, metadata (count, page, totalPage, hasNext, hasPrevious, nextPage, previousPage)
     * @throws {Error} If validation constraints are violated
     */
    async offset<TReturn>(
        repository: IPaginationRepository,
        args: IPaginationQueryOffsetParams
    ): Promise<IPaginationOffsetReturn<TReturn>> {
        const {
            limit,
            skip,
            orderBy = {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
            where,
            select,
            include,
        } = args;
        const currentPage = Math.floor(skip / limit) + 1;

        if (limit <= 0) {
            throw new Error('Limit must be greater than 0');
        }

        if (skip < 0) {
            throw new Error('Skip must be greater than or equal to 0');
        }

        if (limit > PaginationDefaultMaxPerPage) {
            throw new Error(
                `Limit must be less than or equal to ${PaginationDefaultMaxPerPage}`
            );
        }

        if (currentPage > PaginationDefaultMaxPage) {
            throw new Error(
                `Page must be less than or equal to ${PaginationDefaultMaxPage}`
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

    /**
     * Performs cursor-based pagination using cursor tokens for efficient traversal.
     *
     * **Default Values:**
     * - orderBy: `{ createdAt: 'DESC' }` - Results are sorted by creation date in descending order
     * - cursorField: `PaginationDefaultCursorField` - Field used for cursor positioning
     *
     * **Cursor Behavior:**
     * - The cursor is encoded using URL-safe base64 encoding
     * - If cursor is invalid or conditions changed, pagination resets to first page
     * - Fetches `limit + 1` items to determine if there are more results
     *
     * @template TReturn - The type of items being paginated
     * @param {IPaginationRepository} repository - Repository instance that implements IPaginationRepository
     * @param {IPaginationQueryCursorParams} args - Cursor pagination parameters
     * @returns {Promise<IPaginationCursorReturn<TReturn>>} Promise that resolves to cursor paginated result with items, cursor token, hasNext flag, and optional count
     * @throws {Error} If validation constraints are violated
     */
    async cursor<TReturn>(
        repository: IPaginationRepository,
        args: IPaginationQueryCursorParams
    ): Promise<IPaginationCursorReturn<TReturn>> {
        const {
            limit,
            orderBy = {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
            where,
            select,
            cursorField = PaginationDefaultCursorField,
            includeCount,
        } = args;

        let { cursor } = args;

        if (limit <= 0) {
            throw new Error('Limit must be greater than 0');
        }

        if (limit > PaginationDefaultMaxPerPage) {
            throw new Error(
                `Limit must be less than or equal to ${PaginationDefaultMaxPerPage}`
            );
        }

        const decodedCursor = cursor ? this.decodeCursor(cursor) : undefined;
        if (decodedCursor) {
            if (
                JSON.stringify(decodedCursor.orderBy).toLowerCase() !==
                    JSON.stringify(orderBy).toLowerCase() ||
                JSON.stringify(decodedCursor.where).toLowerCase() !==
                    JSON.stringify(where).toLowerCase()
            ) {
                // Invalidate the cursor if orderBy or where conditions do not match, will reset to first page
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
            type: EnumPaginationType.cursor,
            cursor: nextCursor,
            perPage: limit,
            hasNext,
            data: data as TReturn[],
            ...(includeCount && { count }),
        };
    }

    private encodeCursor(data: IPaginationCursorValue): string {
        if (!data || data.cursor === undefined || data.cursor === null) {
            throw new Error('Invalid cursor data');
        }

        try {
            // url-safe base64 encoding
            return Buffer.from(JSON.stringify(data))
                .toString('base64')
                .replaceAll(/\+/g, '-')
                .replaceAll(/\//g, '_')
                .replaceAll(/=/g, '');
        } catch {
            throw new Error('Failed to encode cursor');
        }
    }

    private decodeCursor(cursor: string): IPaginationCursorValue {
        if (!cursor || typeof cursor !== 'string') {
            throw new Error('Invalid cursor format');
        }

        try {
            // url-safe base64 encoding
            const padded = cursor + '='.repeat((4 - (cursor.length % 4)) % 4);
            const base64 = padded.replaceAll(/-/g, '+').replaceAll(/_/g, '/');
            return JSON.parse(Buffer.from(base64, 'base64').toString());
        } catch {
            throw new Error(`Failed to decode cursor`);
        }
    }
}
