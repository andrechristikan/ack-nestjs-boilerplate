import { z } from 'zod';
import type { IAnalyticFraudCredentialStuffingSummary } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticFraudSummaryCacheSchema } from '@modules/analytic/dtos/analytic.fraud-summary-cache.dto';

/** @public */
export const AnalyticFraudCredentialStuffingSummaryCacheSchema =
    AnalyticFraudSummaryCacheSchema.extend({
        metadata: z.object({
            minUniqueAccounts: z.number(),
        }),
    }) satisfies z.ZodType<IAnalyticFraudCredentialStuffingSummary>;

/** @public */
export type AnalyticFraudCredentialStuffingSummaryCacheDto = z.infer<
    typeof AnalyticFraudCredentialStuffingSummaryCacheSchema
>;
