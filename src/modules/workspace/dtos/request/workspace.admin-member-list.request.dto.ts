import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { WorkspaceMemberDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';

/**
 * Workspace Admin Member List Request schema for paginated list query.
 * @public
 */
export const WorkspaceAdminMemberListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(
            WorkspaceMemberDefaultAvailableOrderBy
        ),
    });

/**
 * Inferred DTO for WorkspaceAdminMemberListRequestSchema.
 * @public
 */
export type WorkspaceAdminMemberListRequestDto = z.infer<
    typeof WorkspaceAdminMemberListRequestSchema
>;
