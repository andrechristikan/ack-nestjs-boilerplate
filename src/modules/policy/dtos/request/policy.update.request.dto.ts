import { z } from 'zod';
import { PolicyCreateRequestSchema } from '@modules/policy/dtos/request/policy.create.request.dto';

/**
 * Request shape rewriting one stored rule. `subject` is fixed at creation, so it is not
 * updatable.
 * @public
 */
export const PolicyUpdateRequestSchema = PolicyCreateRequestSchema.omit({
    subject: true,
});

/**
 * Body replacing the full rule of one policy, minus its subject.
 * @public
 */
export type PolicyUpdateRequestDto = z.infer<typeof PolicyUpdateRequestSchema>;
