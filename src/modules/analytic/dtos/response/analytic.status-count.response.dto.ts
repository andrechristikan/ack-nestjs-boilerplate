import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes a status distribution as counted rows inside a declared object.
 * @public
 */
export const AnalyticStatusCountResponseSchema = z.object({
    statuses: z
        .array(
            z.object({
                status: z.string().meta({
                    description: 'Status the row counts',
                    example: 'pending',
                }),
                count: z.number().meta({
                    description: 'Number of rows holding the status',
                    example: faker.number.int({ min: 0, max: 5000 }),
                }),
            })
        )
        .meta({
            description: 'One counted row per status of a fixed status enum',
        }),
});

/**
 * Status distribution carried as counted rows inside a declared object.
 * @public
 */
export type AnalyticStatusCountResponseDto = z.infer<
    typeof AnalyticStatusCountResponseSchema
>;
