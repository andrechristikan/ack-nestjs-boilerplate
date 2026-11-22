import { z } from 'zod';
import type { IAnalyticVerificationFunnel } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticVerificationFunnelCacheSchema = z.object({
    used: z.number(),
    unused: z.number(),
    total: z.number(),
    rate: z.number(),
}) satisfies z.ZodType<IAnalyticVerificationFunnel>;

/** @public */
export type AnalyticVerificationFunnelCacheDto = z.infer<
    typeof AnalyticVerificationFunnelCacheSchema
>;
