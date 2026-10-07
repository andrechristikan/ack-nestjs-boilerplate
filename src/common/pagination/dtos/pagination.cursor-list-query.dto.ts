import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';

/**
 * Cursor list query the pagination util reads: the cursor kit plus `search` and `orderBy`.
 * Every module list schema's inferred type is assignable to it.
 * @public
 */
export const PaginationCursorListQuerySchema =
    PaginationCursorQuerySchema.extend({
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
 * Inferred DTO for PaginationCursorListQuerySchema.
 * @public
 */
export type PaginationCursorListQueryDto = z.infer<
    typeof PaginationCursorListQuerySchema
>;
