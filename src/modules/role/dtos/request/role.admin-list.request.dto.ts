import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
} from '@modules/role/constants/role.list.constant';

/**
 * Role Admin List Request schema for paginated list query.
 * @public
 */
export const RoleAdminListRequestSchema = PaginationOffsetQuerySchema.extend({
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
    type: z.string().optional().meta({
        description: 'Filter by type, comma-delimited',
        example: '',
    }),
});

/**
 * Inferred DTO for RoleAdminListRequestSchema.
 * @public
 */
export type RoleAdminListRequestDto = z.infer<
    typeof RoleAdminListRequestSchema
>;
