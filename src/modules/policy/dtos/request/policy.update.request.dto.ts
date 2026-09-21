import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/**
 * Request shape rewriting the action list of one stored policy. `subject` is half of the
 * `(roleId, subject)` identity, so it is not updatable.
 * @public
 */
export const PolicyUpdateRequestSchema = PolicySchema.pick({
    action: true,
}).strict();

/**
 * Body replacing the action list of one policy.
 * @public
 */
export type PolicyUpdateRequestDto = z.infer<typeof PolicyUpdateRequestSchema>;
