import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/**
 * Request shape naming one stored `(subject, action[])` combination.
 * @public
 */
export const PolicyRequestSchema = PolicySchema.pick({
    subject: true,
    action: true,
}).strict();

/**
 * Body naming one subject with its actions.
 * @public
 */
export type PolicyRequestDto = z.infer<typeof PolicyRequestSchema>;
