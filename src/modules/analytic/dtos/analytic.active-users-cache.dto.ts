import { z } from 'zod';
import type { IAnalyticActiveUsers } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticActiveUsersCacheSchema = z.object({
    daily: z.number(),
    weekly: z.number(),
    monthly: z.number(),
    windowEnd: z.coerce.date(),
    computedAt: z.coerce.date().nullable(),
}) satisfies z.ZodType<IAnalyticActiveUsers>;

/** @public */
export type AnalyticActiveUsersCacheDto = z.infer<
    typeof AnalyticActiveUsersCacheSchema
>;
