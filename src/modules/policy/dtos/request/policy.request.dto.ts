import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/** @public */
export const PolicyRequestSchema = z.strictObject(
    PolicySchema.pick({ subject: true, action: true }).shape
);

/** @public */
export type PolicyRequestDto = z.infer<typeof PolicyRequestSchema>;
