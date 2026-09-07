import { z } from 'zod';
import { TermPolicyContentPresignRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';

export const TermPolicyContentRequestSchema =
    TermPolicyContentPresignRequestSchema.pick({
        language: true,
        size: true,
    }).extend({
        key: z.string().min(1).meta({
            description: 'Key of the term document in storage',
            example: 'terms/privacy/en/terms_privacy_en_v1.hbs',
        }),
    });

export type TermPolicyContentRequestDto = z.infer<
    typeof TermPolicyContentRequestSchema
>;
