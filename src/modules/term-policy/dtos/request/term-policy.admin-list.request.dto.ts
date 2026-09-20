import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { TermPolicyDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';

/**
 * Term Policy Admin List Request schema for paginated list query.
 * @public
 */
export const TermPolicyAdminListRequestSchema =
    PaginationOffsetQuerySchema.extend({
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
        status: z.string().optional().meta({
            description: 'Filter by status',
            example: '',
        }),
    });

/**
 * Inferred DTO for TermPolicyAdminListRequestSchema.
 * @public
 */
export type TermPolicyAdminListRequestDto = z.infer<
    typeof TermPolicyAdminListRequestSchema
>;
