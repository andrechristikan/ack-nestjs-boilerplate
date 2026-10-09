import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { TermPolicyAcceptanceDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';

/**
 * Term Policy Accepted List Request schema for paginated list query.
 * @public
 */
export const TermPolicyAcceptedListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(
            TermPolicyAcceptanceDefaultAvailableOrderBy
        ),
    });

/**
 * Inferred DTO for TermPolicyAcceptedListRequestSchema.
 * @public
 */
export type TermPolicyAcceptedListRequestDto = z.infer<
    typeof TermPolicyAcceptedListRequestSchema
>;
