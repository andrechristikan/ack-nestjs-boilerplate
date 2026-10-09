import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
} from '@modules/role/constants/role.list.constant';

/**
 * Role Admin List Request schema for paginated list query.
 * @public
 */
export const RoleAdminListRequestSchema = PaginationOffsetQuerySchema.extend({
    search: PaginationOffsetQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${RoleDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: PaginationOrderBySchema(RoleDefaultAvailableOrderBy),
    type: z.string().optional().meta({
        description: 'Filter by type, comma-delimited',
        example: '',
    }),
});

/**
 * Inferred DTO for RoleAdminListRequestSchema.
 * @public
 */
export type RoleAdminListRequestDto = z.infer<
    typeof RoleAdminListRequestSchema
>;
