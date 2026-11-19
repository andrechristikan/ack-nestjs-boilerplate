import { AnalyticBucketsResponseSchema } from '@modules/analytic/dtos/response/analytic.buckets.response.dto';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

/** @public */
export const AnalyticSnapshotBucketsResponseSchema =
    AnalyticBucketsResponseSchema.extend({
        computedAt: z.date().nullable().meta({
            description:
                'When the stored buckets were computed; null before the first run',
            example: faker.date.recent(),
        }),
    });

/** @public */
export type AnalyticSnapshotBucketsResponseDto = z.infer<
    typeof AnalyticSnapshotBucketsResponseSchema
>;
