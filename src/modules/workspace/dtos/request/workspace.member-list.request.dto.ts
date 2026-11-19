import { z } from 'zod';
import { PaginationMaxFilterLength } from '@common/pagination/constants/pagination.constant';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { EnumWorkspaceMemberOrderBy } from '@modules/workspace/enums/workspace.enum';

/** @public */
export const WorkspaceMemberListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumWorkspaceMemberOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumWorkspaceMemberOrderBy).join(', ')}. An empty or absent value uses \`${EnumWorkspaceMemberOrderBy.latest}\`.`,
                example: EnumWorkspaceMemberOrderBy.latest,
            }),
        role: z
            .string()
            .max(PaginationMaxFilterLength)
            .optional()
            .meta({
                description: `Filter by role, comma-delimited, at most ${PaginationMaxFilterLength} characters`,
                example: '',
            }),
    });

/** @public */
export type WorkspaceMemberListRequestDto = z.infer<
    typeof WorkspaceMemberListRequestSchema
>;
