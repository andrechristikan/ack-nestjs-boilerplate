import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/** @public */
export const PolicyUpdateRequestSchema = PolicySchema.pick({
    action: true,
}).strict();

/** @public */
export type PolicyUpdateRequestDto = z.infer<typeof PolicyUpdateRequestSchema>;
