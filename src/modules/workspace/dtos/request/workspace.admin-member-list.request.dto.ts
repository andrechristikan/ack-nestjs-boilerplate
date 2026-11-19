import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumWorkspaceMemberOrderBy } from '@modules/workspace/enums/workspace.enum';

/** @public */
export const WorkspaceAdminMemberListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumWorkspaceMemberOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumWorkspaceMemberOrderBy).join(', ')}. An empty or absent value uses \`${EnumWorkspaceMemberOrderBy.latest}\`.`,
                example: EnumWorkspaceMemberOrderBy.latest,
            }),
    });

/** @public */
export type WorkspaceAdminMemberListRequestDto = z.infer<
    typeof WorkspaceAdminMemberListRequestSchema
>;
