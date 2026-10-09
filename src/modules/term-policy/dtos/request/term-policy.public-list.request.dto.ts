import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { TermPolicyDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';

/**
 * Term Policy Public List Request schema for paginated list query.
 * @public
 */
export const TermPolicyPublicListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(TermPolicyDefaultAvailableOrderBy),
        type: z.string().optional().meta({
            description: 'Filter by type',
            example: '',
        }),
    });

/**
 * Inferred DTO for TermPolicyPublicListRequestSchema.
 * @public
 */
export type TermPolicyPublicListRequestDto = z.infer<
    typeof TermPolicyPublicListRequestSchema
>;
