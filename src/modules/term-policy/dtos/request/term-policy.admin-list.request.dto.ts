import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { TermPolicyDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';

/**
 * Term Policy Admin List Request schema for paginated list query.
 * @public
 */
export const TermPolicyAdminListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(TermPolicyDefaultAvailableOrderBy),
        type: z.string().optional().meta({
            description: 'Filter by type',
            example: '',
        }),
        status: z.string().optional().meta({
            description: 'Filter by status',
            example: '',
        }),
    });

/**
 * Inferred DTO for TermPolicyAdminListRequestSchema.
 * @public
 */
export type TermPolicyAdminListRequestDto = z.infer<
    typeof TermPolicyAdminListRequestSchema
>;
