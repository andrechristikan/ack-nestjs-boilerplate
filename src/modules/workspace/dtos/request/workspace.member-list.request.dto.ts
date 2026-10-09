import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { WorkspaceMemberDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';

/**
 * Workspace Member List Request schema for paginated list query.
 * @public
 */
export const WorkspaceMemberListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(
            WorkspaceMemberDefaultAvailableOrderBy
        ),
        role: z.string().optional().meta({
            description: 'Filter by role, comma-delimited',
            example: '',
        }),
    });

/**
 * Inferred DTO for WorkspaceMemberListRequestSchema.
 * @public
 */
export type WorkspaceMemberListRequestDto = z.infer<
    typeof WorkspaceMemberListRequestSchema
>;
