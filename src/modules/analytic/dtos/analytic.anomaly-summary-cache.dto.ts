import { z } from 'zod';
import type { IAnalyticAnomalySummary } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticAnomalySummaryCacheSchema = z.object({
    count: z.number(),
    windowStart: z.coerce.date().nullable(),
    windowEnd: z.coerce.date().nullable(),
    computedAt: z.coerce.date().nullable(),
}) satisfies z.ZodType<IAnalyticAnomalySummary>;

/** @public */
export type AnalyticAnomalySummaryCacheDto = z.infer<
    typeof AnalyticAnomalySummaryCacheSchema
>;
