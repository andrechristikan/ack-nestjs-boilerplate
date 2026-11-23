import { z } from 'zod';
import { PaginationMaxFilterLength } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
} from '@modules/role/constants/role.list.constant';

/** @public */
export const RoleAdminListRequestSchema = PaginationOffsetQuerySchema.extend({
    search: PaginationOffsetQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${RoleDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: z
        .union([
            z.templateLiteral([
                z.enum(RoleDefaultAvailableOrderBy),
                ':',
                z.enum(EnumPaginationOrderDirectionType),
            ]),
            z.literal(''),
        ])
        .optional()
        .meta({
            description: `Order by field in \`field:direction\` format (e.g. \`${RoleDefaultAvailableOrderBy[0]}:desc\`). Available fields: ${RoleDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}.`,
            example: `${RoleDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
    scope: z
        .string()
        .max(PaginationMaxFilterLength)
        .optional()
        .meta({
            description: `Filter by scope, comma-delimited, at most ${PaginationMaxFilterLength} characters`,
            example: '',
        }),
});

/** @public */
export type RoleAdminListRequestDto = z.infer<
    typeof RoleAdminListRequestSchema
>;
