import { PaginationDefaultCursorField } from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import {
    IPaginationCursorReturn,
    IPaginationCursorValue,
    IPaginationOffsetReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
    IPaginationRepository,
} from '@common/pagination/interfaces/pagination.interface';
import { IPaginationService } from '@common/pagination/interfaces/pagination.service.interface';
import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Service for handling pagination operations with offset and cursor-based pagination.
 *
 * This service provides two pagination strategies:
 * - **Offset-based pagination**: Traditional page number and limit approach
 * - **Cursor-based pagination**: Uses cursor tokens for efficient traversal of large datasets
 *
 * **Validation Note:**
 * Input parameters are assumed to be valid as they are already validated by the respective pipes
 * (PaginationOffsetPipe, PaginationCursorPipe) before reaching this service.
 */
@Injectable()
export class PaginationService implements IPaginationService {
    /**
     * Performs offset-based pagination using page number and limit approach.
     *
     * **Default Values:**
     * - orderBy: `{ createdAt: 'desc' }` - Results are sorted by creation date in descending order
     *
     * **Assumptions:**
     * Input parameters are assumed to be valid as they are validated by PaginationOffsetPipe before reaching this service.
     *
     * @template TReturn - The type of items being paginated
     * @param {IPaginationRepository} repository - Repository instance that implements IPaginationRepository
     * @param {IPaginationQueryOffsetParams} args - Pagination parameters (validated by pipe).
     * @returns {Promise<IPaginationOffsetReturn<TReturn>>} Promise that resolves to paginated result with items, metadata (count, page, totalPage, hasNext, hasPrevious, nextPage, previousPage)
     * @throws {BadRequestException} If data integrity issues are detected (unexpected condition)
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
     * - orderBy: `{ createdAt: 'desc' }` - Results are sorted by creation date in descending order
     * - cursorField: `PaginationDefaultCursorField` - Field used for cursor positioning
     *
     * **Cursor Behavior:**
     * - The cursor is encoded using URL-safe base64 encoding
     * - If cursor is invalid or conditions changed, returns error (see Point 8)
     * - Fetches `limit + 1` items to determine if there are more results
     *
     * **Assumptions:**
     * Input parameters are assumed to be valid as they are validated by PaginationCursorPipe before reaching this service.
     *
     * @template TReturn - The type of items being paginated
     * @param {IPaginationRepository} repository - Repository instance that implements IPaginationRepository
     * @param {IPaginationQueryCursorParams} args - Cursor pagination parameters (validated by pipe)
     * @returns {Promise<IPaginationCursorReturn<TReturn>>} Promise that resolves to cursor paginated result with items, cursor token, hasNext flag, and optional count
     * @throws {BadRequestException} If pagination conditions have changed
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
            include,
            cursorField = PaginationDefaultCursorField,
            includeCount,
        } = args;

        const { cursor } = args;

        // If cursor provided, decode and check if conditions match
        let decodedCursor: IPaginationCursorValue | undefined;

        if (cursor) {
            try {
                decodedCursor = this.decodeCursor(cursor);
            } catch {
                throw new BadRequestException({
                    statusCode:
                        EnumPaginationStatusCodeError.invalidCursorFormat,
                    message: 'pagination.error.invalidCursorFormat',
                });
            }

            if (decodedCursor) {
                const orderByChanged = !this.isDeepEqual(
                    decodedCursor.orderBy,
                    orderBy
                );
                const whereChanged = !this.isDeepEqual(
                    decodedCursor.where,
                    where
                );

                if (orderByChanged || whereChanged) {
                    throw new BadRequestException({
                        statusCode:
                            EnumPaginationStatusCodeError.invalidCursorPaginationParams,
                        message:
                            'pagination.error.invalidCursorPaginationParams',
                    });
                }
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

    /**
     * Encodes cursor data to URL-safe base64 format.
     * Same encoding method as used in pipes.
     *
     * @param {IPaginationCursorValue} data - Cursor data containing cursor value, orderBy, and where conditions
     * @returns {string} URL-safe base64 encoded cursor (without padding)
     * @throws {BadRequestException} If cursor data is invalid
     */
    private encodeCursor(data: IPaginationCursorValue): string {
        if (!data || data.cursor === undefined || data.cursor === null) {
            throw new BadRequestException({
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
                message: 'pagination.error.invalidCursorData',
            });
        }

        try {
            // Standard base64 → URL-safe base64 (+ becomes -, / becomes _)
            // Padding (=) is removed for URL safety
            return Buffer.from(JSON.stringify(data))
                .toString('base64')
                .replaceAll(/\+/g, '-')
                .replaceAll(/\//g, '_')
                .replaceAll(/=/g, '');
        } catch {
            throw new BadRequestException({
                statusCode: EnumPaginationStatusCodeError.failedToEncodeCursor,
                message: 'pagination.error.failedToEncodeCursor',
            });
        }
    }

    /**
     * Decodes URL-safe base64 cursor data.
     * Same decoding method as encoder, adds back padding before conversion.
     *
     * @param {string} cursor - URL-safe base64 encoded cursor (without padding)
     * @returns {IPaginationCursorValue} Decoded cursor data
     * @throws {BadRequestException} If cursor cannot be decoded
     */
    private decodeCursor(cursor: string): IPaginationCursorValue {
        if (!cursor || typeof cursor !== 'string') {
            throw new BadRequestException({
                statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
                message: 'pagination.error.invalidCursorFormat',
            });
        }

        try {
            // Add padding back based on length
            const padded = cursor + '='.repeat((4 - (cursor.length % 4)) % 4);
            // Convert URL-safe characters back to standard base64 (- becomes +, _ becomes /)
            const base64 = padded.replaceAll(/-/g, '+').replaceAll(/_/g, '/');
            const decoded = JSON.parse(
                Buffer.from(base64, 'base64').toString()
            );

            // Validate decoded cursor has required fields
            if (!decoded.cursor || !decoded.orderBy) {
                throw new BadRequestException({
                    statusCode: EnumPaginationStatusCodeError.invalidCursorData,
                    message: 'pagination.error.invalidCursorData',
                });
            }

            return decoded as IPaginationCursorValue;
        } catch (error) {
            // Only re-throw if already BadRequestException
            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new BadRequestException({
                statusCode: EnumPaginationStatusCodeError.failedToDecodeCursor,
                message: 'pagination.error.failedToDecodeCursor',
            });
        }
    }

    /**
     * Deep equality comparison for objects.
     * Used to check if cursor conditions (orderBy, where) match current request.
     *
     * @param {unknown} obj1 - First object to compare
     * @param {unknown} obj2 - Second object to compare
     * @returns {boolean} True if objects are deeply equal
     */
    private isDeepEqual(obj1: unknown, obj2: unknown): boolean {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }
}
