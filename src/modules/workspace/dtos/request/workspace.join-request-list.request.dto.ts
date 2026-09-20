import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { WorkspaceJoinRequestDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';

/**
 * Workspace Join Request List Request schema for paginated list query.
 * @public
 */
export const WorkspaceJoinRequestListRequestSchema =
    PaginationCursorQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${WorkspaceJoinRequestDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${WorkspaceJoinRequestDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
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
