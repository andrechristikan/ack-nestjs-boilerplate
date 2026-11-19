import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { FeatureFlagDefaultAvailableSearch } from '@modules/feature-flag/constants/feature-flag.list.constant';
import { EnumFeatureFlagOrderBy } from '@modules/feature-flag/enums/feature-flag.enum';

/** @public */
export const FeatureFlagAdminListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        search: PaginationOffsetQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${FeatureFlagDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: z
            .union([z.enum(EnumFeatureFlagOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumFeatureFlagOrderBy).join(', ')}. An empty or absent value uses \`${EnumFeatureFlagOrderBy.latest}\`.`,
                example: EnumFeatureFlagOrderBy.latest,
            }),
    });

/** @public */
export type FeatureFlagAdminListRequestDto = z.infer<
    typeof FeatureFlagAdminListRequestSchema
>;
