import { z } from 'zod';
import { faker } from '@faker-js/faker';

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
    band: z.string().meta({
        description: 'Band the score falls into',
        example: 'medium',
    }),
    contributingSignalCodes: z.array(z.string()).meta({
        description: 'Signal codes that contributed to the score',
        example: ['credentialStuffing', 'sharedFingerprint'],
    }),
});

/**
 * Fraud risk score of one user.
 * @public
 */
export type AnalyticFraudRiskScoreResponseDto = z.infer<
    typeof AnalyticFraudRiskScoreResponseSchema
>;
