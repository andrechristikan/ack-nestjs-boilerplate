import { z } from 'zod';
import { faker } from '@faker-js/faker';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';

/**
 * Shapes one user fraud risk score with its band and signals.
 * @public
 */
export const AnalyticFraudRiskScoreResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the scored user',
        example: faker.database.mongodbObjectId(),
    }),
    score: z.number().meta({
        description: 'Weighted fraud score of the user',
        example: faker.number.int({ min: 0, max: 100 }),
    }),
    band: z.enum(EnumAnalyticFraudBand).meta({
        description: 'Band the score falls into',
        example: EnumAnalyticFraudBand.review,
    }),
    contributingSignalCodes: z
        .array(z.enum(EnumAnalyticFraudContributingSignal))
        .meta({
            description: 'Signal codes that contributed to the score',
            example: [
                EnumAnalyticFraudContributingSignal.nearLockout,
                EnumAnalyticFraudContributingSignal.sharedFingerprint,
            ],
        }),
});

/**
 * Fraud risk score of one user.
 * @public
 */
export type AnalyticFraudRiskScoreResponseDto = z.infer<
    typeof AnalyticFraudRiskScoreResponseSchema
>;
