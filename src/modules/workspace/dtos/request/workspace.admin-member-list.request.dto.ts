import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { WorkspaceMemberDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';

/**
 * Workspace Admin Member List Request schema for paginated list query.
 * @public
 */
export const WorkspaceAdminMemberListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([
                z.templateLiteral([
                    z.enum(WorkspaceMemberDefaultAvailableOrderBy),
                    ':',
                    z.enum(EnumPaginationOrderDirectionType),
                ]),
                z.array(
                    z.templateLiteral([
                        z.enum(WorkspaceMemberDefaultAvailableOrderBy),
                        ':',
                        z.enum(EnumPaginationOrderDirectionType),
                    ])
                ),
                z.literal(''),
            ])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`${WorkspaceMemberDefaultAvailableOrderBy[0]}:desc\`). Available fields: ${WorkspaceMemberDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${WorkspaceMemberDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    });

/**
 * Inferred DTO for WorkspaceAdminMemberListRequestSchema.
 * @public
 */
export type WorkspaceAdminMemberListRequestDto = z.infer<
    typeof WorkspaceAdminMemberListRequestSchema
>;
