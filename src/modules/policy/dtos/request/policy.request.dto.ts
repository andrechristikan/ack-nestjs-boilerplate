import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/**
 * Request shape naming one stored `(subject, action[])` combination.
 */
export const PolicyRequestSchema = PolicySchema.pick({
    subject: true,
    action: true,
}).strict();

export type PolicyRequestDto = z.infer<typeof PolicyRequestSchema>;
