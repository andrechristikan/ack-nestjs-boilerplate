import { z } from 'zod';
import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';

/** @public */
export const AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema =
    AnalyticAnomalySummaryResponseSchema.extend({
        metadata: z
            .object({
                nearLockoutMinAttempt: z.number().meta({
                    description: 'Failed attempts counted as near lockout',
                    example: 3,
                }),
            })
            .meta({
                description: 'Threshold the detector applied',
                example: { nearLockoutMinAttempt: 3 },
            }),
    });

/** @public */
export type AnalyticAnomalyFailedLoginSpikeSummaryResponseDto = z.infer<
    typeof AnalyticAnomalyFailedLoginSpikeSummaryResponseSchema
>;
