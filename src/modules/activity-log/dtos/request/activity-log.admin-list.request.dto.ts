import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';

/** @public */
export const ActivityLogAdminListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([
                z.templateLiteral([
                    z.enum(ActivityLogDefaultAvailableOrderBy),
                    ':',
                    z.enum(EnumPaginationOrderDirectionType),
                ]),
                z.literal(''),
            ])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`${ActivityLogDefaultAvailableOrderBy[0]}:desc\`). Available fields: ${ActivityLogDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}.`,
                example: `${ActivityLogDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    });

/** @public */
export type ActivityLogAdminListRequestDto = z.infer<
    typeof ActivityLogAdminListRequestSchema
>;
