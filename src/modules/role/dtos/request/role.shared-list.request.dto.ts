import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumRoleScope } from '@generated/prisma-client/client';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
} from '@modules/role/constants/role.list.constant';

/**
 * Role Shared List Request schema: an offset page of the workspace or project role catalog.
 * @public
 */
export const RoleSharedListRequestSchema = PaginationOffsetQuerySchema.extend({
    search: z
        .string()
        .optional()
        .meta({
            description: `Search query, available fields: ${RoleDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
    orderBy: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .meta({
            description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${RoleDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${RoleDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
    scope: z.enum([EnumRoleScope.workspace, EnumRoleScope.project]).meta({
        description: `Scope of the role catalog to list. Available scopes: ${EnumRoleScope.workspace}, ${EnumRoleScope.project}`,
        example: EnumRoleScope.workspace,
    }),
});

/**
 * Inferred DTO for RoleSharedListRequestSchema.
 * @public
 */
export type RoleSharedListRequestDto = z.infer<
    typeof RoleSharedListRequestSchema
>;
