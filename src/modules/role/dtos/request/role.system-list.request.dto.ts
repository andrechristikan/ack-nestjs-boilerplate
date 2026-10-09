import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
} from '@modules/role/constants/role.list.constant';

/**
 * Role System List Request schema for paginated list query.
 * @public
 */
export const RoleSystemListRequestSchema = PaginationCursorQuerySchema.extend({
    search: PaginationCursorQuerySchema.shape.search.meta({
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
 * Inferred DTO for RoleSystemListRequestSchema.
 * @public
 */
export type RoleSystemListRequestDto = z.infer<
    typeof RoleSystemListRequestSchema
>;
