import { z } from 'zod';
import {
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';

/**
 * Offset list query: page, perPage, search, and orderBy; a module list schema extends it and overrides the search and orderBy meta.
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
 * Inferred DTO for PaginationOffsetQuerySchema.
 * @public
 */
export type PaginationOffsetQueryDto = z.infer<
    typeof PaginationOffsetQuerySchema
>;
