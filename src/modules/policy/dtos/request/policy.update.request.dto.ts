import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';
import { PolicyConditionsRequestSchema } from '@modules/policy/validations/policy.conditions.validation';

/** @public */
export const PolicyUpdateRequestSchema = z.strictObject({
    ...PolicySchema.pick({ action: true, inverted: true, reason: true }).shape,
    conditions: PolicyConditionsRequestSchema.nullable(),
});

/** @public */
export type PolicyUpdateRequestDto = z.infer<typeof PolicyUpdateRequestSchema>;
