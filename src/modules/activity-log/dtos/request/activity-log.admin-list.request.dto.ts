import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';

/**
 * Activity Log Admin List Request schema for paginated list query.
 * @public
 */
export const ActivityLogAdminListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOffsetQuerySchema.shape.orderBy.meta({
            description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${ActivityLogDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${ActivityLogDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
    });

/**
 * Inferred DTO for ActivityLogAdminListRequestSchema.
 * @public
 */
export type ActivityLogAdminListRequestDto = z.infer<
    typeof ActivityLogAdminListRequestSchema
>;
