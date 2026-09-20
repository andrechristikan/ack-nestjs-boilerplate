import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes a role distribution as counted rows inside a declared object.
 * @public
 */
export const AnalyticRoleCountResponseSchema = z.object({
    roles: z
        .array(
            z.object({
                role: z.string().meta({
                    description: 'Role the row counts',
                    example: 'admin',
                }),
                count: z.number().meta({
                    description: 'Number of members holding the role',
                    example: faker.number.int({ min: 0, max: 500 }),
                }),
            })
        )
        .meta({
            description: 'One counted row per role of a fixed role enum',
        }),
});

/**
 * Role distribution carried as counted rows inside a declared object.
 * @public
 */
export type AnalyticRoleCountResponseDto = z.infer<
    typeof AnalyticRoleCountResponseSchema
>;
