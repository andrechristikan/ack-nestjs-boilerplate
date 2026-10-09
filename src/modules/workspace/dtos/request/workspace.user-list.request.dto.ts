import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    WorkspaceCursorAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';

/**
 * Workspace User List Request schema for paginated list query.
 * @public
 */
export const WorkspaceUserListRequestSchema =
    PaginationCursorQuerySchema.extend({
        search: PaginationCursorQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${WorkspaceDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: PaginationOrderBySchema(WorkspaceCursorAvailableOrderBy),
    });

/**
 * Inferred DTO for WorkspaceUserListRequestSchema.
 * @public
 */
export type WorkspaceUserListRequestDto = z.infer<
    typeof WorkspaceUserListRequestSchema
>;
