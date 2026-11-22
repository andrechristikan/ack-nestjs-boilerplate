import { z } from 'zod';
import type { IAnalyticRoleCount } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticRoleCountsCacheSchema = z.array(
    z.object({
        role: z.string(),
        count: z.number(),
    }) satisfies z.ZodType<IAnalyticRoleCount>
);

/** @public */
export type AnalyticRoleCountsCacheDto = z.infer<
    typeof AnalyticRoleCountsCacheSchema
>;
