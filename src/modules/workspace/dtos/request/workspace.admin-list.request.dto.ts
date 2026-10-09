import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import {
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';

/**
 * Offset list query for admin workspace listing.
 * @public
 */
export const WorkspaceAdminListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        search: PaginationOffsetQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${WorkspaceDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: PaginationOrderBySchema(WorkspaceDefaultAvailableOrderBy),
        isPublic: RequestBooleanStringSchema.optional().meta({
            description: 'Filter by public visibility',
            example: 'true',
        }),
    });

/**
 * Inferred DTO for WorkspaceAdminListRequestSchema.
 * @public
 */
export type WorkspaceAdminListRequestDto = z.infer<
    typeof WorkspaceAdminListRequestSchema
>;
