import { z } from 'zod';
import { PaginationMaxFilterLength } from '@common/pagination/constants/pagination.constant';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RoleDefaultAvailableSearch } from '@modules/role/constants/role.list.constant';
import { EnumRoleOrderBy } from '@modules/role/enums/role.enum';

/** @public */
export const RoleAdminListRequestSchema = PaginationOffsetQuerySchema.extend({
    search: PaginationOffsetQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${RoleDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: z
        .union([z.enum(EnumRoleOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumRoleOrderBy).join(', ')}. An empty or absent value uses \`${EnumRoleOrderBy.latest}\`.`,
            example: EnumRoleOrderBy.latest,
        }),
    type: z
        .string()
        .max(PaginationMaxFilterLength)
        .optional()
        .meta({
            description: `Filter by type, comma-delimited, at most ${PaginationMaxFilterLength} characters`,
            example: '',
        }),
});

/** @public */
export type RoleAdminListRequestDto = z.infer<
    typeof RoleAdminListRequestSchema
>;
