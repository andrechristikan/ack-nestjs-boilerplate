import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { PasswordHistoryCursorAvailableOrderBy } from '@modules/password-history/constants/password-history.list.constant';

/**
 * Password History Shared List Request schema for paginated list query.
 * @public
 */
export const PasswordHistorySharedListRequestSchema =
    PaginationCursorQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${PasswordHistoryCursorAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${PasswordHistoryCursorAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    });

/**
 * Inferred DTO for PasswordHistorySharedListRequestSchema.
 * @public
 */
export type PasswordHistorySharedListRequestDto = z.infer<
    typeof PasswordHistorySharedListRequestSchema
>;
