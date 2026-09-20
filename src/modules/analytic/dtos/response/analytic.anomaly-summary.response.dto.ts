import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes an anomaly detector result: the count, its window, and the thresholds used.
 * @public
 */
export const AnalyticAnomalySummaryResponseSchema = z.object({
    count: z.number().meta({
        description: 'Rows the detector flagged',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    window: z.string().optional().meta({
        description: 'Window the detector scanned',
        example: '3600000',
    }),
    meta: z
        .object({
            minDistanceKm: z.number().optional().meta({
                description:
                    'Distance in kilometers two sessions must differ by',
                example: 500,
            }),
            maxDeltaInMs: z.number().optional().meta({
                description: 'Milliseconds allowed between the two sessions',
                example: 3600000,
            }),
            minUniqueAccounts: z.number().optional().meta({
                description: 'Distinct accounts an address must touch',
                example: 5,
            }),
            nearLockoutMinAttempt: z.number().optional().meta({
                description: 'Failed attempts counted as near lockout',
                example: 3,
            }),
            bucketCount: z
                .number()
                .optional()
                .meta({
                    description: 'Buckets the detector scored',
                    example: faker.number.int({ min: 0, max: 100 }),
                }),
            avg: z
                .number()
                .optional()
                .meta({
                    description: 'Mean of the scored buckets',
                    example: faker.number.float({
                        min: 0,
                        max: 100,
                        fractionDigits: 2,
                    }),
                }),
            stdDev: z
                .number()
                .optional()
                .meta({
                    description: 'Standard deviation of the scored buckets',
                    example: faker.number.float({
                        min: 0,
                        max: 10,
                        fractionDigits: 2,
                    }),
                }),
            zScoreThreshold: z.number().optional().meta({
                description: 'Z-score above which a bucket is flagged',
                example: 3,
            }),
        })
        .optional()
        .meta({
            description: 'Thresholds and statistics the detector applied',
            example: { minDistanceKm: 500, maxDeltaInMs: 3600000 },
        }),
});

/**
 * Anomaly detector result with the thresholds it applied.
 * @public
 */
export type AnalyticAnomalySummaryResponseDto = z.infer<
    typeof AnalyticAnomalySummaryResponseSchema
>;
