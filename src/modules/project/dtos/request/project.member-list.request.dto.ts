import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { EnumProjectMemberOrderBy } from '@modules/project/enums/project.enum';

/** @public */
export const ProjectMemberListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: z
        .union([z.enum(EnumProjectMemberOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumProjectMemberOrderBy).join(', ')}. An empty or absent value uses \`${EnumProjectMemberOrderBy.latest}\`.`,
            example: EnumProjectMemberOrderBy.latest,
        }),
});

/** @public */
export type ProjectMemberListRequestDto = z.infer<
    typeof ProjectMemberListRequestSchema
>;
