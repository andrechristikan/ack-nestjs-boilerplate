import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import {
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';

/**
 * Offset list query for admin workspace listing.
 * @public
 */
export const WorkspaceAdminListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        search: PaginationOffsetQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${WorkspaceDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: z
            .union([
                z.templateLiteral([
                    z.enum(WorkspaceDefaultAvailableOrderBy),
                    ':',
                    z.enum(EnumPaginationOrderDirectionType),
                ]),
                z.array(
                    z.templateLiteral([
                        z.enum(WorkspaceDefaultAvailableOrderBy),
                        ':',
                        z.enum(EnumPaginationOrderDirectionType),
                    ])
                ),
                z.literal(''),
            ])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`${WorkspaceDefaultAvailableOrderBy[0]}:desc\`). Available fields: ${WorkspaceDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${WorkspaceDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
        isPublic: RequestBooleanStringSchema.optional().meta({
            description: 'Filter by public visibility',
            example: 'true',
        }),
    });

/**
 * Inferred DTO for WorkspaceAdminListRequestSchema.
 * @public
 */
export type WorkspaceAdminListRequestDto = z.infer<
    typeof WorkspaceAdminListRequestSchema
>;
