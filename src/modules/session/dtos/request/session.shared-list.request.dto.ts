import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { SessionCursorAvailableOrderBy } from '@modules/session/constants/session.list.constant';

/**
 * Session Shared List Request schema for paginated list query.
 * @public
 */
export const SessionSharedListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: z
        .union([
            z.templateLiteral([
                z.enum(SessionCursorAvailableOrderBy),
                ':',
                z.enum(EnumPaginationOrderDirectionType),
            ]),
            z.array(
                z.templateLiteral([
                    z.enum(SessionCursorAvailableOrderBy),
                    ':',
                    z.enum(EnumPaginationOrderDirectionType),
                ])
            ),
            z.literal(''),
        ])
        .optional()
        .meta({
            description: `Order by field in \`field:direction\` format (e.g. \`${SessionCursorAvailableOrderBy[0]}:desc\`). Available fields: ${SessionCursorAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${SessionCursorAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
});

/**
 * Inferred DTO for SessionSharedListRequestSchema.
 * @public
 */
export type SessionSharedListRequestDto = z.infer<
    typeof SessionSharedListRequestSchema
>;
