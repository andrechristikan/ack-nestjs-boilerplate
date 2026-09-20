import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';

/**
 * Project User List Request schema for paginated list query.
 * @public
 */
export const ProjectUserListRequestSchema = PaginationCursorQuerySchema.extend({
    search: z
        .string()
        .optional()
        .meta({
            description: `Search query, available fields: ${ProjectDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
    orderBy: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .meta({
            description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${ProjectCursorAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${ProjectCursorAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
});

/**
 * Inferred DTO for ProjectUserListRequestSchema.
 * @public
 */
export type ProjectUserListRequestDto = z.infer<
    typeof ProjectUserListRequestSchema
>;
