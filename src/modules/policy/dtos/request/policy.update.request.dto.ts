import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/**
 * Request shape rewriting the action list of one stored policy. `subject` is half of the
 * `(roleId, subject)` identity, so it is not updatable.
 */
export const PolicyUpdateRequestSchema = PolicySchema.pick({
    action: true,
}).strict();

export type PolicyUpdateRequestDto = z.infer<typeof PolicyUpdateRequestSchema>;
