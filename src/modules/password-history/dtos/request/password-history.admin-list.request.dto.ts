import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { PasswordHistoryDefaultAvailableOrderBy } from '@modules/password-history/constants/password-history.list.constant';

/**
 * Password History Admin List Request schema for paginated list query.
 * @public
 */
export const PasswordHistoryAdminListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(
            PasswordHistoryDefaultAvailableOrderBy
        ),
    });

/**
 * Inferred DTO for PasswordHistoryAdminListRequestSchema.
 * @public
 */
export type PasswordHistoryAdminListRequestDto = z.infer<
    typeof PasswordHistoryAdminListRequestSchema
>;
