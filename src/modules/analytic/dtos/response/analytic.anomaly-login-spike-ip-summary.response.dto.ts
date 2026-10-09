import { z } from 'zod';
import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';

/**
 * Shapes the login spike by IP result: the count, its window, and the threshold used.
 * @public
 */
export const AnalyticAnomalyLoginSpikeIpSummaryResponseSchema =
    AnalyticAnomalySummaryResponseSchema.extend({
        meta: z
            .object({
                minUniqueAccounts: z.number().meta({
                    description: 'Distinct accounts an address must touch',
                    example: 5,
                }),
            })
            .meta({
                description: 'Thresholds the detector applied',
                example: { minUniqueAccounts: 5 },
            }),
    });

/**
 * Login spike by IP result with the threshold it applied.
 * @public
 */
export type AnalyticAnomalyLoginSpikeIpSummaryResponseDto = z.infer<
    typeof AnalyticAnomalyLoginSpikeIpSummaryResponseSchema
>;
