import { z } from 'zod';
import { PaginationMaxFilterLength } from '@common/pagination/constants/pagination.constant';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumTermPolicyOrderBy } from '@modules/term-policy/enums/term-policy.enum';

/** @public */
export const TermPolicyAdminListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumTermPolicyOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumTermPolicyOrderBy).join(', ')}. An empty or absent value uses \`${EnumTermPolicyOrderBy.latest}\`.`,
                example: EnumTermPolicyOrderBy.latest,
            }),
        type: z
            .string()
            .max(PaginationMaxFilterLength)
            .optional()
            .meta({
                description: `Filter by type, at most ${PaginationMaxFilterLength} characters`,
                example: '',
            }),
        status: z
            .string()
            .max(PaginationMaxFilterLength)
            .optional()
            .meta({
                description: `Filter by status, at most ${PaginationMaxFilterLength} characters`,
                example: '',
            }),
    });

/** @public */
export type TermPolicyAdminListRequestDto = z.infer<
    typeof TermPolicyAdminListRequestSchema
>;
