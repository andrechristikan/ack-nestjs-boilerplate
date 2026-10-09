import { z } from 'zod';
import {
    PaginationDefaultMaxPerPage,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';

/**
 * Cursor list query: cursor, perPage, search, and orderBy; a module list schema extends it and overrides the search and orderBy meta.
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
    search: z.string().optional().meta({
        description: 'Search query, case-insensitive, partial match',
        example: '',
    }),
    orderBy: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .meta({
            description:
                'Order by field in `field:direction` format (e.g. `createdAt:desc`). Repeat the parameter to sort by multiple fields.',
            example: 'createdAt:desc',
        }),
});

/**
 * Inferred DTO for PaginationCursorQuerySchema.
 * @public
 */
export type PaginationCursorQueryDto = z.infer<
    typeof PaginationCursorQuerySchema
>;
