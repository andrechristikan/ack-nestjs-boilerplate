import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';
import { PolicyConditionsRequestSchema } from '@modules/policy/validations/policy.conditions.validation';

/** @public */
export const PolicyCreateRequestSchema = z.strictObject({
    ...PolicySchema.pick({ subject: true, action: true }).shape,
    inverted: PolicySchema.shape.inverted.optional(),
    conditions: PolicyConditionsRequestSchema.optional(),
    reason: PolicySchema.shape.reason.unwrap().optional(),
});

/** @public */
export type PolicyCreateRequestDto = z.infer<typeof PolicyCreateRequestSchema>;
