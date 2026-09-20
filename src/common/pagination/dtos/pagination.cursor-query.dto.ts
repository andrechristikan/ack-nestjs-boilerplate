import { z } from 'zod';
import {
    PaginationDefaultMaxPerPage,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';

/**
 * Cursor list query kit: `cursor` and `perPage` only. Modules `.extend` `search` / `orderBy`
 * when their allow-lists are non-empty, plus any filter fields.
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
});

/**
 * Inferred DTO for PaginationCursorQuerySchema.
 * @public
 */
export type PaginationCursorQueryDto = z.infer<
    typeof PaginationCursorQuerySchema
>;
