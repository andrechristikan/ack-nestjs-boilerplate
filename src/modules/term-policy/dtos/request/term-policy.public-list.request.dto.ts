import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { TermPolicyDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';

/**
 * Term Policy Public List Request schema for paginated list query.
 * @public
 */
export const TermPolicyPublicListRequestSchema =
    PaginationCursorQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${TermPolicyDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${TermPolicyDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
        type: z.string().optional().meta({
            description: 'Filter by type',
            example: '',
        }),
    });

/**
 * Inferred DTO for TermPolicyPublicListRequestSchema.
 * @public
 */
export type TermPolicyPublicListRequestDto = z.infer<
    typeof TermPolicyPublicListRequestSchema
>;
