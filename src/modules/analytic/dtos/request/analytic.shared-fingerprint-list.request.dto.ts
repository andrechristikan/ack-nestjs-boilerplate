import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticSharedFingerprintAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';

/**
 * Analytic Shared Fingerprint List Request schema for paginated list query.
 * @public
 */
export const AnalyticSharedFingerprintListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticSharedFingerprintAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticSharedFingerprintAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    });

/**
 * Inferred DTO for AnalyticSharedFingerprintListRequestSchema.
 * @public
 */
export type AnalyticSharedFingerprintListRequestDto = z.infer<
    typeof AnalyticSharedFingerprintListRequestSchema
>;
