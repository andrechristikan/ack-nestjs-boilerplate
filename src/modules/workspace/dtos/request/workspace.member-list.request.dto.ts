import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { WorkspaceMemberDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';

/**
 * Workspace Member List Request schema for paginated list query.
 * @public
 */
export const WorkspaceMemberListRequestSchema =
    PaginationCursorQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${WorkspaceMemberDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${WorkspaceMemberDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
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
