import { z } from 'zod';
import type { IAnalyticTermPolicyAcceptanceCount } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticTermPolicyAcceptancePipelineSchema = z.array(
    z.object({
        published: z.number(),
        acceptances: z.number(),
        users: z.number(),
    })
) satisfies z.ZodType<IAnalyticTermPolicyAcceptanceCount[]>;

/** @public */
export type AnalyticTermPolicyAcceptancePipelineDto = z.infer<
    typeof AnalyticTermPolicyAcceptancePipelineSchema
>;
