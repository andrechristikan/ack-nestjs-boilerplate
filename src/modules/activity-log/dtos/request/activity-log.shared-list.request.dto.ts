import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';

/**
 * Activity Log Shared List Request schema for paginated list query.
 * @public
 */
export const ActivityLogSharedListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([
                z.templateLiteral([
                    z.enum(ActivityLogDefaultAvailableOrderBy),
                    ':',
                    z.enum(EnumPaginationOrderDirectionType),
                ]),
                z.array(
                    z.templateLiteral([
                        z.enum(ActivityLogDefaultAvailableOrderBy),
                        ':',
                        z.enum(EnumPaginationOrderDirectionType),
                    ])
                ),
                z.literal(''),
            ])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`${ActivityLogDefaultAvailableOrderBy[0]}:desc\`). Available fields: ${ActivityLogDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${ActivityLogDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    });

/**
 * Inferred DTO for ActivityLogSharedListRequestSchema.
 * @public
 */
export type ActivityLogSharedListRequestDto = z.infer<
    typeof ActivityLogSharedListRequestSchema
>;
