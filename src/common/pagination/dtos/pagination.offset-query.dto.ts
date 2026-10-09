import { z } from 'zod';
import {
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultMaxSearchLength,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';

/**
 * Offset list query: page, perPage, and search; a module list schema extends it and declares its own `orderBy` with `PaginationOrderBySchema`.
 * @public
 */
export const PaginationOffsetQuerySchema = z.strictObject({
    page: z.coerce
        .number()
        .int()
        .optional()
        .meta({
            description: `page number, max ${PaginationDefaultMaxPage}`,
            example: 1,
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
 * Inferred DTO for PaginationOffsetQuerySchema.
 * @public
 */
export type PaginationOffsetQueryDto = z.infer<
    typeof PaginationOffsetQuerySchema
>;
