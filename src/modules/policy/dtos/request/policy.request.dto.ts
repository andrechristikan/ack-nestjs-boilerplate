import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/** @public */
export const PolicyRequestSchema = PolicySchema.pick({
    subject: true,
    action: true,
}).strict();

/** @public */
export type PolicyRequestDto = z.infer<typeof PolicyRequestSchema>;
