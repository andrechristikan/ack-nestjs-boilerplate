import { z } from 'zod';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';

/** @public */
export const TermPolicyContentsRequestSchema = z.strictObject({
    contents: z
        .array(TermPolicyContentRequestSchema)
        .min(1)
        .max(Object.values(EnumMessageLanguage).length)
        .refine(
            contents =>
                new Set(contents.map(content => content.language)).size ===
                contents.length
        )
        .meta({
            description:
                'Contents of the terms policy, one per language, at most the number of message languages',
            example: [],
        }),
});

/** @public */
export type TermPolicyContentsRequestDto = z.infer<
    typeof TermPolicyContentsRequestSchema
>;
