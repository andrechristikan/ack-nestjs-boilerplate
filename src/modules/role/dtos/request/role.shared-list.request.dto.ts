import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    RoleCursorAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleSharedScope,
} from '@modules/role/constants/role.list.constant';

/** @public */
export const RoleSharedListRequestSchema = PaginationCursorQuerySchema.extend({
    search: PaginationCursorQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${RoleDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: z
        .union([
            z.templateLiteral([
                z.enum(RoleCursorAvailableOrderBy),
                ':',
                z.enum(EnumPaginationOrderDirectionType),
            ]),
            z.literal(''),
        ])
        .optional()
        .meta({
            description: `Order by field in \`field:direction\` format (e.g. \`${RoleCursorAvailableOrderBy[0]}:desc\`). Available fields: ${RoleCursorAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}.`,
            example: `${RoleCursorAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
    scope: z.enum(RoleSharedScope).meta({
        description: `Scope of the role catalog: ${RoleSharedScope.join(', ')}`,
        example: RoleSharedScope[0],
    }),
});

/** @public */
export type RoleSharedListRequestDto = z.infer<
    typeof RoleSharedListRequestSchema
>;
