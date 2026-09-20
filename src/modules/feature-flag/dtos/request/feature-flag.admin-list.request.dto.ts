import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';

/**
 * Feature Flag Admin List Request schema for paginated list query.
 * @public
 */
export const FeatureFlagAdminListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        search: z
            .string()
            .optional()
            .meta({
                description: `Search query, available fields: ${FeatureFlagDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
                example: '',
            }),
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${FeatureFlagDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${FeatureFlagDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    });

/**
 * Inferred DTO for FeatureFlagAdminListRequestSchema.
 * @public
 */
export type FeatureFlagAdminListRequestDto = z.infer<
    typeof FeatureFlagAdminListRequestSchema
>;
