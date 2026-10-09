import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    WorkspaceInviteDefaultAvailableOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';

/**
 * Workspace Invite List Request schema for paginated list query.
 * @public
 */
export const WorkspaceInviteListRequestSchema =
    PaginationCursorQuerySchema.extend({
        search: PaginationCursorQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${WorkspaceInviteDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: PaginationOrderBySchema(
            WorkspaceInviteDefaultAvailableOrderBy
        ),
        status: z.string().optional().meta({
            description: 'Filter by status, comma-delimited',
            example: '',
        }),
    });

/**
 * Inferred DTO for WorkspaceInviteListRequestSchema.
 * @public
 */
export type WorkspaceInviteListRequestDto = z.infer<
    typeof WorkspaceInviteListRequestSchema
>;
