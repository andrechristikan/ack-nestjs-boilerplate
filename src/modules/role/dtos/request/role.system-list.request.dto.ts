import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    RoleCursorAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleDefaultScope,
} from '@modules/role/constants/role.list.constant';

/**
 * Role System List Request schema for paginated list query.
 * @public
 */
export const RoleSystemListRequestSchema = PaginationCursorQuerySchema.extend({
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
            description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${RoleCursorAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${RoleCursorAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
    scope: z
        .string()
        .optional()
        .meta({
            description: `Filter by scope, comma-delimited. Available scopes: ${RoleDefaultScope.join(', ')}`,
            example: '',
        }),
});

/**
 * Inferred DTO for RoleSystemListRequestSchema.
 * @public
 */
export type RoleSystemListRequestDto = z.infer<
    typeof RoleSystemListRequestSchema
>;
