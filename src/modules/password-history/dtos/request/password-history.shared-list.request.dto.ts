import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { EnumPasswordHistoryCursorOrderBy } from '@modules/password-history/enums/password-history.enum';

/** @public */
export const PasswordHistorySharedListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumPasswordHistoryCursorOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumPasswordHistoryCursorOrderBy).join(', ')}. An empty or absent value uses \`${EnumPasswordHistoryCursorOrderBy.latest}\`.`,
                example: EnumPasswordHistoryCursorOrderBy.latest,
            }),
    });

/** @public */
export type PasswordHistorySharedListRequestDto = z.infer<
    typeof PasswordHistorySharedListRequestSchema
>;
