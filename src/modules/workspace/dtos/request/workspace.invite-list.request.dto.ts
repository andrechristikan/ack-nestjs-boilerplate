import { z } from 'zod';
import { PaginationMaxFilterLength } from '@common/pagination/constants/pagination.constant';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { WorkspaceInviteDefaultAvailableSearch } from '@modules/workspace/constants/workspace.list.constant';
import { EnumWorkspaceInviteOrderBy } from '@modules/workspace/enums/workspace.enum';

/** @public */
export const WorkspaceInviteListRequestSchema =
    PaginationCursorQuerySchema.extend({
        search: PaginationCursorQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${WorkspaceInviteDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: z
            .union([z.enum(EnumWorkspaceInviteOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumWorkspaceInviteOrderBy).join(', ')}. An empty or absent value uses \`${EnumWorkspaceInviteOrderBy.latest}\`.`,
                example: EnumWorkspaceInviteOrderBy.latest,
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
export type WorkspaceInviteListRequestDto = z.infer<
    typeof WorkspaceInviteListRequestSchema
>;
