import { z } from 'zod';
import type { IAnalyticApiKeyActiveExpired } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticApiKeyActiveExpiredPipelineSchema = z.array(
    z.object({
        active: z.number(),
        expired: z.number(),
        inactive: z.number(),
    })
) satisfies z.ZodType<IAnalyticApiKeyActiveExpired[]>;

/** @public */
export type AnalyticApiKeyActiveExpiredPipelineDto = z.infer<
    typeof AnalyticApiKeyActiveExpiredPipelineSchema
>;
