import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { ProjectDefaultAvailableSearch } from '@modules/project/constants/project.list.constant';
import { EnumProjectCursorOrderBy } from '@modules/project/enums/project.enum';

/** @public */
export const ProjectUserListRequestSchema = PaginationCursorQuerySchema.extend({
    search: PaginationCursorQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${ProjectDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: z
        .union([z.enum(EnumProjectCursorOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumProjectCursorOrderBy).join(', ')}. An empty or absent value uses \`${EnumProjectCursorOrderBy.latest}\`.`,
            example: EnumProjectCursorOrderBy.latest,
        }),
});

/** @public */
export type ProjectUserListRequestDto = z.infer<
    typeof ProjectUserListRequestSchema
>;
