import { z } from 'zod';
import {
    PaginationDefaultMaxPerPage,
    PaginationDefaultMaxSearchLength,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';

/**
 * Cursor list query: cursor, perPage, and search; a module list schema extends it and declares its own `orderBy` with `PaginationOrderBySchema`.
 * @public
 */
export const PaginationCursorQuerySchema = z.strictObject({
    cursor: z.string().optional().meta({
        description: 'The pagination cursor returned from the previous request',
        example: 'eyJpZCI6IjE2In0',
    }),
    perPage: z.coerce
        .number()
        .int()
        .optional()
        .meta({
            description: `Data per page, max ${PaginationDefaultMaxPerPage}`,
            example: PaginationDefaultPerPage,
        }),
    search: z
        .string()
        .trim()
        .max(PaginationDefaultMaxSearchLength)
        .optional()
        .meta({
            description: `Search query, case-insensitive, partial match, max ${PaginationDefaultMaxSearchLength} characters`,
            example: '',
        }),
});

/**
 * Inferred DTO for PaginationCursorQuerySchema.
 * @public
 */
export type PaginationCursorQueryDto = z.infer<
    typeof PaginationCursorQuerySchema
>;
