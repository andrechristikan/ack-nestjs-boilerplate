import { z } from 'zod';
import type { IAnalyticVerificationFunnels } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticVerificationFunnelCacheSchema } from '@modules/analytic/dtos/analytic.verification-funnel-cache.dto';

/** @public */
export const AnalyticVerificationFunnelsCacheSchema = z.object({
    email: AnalyticVerificationFunnelCacheSchema,
    mobile: AnalyticVerificationFunnelCacheSchema,
}) satisfies z.ZodType<IAnalyticVerificationFunnels>;

/** @public */
export type AnalyticVerificationFunnelsCacheDto = z.infer<
    typeof AnalyticVerificationFunnelsCacheSchema
>;
