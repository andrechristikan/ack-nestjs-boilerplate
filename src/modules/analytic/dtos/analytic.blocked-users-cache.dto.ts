import { z } from 'zod';
import type { IAnalyticBlockedUsers } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticBlockedUsersCacheSchema = z.object({
    trend: z.number(),
    current: z.number(),
}) satisfies z.ZodType<IAnalyticBlockedUsers>;

/** @public */
export type AnalyticBlockedUsersCacheDto = z.infer<
    typeof AnalyticBlockedUsersCacheSchema
>;
