import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { FeatureFlagDefaultAvailableSearch } from '@modules/feature-flag/constants/feature-flag.list.constant';
import { EnumFeatureFlagOrderBy } from '@modules/feature-flag/enums/feature-flag.enum';

/** @public */
export const FeatureFlagSystemListRequestSchema =
    PaginationCursorQuerySchema.extend({
        search: PaginationCursorQuerySchema.shape.search.meta({
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
export type FeatureFlagSystemListRequestDto = z.infer<
    typeof FeatureFlagSystemListRequestSchema
>;
