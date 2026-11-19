import { z } from 'zod';
import { PaginationMaxFilterLength } from '@common/pagination/constants/pagination.constant';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { EnumTermPolicyOrderBy } from '@modules/term-policy/enums/term-policy.enum';

/** @public */
export const TermPolicyPublicListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
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
    });

/** @public */
export type TermPolicyPublicListRequestDto = z.infer<
    typeof TermPolicyPublicListRequestSchema
>;
