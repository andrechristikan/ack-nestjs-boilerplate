import { z } from 'zod';
import type { IAnalyticForgotPasswordConversion } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticForgotPasswordConversionCacheSchema = z.object({
    created: z.number(),
    used: z.number(),
    rate: z.number(),
}) satisfies z.ZodType<IAnalyticForgotPasswordConversion>;

/** @public */
export type AnalyticForgotPasswordConversionCacheDto = z.infer<
    typeof AnalyticForgotPasswordConversionCacheSchema
>;
