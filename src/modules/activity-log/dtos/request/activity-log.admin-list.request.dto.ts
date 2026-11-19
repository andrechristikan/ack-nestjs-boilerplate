import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumActivityLogOrderBy } from '@modules/activity-log/enums/activity-log.enum';

/** @public */
export const ActivityLogAdminListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumActivityLogOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumActivityLogOrderBy).join(', ')}. An empty or absent value uses \`${EnumActivityLogOrderBy.latest}\`.`,
                example: EnumActivityLogOrderBy.latest,
            }),
    });

/** @public */
export type ActivityLogAdminListRequestDto = z.infer<
    typeof ActivityLogAdminListRequestSchema
>;
