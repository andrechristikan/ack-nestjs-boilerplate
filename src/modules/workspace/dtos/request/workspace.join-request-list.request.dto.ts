import { z } from 'zod';
import { PaginationMaxFilterLength } from '@common/pagination/constants/pagination.constant';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { EnumWorkspaceJoinRequestOrderBy } from '@modules/workspace/enums/workspace.enum';

/** @public */
export const WorkspaceJoinRequestListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumWorkspaceJoinRequestOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumWorkspaceJoinRequestOrderBy).join(', ')}. An empty or absent value uses \`${EnumWorkspaceJoinRequestOrderBy.latest}\`.`,
                example: EnumWorkspaceJoinRequestOrderBy.latest,
            }),
        status: z
            .string()
            .max(PaginationMaxFilterLength)
            .optional()
            .meta({
                description: `Filter by status, comma-delimited, at most ${PaginationMaxFilterLength} characters`,
                example: '',
            }),
    });

/** @public */
export type WorkspaceJoinRequestListRequestDto = z.infer<
    typeof WorkspaceJoinRequestListRequestSchema
>;
