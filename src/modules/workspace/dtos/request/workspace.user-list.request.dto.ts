import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { WorkspaceDefaultAvailableSearch } from '@modules/workspace/constants/workspace.list.constant';
import { EnumWorkspaceCursorOrderBy } from '@modules/workspace/enums/workspace.enum';

/** @public */
export const WorkspaceUserListRequestSchema =
    PaginationCursorQuerySchema.extend({
        search: PaginationCursorQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${WorkspaceDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: z
            .union([z.enum(EnumWorkspaceCursorOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumWorkspaceCursorOrderBy).join(', ')}. An empty or absent value uses \`${EnumWorkspaceCursorOrderBy.latest}\`.`,
                example: EnumWorkspaceCursorOrderBy.latest,
            }),
    });

/** @public */
export type WorkspaceUserListRequestDto = z.infer<
    typeof WorkspaceUserListRequestSchema
>;
