import { faker } from '@faker-js/faker';
import { AnalyticFraudRiskScoreResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-risk-score.response.dto';
import { z } from 'zod';

/** @public */
export const AnalyticFraudRiskScoreUserResponseSchema =
    AnalyticFraudRiskScoreResponseSchema.extend({
        computedAt: z.date().nullable().meta({
            description:
                'When the risk score job last ran; null before the first run',
            example: faker.date.recent(),
        }),
    });

/** @public */
export type AnalyticFraudRiskScoreUserResponseDto = z.infer<
    typeof AnalyticFraudRiskScoreUserResponseSchema
>;
