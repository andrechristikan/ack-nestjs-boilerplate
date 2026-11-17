import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/** @public */
export const PolicyUpdateRequestSchema = z.strictObject(
    PolicySchema.pick({ action: true }).shape
);

/** @public */
export type PolicyUpdateRequestDto = z.infer<typeof PolicyUpdateRequestSchema>;
