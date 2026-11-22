import { z } from 'zod';
import { TermPolicyContentPresignRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';

/** @public */
export const TermPolicyRemoveContentRequestSchema =
    TermPolicyContentPresignRequestSchema.pick({ language: true });

/** @public */
export type TermPolicyRemoveContentRequestDto = z.infer<
    typeof TermPolicyRemoveContentRequestSchema
>;
