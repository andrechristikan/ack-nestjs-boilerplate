import { z } from 'zod';
import type { IAnalyticApiKeyActiveExpired } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticApiKeyActiveExpiredCacheSchema = z.object({
    active: z.number(),
    expired: z.number(),
    inactive: z.number(),
}) satisfies z.ZodType<IAnalyticApiKeyActiveExpired>;

/** @public */
export type AnalyticApiKeyActiveExpiredCacheDto = z.infer<
    typeof AnalyticApiKeyActiveExpiredCacheSchema
>;
