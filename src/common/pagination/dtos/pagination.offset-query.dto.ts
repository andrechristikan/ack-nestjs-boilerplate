import { z } from 'zod';
import {
    PaginationDefaultMaxPage,
    PaginationDefaultMaxPerPage,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';

/**
 * Offset list query kit: `page` and `perPage` only. Modules `.extend` `search` / `orderBy`
 * when their allow-lists are non-empty, plus any filter fields.
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
});

/**
 * Inferred DTO for PaginationOffsetQuerySchema.
 * @public
 */
export type PaginationOffsetQueryDto = z.infer<
    typeof PaginationOffsetQuerySchema
>;
