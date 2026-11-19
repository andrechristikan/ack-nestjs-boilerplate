import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { EnumTermPolicyAcceptanceOrderBy } from '@modules/term-policy/enums/term-policy.enum';

/** @public */
export const TermPolicyAcceptedListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumTermPolicyAcceptanceOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumTermPolicyAcceptanceOrderBy).join(', ')}. An empty or absent value uses \`${EnumTermPolicyAcceptanceOrderBy.latest}\`.`,
                example: EnumTermPolicyAcceptanceOrderBy.latest,
            }),
    });

/** @public */
export type TermPolicyAcceptedListRequestDto = z.infer<
    typeof TermPolicyAcceptedListRequestSchema
>;
