import { z } from 'zod';
import { RoleSchema } from '@modules/role/dtos/role.dto';

/** @public */
export const RoleRefResponseSchema = RoleSchema.pick({
    id: true,
    scope: true,
    key: true,
    name: true,
});

/** @public */
export type RoleRefResponseDto = z.infer<typeof RoleRefResponseSchema>;
