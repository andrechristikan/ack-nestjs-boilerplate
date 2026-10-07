import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';

/**
 * Offset list query the pagination util reads: the offset kit plus `search` and `orderBy`.
 * Every module list schema's inferred type is assignable to it.
 * @public
 */
export const PaginationOffsetListQuerySchema =
    PaginationOffsetQuerySchema.extend({
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
 * Inferred DTO for PaginationOffsetListQuerySchema.
 * @public
 */
export type PaginationOffsetListQueryDto = z.infer<
    typeof PaginationOffsetListQuerySchema
>;
