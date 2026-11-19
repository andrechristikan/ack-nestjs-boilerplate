import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import { WorkspaceDefaultAvailableSearch } from '@modules/workspace/constants/workspace.list.constant';
import { EnumWorkspaceOrderBy } from '@modules/workspace/enums/workspace.enum';

/** @public */
export const WorkspaceAdminListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        search: PaginationOffsetQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${WorkspaceDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: z
            .union([z.enum(EnumWorkspaceOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumWorkspaceOrderBy).join(', ')}. An empty or absent value uses \`${EnumWorkspaceOrderBy.latest}\`.`,
                example: EnumWorkspaceOrderBy.latest,
            }),
        isPublic: RequestBooleanStringSchema.optional().meta({
            description: 'Filter by public visibility',
            example: 'true',
        }),
    });

/** @public */
export type WorkspaceAdminListRequestDto = z.infer<
    typeof WorkspaceAdminListRequestSchema
>;
