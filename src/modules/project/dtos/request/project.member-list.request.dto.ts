import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { ProjectMemberDefaultAvailableOrderBy } from '@modules/project/constants/project.list.constant';

/**
 * Project Member List Request schema for paginated list query.
 * @public
 */
export const ProjectMemberListRequestSchema =
    PaginationCursorQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${ProjectMemberDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${ProjectMemberDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    });

/**
 * Inferred DTO for ProjectMemberListRequestSchema.
 * @public
 */
export type ProjectMemberListRequestDto = z.infer<
    typeof ProjectMemberListRequestSchema
>;
