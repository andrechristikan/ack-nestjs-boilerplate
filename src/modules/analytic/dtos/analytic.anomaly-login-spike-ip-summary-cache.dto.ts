import { z } from 'zod';
import type { IAnalyticAnomalyLoginSpikeIpSummary } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticAnomalySummaryCacheSchema } from '@modules/analytic/dtos/analytic.anomaly-summary-cache.dto';

/** @public */
export const AnalyticAnomalyLoginSpikeIpSummaryCacheSchema =
    AnalyticAnomalySummaryCacheSchema.extend({
        metadata: z.object({
            minUniqueAccounts: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticAnomalyLoginSpikeIpSummary>;

/** @public */
export type AnalyticAnomalyLoginSpikeIpSummaryCacheDto = z.infer<
    typeof AnalyticAnomalyLoginSpikeIpSummaryCacheSchema
>;
