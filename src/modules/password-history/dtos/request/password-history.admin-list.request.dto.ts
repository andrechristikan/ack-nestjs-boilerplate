import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumPasswordHistoryOrderBy } from '@modules/password-history/enums/password-history.enum';

/** @public */
export const PasswordHistoryAdminListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumPasswordHistoryOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumPasswordHistoryOrderBy).join(', ')}. An empty or absent value uses \`${EnumPasswordHistoryOrderBy.latest}\`.`,
                example: EnumPasswordHistoryOrderBy.latest,
            }),
    });

/** @public */
export type PasswordHistoryAdminListRequestDto = z.infer<
    typeof PasswordHistoryAdminListRequestSchema
>;
