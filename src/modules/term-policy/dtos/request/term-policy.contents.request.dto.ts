import { z } from 'zod';
import { TermPolicyContentRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';

/**
 * Validates term policy contents, one per language.
 * @public
 */
export const TermPolicyContentsRequestSchema = z.strictObject({
    contents: z
        .array(TermPolicyContentRequestSchema)
        .min(1)
        .refine(
            contents =>
                new Set(contents.map(content => content.language)).size ===
                contents.length
        )
        .meta({
            description: 'Contents of the terms policy',
            example: [],
        }),
});

/**
 * Request body carrying localized term policy contents, one per language.
 * @public
 */
export type TermPolicyContentsRequestDto = z.infer<
    typeof TermPolicyContentsRequestSchema
>;
