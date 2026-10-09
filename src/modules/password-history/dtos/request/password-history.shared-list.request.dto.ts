import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { PasswordHistoryCursorAvailableOrderBy } from '@modules/password-history/constants/password-history.list.constant';

/**
 * Password History Shared List Request schema for paginated list query.
 * @public
 */
export const PasswordHistorySharedListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(PasswordHistoryCursorAvailableOrderBy),
    });

/**
 * Inferred DTO for PasswordHistorySharedListRequestSchema.
 * @public
 */
export type PasswordHistorySharedListRequestDto = z.infer<
    typeof PasswordHistorySharedListRequestSchema
>;
