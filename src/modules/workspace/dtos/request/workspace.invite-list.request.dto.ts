import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
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
        search: z
            .string()
            .optional()
            .meta({
                description: `Search query, available fields: ${WorkspaceInviteDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
                example: '',
            }),
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${WorkspaceInviteDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${WorkspaceInviteDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
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
