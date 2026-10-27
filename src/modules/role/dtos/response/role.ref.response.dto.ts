import { z } from 'zod';
import { RoleSchema } from '@modules/role/dtos/role.dto';

/**
 * Minimal role shape embedded in another module's response: id, scope, key and name.
 * @public
 */
export const RoleRefResponseSchema = RoleSchema.pick({
    id: true,
    scope: true,
    key: true,
    name: true,
});

/**
 * Minimal role shape embedded in another module's response.
 * @public
 */
export type RoleRefResponseDto = z.infer<typeof RoleRefResponseSchema>;
