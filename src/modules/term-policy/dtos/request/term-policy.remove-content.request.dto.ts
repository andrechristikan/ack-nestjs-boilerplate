import { z } from 'zod';
import { TermPolicyContentPresignRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';

/**
 * Validates the body for removing one term policy content by language.
 * @public
 */
export const TermPolicyRemoveContentRequestSchema =
    TermPolicyContentPresignRequestSchema.pick({ language: true });

/**
 * Body for removing one term policy content by language.
 * @public
 */
export type TermPolicyRemoveContentRequestDto = z.infer<
    typeof TermPolicyRemoveContentRequestSchema
>;
