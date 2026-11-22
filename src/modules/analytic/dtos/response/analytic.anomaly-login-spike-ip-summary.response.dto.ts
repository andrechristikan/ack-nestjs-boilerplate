import { z } from 'zod';
import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';

/** @public */
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

/** @public */
export type AnalyticAnomalyLoginSpikeIpSummaryResponseDto = z.infer<
    typeof AnalyticAnomalyLoginSpikeIpSummaryResponseSchema
>;
