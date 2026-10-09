import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { WorkspaceJoinRequestDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';

/**
 * Workspace Join Request List Request schema for paginated list query.
 * @public
 */
export const WorkspaceJoinRequestListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(
            WorkspaceJoinRequestDefaultAvailableOrderBy
        ),
        status: z.string().optional().meta({
            description: 'Filter by status, comma-delimited',
            example: '',
        }),
    });

/**
 * Inferred DTO for WorkspaceJoinRequestListRequestSchema.
 * @public
 */
export type WorkspaceJoinRequestListRequestDto = z.infer<
    typeof WorkspaceJoinRequestListRequestSchema
>;
