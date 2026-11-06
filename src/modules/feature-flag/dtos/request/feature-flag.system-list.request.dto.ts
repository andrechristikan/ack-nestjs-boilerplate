import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';

/** @public */
export const FeatureFlagSystemListRequestSchema =
    PaginationCursorQuerySchema.extend({
        search: PaginationCursorQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${FeatureFlagDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: z
            .union([
                z.templateLiteral([
                    z.enum(FeatureFlagDefaultAvailableOrderBy),
                    ':',
                    z.enum(EnumPaginationOrderDirectionType),
                ]),
                z.literal(''),
            ])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`${FeatureFlagDefaultAvailableOrderBy[0]}:desc\`). Available fields: ${FeatureFlagDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}.`,
                example: `${FeatureFlagDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    });

/** @public */
export type FeatureFlagSystemListRequestDto = z.infer<
    typeof FeatureFlagSystemListRequestSchema
>;
