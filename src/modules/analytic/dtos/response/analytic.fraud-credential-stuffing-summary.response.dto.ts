import { z } from 'zod';
import { AnalyticFraudSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-summary.response.dto';

/**
 * Shapes the credential stuffing result: the count, its window, and the threshold used.
 * @public
 */
export const AnalyticFraudCredentialStuffingSummaryResponseSchema =
    AnalyticFraudSummaryResponseSchema.extend({
        meta: z
            .object({
                minUniqueAccounts: z.number().meta({
                    description: 'Distinct accounts an address must touch',
                    example: 5,
                }),
            })
            .meta({
                description: 'Thresholds the detector applied',
                example: { minUniqueAccounts: 5 },
            }),
    });

/**
 * Credential stuffing result with the threshold it applied.
 * @public
 */
export type AnalyticFraudCredentialStuffingSummaryResponseDto = z.infer<
    typeof AnalyticFraudCredentialStuffingSummaryResponseSchema
>;
