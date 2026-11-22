import { z } from 'zod';
import type { IAnalyticActiveUsersCount } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticUserActivePipelineSchema = z.array(
    z.object({
        daily: z.number(),
        weekly: z.number(),
        monthly: z.number(),
    })
) satisfies z.ZodType<IAnalyticActiveUsersCount[]>;

/** @public */
export type AnalyticUserActivePipelineDto = z.infer<
    typeof AnalyticUserActivePipelineSchema
>;
