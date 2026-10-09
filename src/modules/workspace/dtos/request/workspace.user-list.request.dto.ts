import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
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
        orderBy: PaginationCursorQuerySchema.shape.orderBy.meta({
            description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${WorkspaceCursorAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${WorkspaceCursorAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
    });

/**
 * Inferred DTO for WorkspaceUserListRequestSchema.
 * @public
 */
export type WorkspaceUserListRequestDto = z.infer<
    typeof WorkspaceUserListRequestSchema
>;
