import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';

/**
 * Feature Flag System List Request schema for paginated list query.
 * @public
 */
export const FeatureFlagSystemListRequestSchema =
    PaginationCursorQuerySchema.extend({
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
 * Inferred DTO for FeatureFlagSystemListRequestSchema.
 * @public
 */
export type FeatureFlagSystemListRequestDto = z.infer<
    typeof FeatureFlagSystemListRequestSchema
>;
