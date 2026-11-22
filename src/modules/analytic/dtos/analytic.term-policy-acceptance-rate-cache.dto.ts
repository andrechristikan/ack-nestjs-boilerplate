import { z } from 'zod';
import type { IAnalyticTermPolicyAcceptanceRate } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticTermPolicyAcceptanceRateCacheSchema = z.object({
    acceptances: z.number(),
    users: z.number(),
    published: z.number(),
    rate: z.number(),
}) satisfies z.ZodType<IAnalyticTermPolicyAcceptanceRate>;

/** @public */
export type AnalyticTermPolicyAcceptanceRateCacheDto = z.infer<
    typeof AnalyticTermPolicyAcceptanceRateCacheSchema
>;
