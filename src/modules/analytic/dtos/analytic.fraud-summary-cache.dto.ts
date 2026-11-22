import { z } from 'zod';
import type { IAnalyticFraudSummary } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticFraudSummaryCacheSchema = z.object({
    count: z.number(),
    windowStart: z.coerce.date().nullable(),
    windowEnd: z.coerce.date().nullable(),
    computedAt: z.coerce.date().nullable(),
}) satisfies z.ZodType<IAnalyticFraudSummary>;

/** @public */
export type AnalyticFraudSummaryCacheDto = z.infer<
    typeof AnalyticFraudSummaryCacheSchema
>;
