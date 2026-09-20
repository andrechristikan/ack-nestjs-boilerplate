import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one counted fraud detection row keyed by the value it groups on.
 * @public
 */
export const AnalyticKeyCountResponseSchema = z.object({
    key: z.string().meta({
        description: 'Value the detection groups on, such as an IP or a domain',
        example: faker.internet.ip(),
    }),
    count: z.number().meta({
        description: 'Number of rows sharing the key',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
});

/**
 * One counted fraud detection row keyed by the value it groups on.
 * @public
 */
export type AnalyticKeyCountResponseDto = z.infer<
    typeof AnalyticKeyCountResponseSchema
>;
