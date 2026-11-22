import { z } from 'zod';
import type { IAnalyticAnomalyFailedLoginSpikeSummary } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticAnomalySummaryCacheSchema } from '@modules/analytic/dtos/analytic.anomaly-summary-cache.dto';

/** @public */
export const AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema =
    AnalyticAnomalySummaryCacheSchema.extend({
        metadata: z.object({
            nearLockoutMinAttempt: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticAnomalyFailedLoginSpikeSummary>;

/** @public */
export type AnalyticAnomalyFailedLoginSpikeSummaryCacheDto = z.infer<
    typeof AnalyticAnomalyFailedLoginSpikeSummaryCacheSchema
>;
