import { z } from 'zod';
import { TermPolicyAcceptRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyContentPresignRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentsRequestSchema } from '@modules/term-policy/dtos/request/term-policy.contents.request.dto';

export const TermPolicyCreateRequestSchema =
    TermPolicyAcceptRequestSchema.extend({
        contents: TermPolicyContentsRequestSchema.shape.contents,
        version: TermPolicyContentPresignRequestSchema.shape.version,
    });

export type TermPolicyCreateRequestDto = z.infer<
    typeof TermPolicyCreateRequestSchema
>;
