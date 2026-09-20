import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes a fraud detector result: the count, its window, and the thresholds used.
 * @public
 */
export const AnalyticFraudSummaryResponseSchema = z.object({
    count: z.number().meta({
        description: 'Rows the detector flagged',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    window: z.string().optional().meta({
        description: 'Window the detector scanned',
        example: '3600000',
    }),
    meta: z
        .object({
            minUniqueAccounts: z.number().optional().meta({
                description: 'Distinct accounts an address must touch',
                example: 5,
            }),
        })
        .optional()
        .meta({
            description: 'Thresholds the detector applied',
            example: { minUniqueAccounts: 5 },
        }),
});

/**
 * Fraud detector result with the thresholds it applied.
 * @public
 */
export type AnalyticFraudSummaryResponseDto = z.infer<
    typeof AnalyticFraudSummaryResponseSchema
>;
