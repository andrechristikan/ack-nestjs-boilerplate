import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';

/**
 * Shapes the device proliferation result: the count, its window, and the threshold and statistics used.
 * @public
 */
export const AnalyticAnomalyDeviceProliferationSummaryResponseSchema =
    AnalyticAnomalySummaryResponseSchema.extend({
        meta: z
            .object({
                avg: z.number().meta({
                    description: 'Mean of the scored buckets',
                    example: faker.number.float({
                        min: 0,
                        max: 100,
                        fractionDigits: 2,
                    }),
                }),
                stdDev: z.number().meta({
                    description: 'Standard deviation of the scored buckets',
                    example: faker.number.float({
                        min: 0,
                        max: 10,
                        fractionDigits: 2,
                    }),
                }),
                zScoreThreshold: z.number().meta({
                    description: 'Z-score above which a bucket is flagged',
                    example: 3,
                }),
            })
            .meta({
                description: 'Thresholds and statistics the detector applied',
                example: { avg: 2.5, stdDev: 0.5, zScoreThreshold: 3 },
            }),
    });

/**
 * Device proliferation result with the threshold and statistics it applied.
 * @public
 */
export type AnalyticAnomalyDeviceProliferationSummaryResponseDto = z.infer<
    typeof AnalyticAnomalyDeviceProliferationSummaryResponseSchema
>;
