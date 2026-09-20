import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { PasswordHistoryDefaultAvailableOrderBy } from '@modules/password-history/constants/password-history.list.constant';

/**
 * Password History Admin List Request schema for paginated list query.
 * @public
 */
export const PasswordHistoryAdminListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${PasswordHistoryDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${PasswordHistoryDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    });

/**
 * Inferred DTO for PasswordHistoryAdminListRequestSchema.
 * @public
 */
export type PasswordHistoryAdminListRequestDto = z.infer<
    typeof PasswordHistoryAdminListRequestSchema
>;
