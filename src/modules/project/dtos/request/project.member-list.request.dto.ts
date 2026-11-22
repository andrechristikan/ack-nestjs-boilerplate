import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { ProjectMemberDefaultAvailableOrderBy } from '@modules/project/constants/project.list.constant';

/** @public */
export const ProjectMemberListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: z
        .union([
            z.templateLiteral([
                z.enum(ProjectMemberDefaultAvailableOrderBy),
                ':',
                z.enum(EnumPaginationOrderDirectionType),
            ]),
            z.literal(''),
        ])
        .optional()
        .meta({
            description: `Order by field in \`field:direction\` format (e.g. \`${ProjectMemberDefaultAvailableOrderBy[0]}:desc\`). Available fields: ${ProjectMemberDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}.`,
            example: `${ProjectMemberDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
});

/** @public */
export type ProjectMemberListRequestDto = z.infer<
    typeof ProjectMemberListRequestSchema
>;
