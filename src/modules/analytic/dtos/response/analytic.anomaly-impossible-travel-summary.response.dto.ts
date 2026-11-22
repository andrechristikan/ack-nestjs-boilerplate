import { z } from 'zod';
import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';

/** @public */
export const AnalyticAnomalyImpossibleTravelSummaryResponseSchema =
    AnalyticAnomalySummaryResponseSchema.extend({
        meta: z
            .object({
                minDistanceKm: z.number().meta({
                    description:
                        'Distance in kilometers two sessions must differ by',
                    example: 500,
                }),
                maxDeltaInMs: z.number().meta({
                    description:
                        'Milliseconds allowed between the two sessions',
                    example: 3600000,
                }),
            })
            .meta({
                description: 'Thresholds the detector applied',
                example: { minDistanceKm: 500, maxDeltaInMs: 3600000 },
            }),
    });

/** @public */
export type AnalyticAnomalyImpossibleTravelSummaryResponseDto = z.infer<
    typeof AnalyticAnomalyImpossibleTravelSummaryResponseSchema
>;
