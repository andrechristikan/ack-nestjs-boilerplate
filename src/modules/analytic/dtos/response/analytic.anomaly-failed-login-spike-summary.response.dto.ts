import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';

/**
 * Shapes the failed login spike result: the count, its window, and the thresholds and statistics used.
 * @public
 */
export const AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema =
    AnalyticAnomalySummaryResponseSchema.extend({
        meta: z
            .object({
                nearLockoutMinAttempt: z.number().meta({
                    description: 'Failed attempts counted as near lockout',
                    example: 3,
                }),
                bucketCount: z.number().meta({
                    description: 'Buckets the detector scored',
                    example: faker.number.int({ min: 0, max: 100 }),
                }),
            })
            .meta({
                description: 'Thresholds and statistics the detector applied',
                example: { nearLockoutMinAttempt: 3, bucketCount: 4 },
            }),
    });

/**
 * Failed login spike result with the thresholds and statistics it applied.
 * @public
 */
export type AnalyticAnomalyFailedLoginSpikeSummaryResponseDto = z.infer<
    typeof AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema
>;
