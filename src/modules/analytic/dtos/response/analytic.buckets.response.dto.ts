import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticBucketsResponseSchema = z.object({
    buckets: z
        .array(
            z.object({
                key: z.string().meta({
                    description: 'Label the bucket counts',
                    example: faker.lorem.word(),
                }),
                count: z.number().meta({
                    description: 'Number of rows in the bucket',
                    example: faker.number.int({ min: 0, max: 5000 }),
                }),
            })
        )
        .meta({
            description: 'Counted buckets of the distribution',
            example: [{ key: 'email', count: 42 }],
        }),
});

/** @public */
export type AnalyticBucketsResponseDto = z.infer<
    typeof AnalyticBucketsResponseSchema
>;
