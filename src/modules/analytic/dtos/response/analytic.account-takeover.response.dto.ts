import { EnumAnalyticFraudContributingSignal } from '@modules/analytic/enums/analytic.enum';
import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticAccountTakeoverResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the taken over user',
        example: faker.string.uuid(),
    }),
    indicatorCodes: z.array(z.enum(EnumAnalyticFraudContributingSignal)).meta({
        description: 'Indicator codes that raised the detection',
        example: [
            EnumAnalyticFraudContributingSignal.newDeviceAfterPasswordChange,
            EnumAnalyticFraudContributingSignal.nearLockout,
        ],
    }),
    passwordChangedAt: z.date().meta({
        description: 'When the password of the user was changed',
        example: faker.date.recent(),
    }),
});

/** @public */
export type AnalyticAccountTakeoverResponseDto = z.infer<
    typeof AnalyticAccountTakeoverResponseSchema
>;
