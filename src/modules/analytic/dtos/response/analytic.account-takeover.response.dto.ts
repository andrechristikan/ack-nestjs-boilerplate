import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one account takeover detection with the indicators that raised it.
 * @public
 */
export const AnalyticAccountTakeoverResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the taken over user',
        example: faker.database.mongodbObjectId(),
    }),
    indicatorCodes: z.array(z.string()).meta({
        description: 'Indicator codes that raised the detection',
        example: ['passwordChanged', 'newDevice'],
    }),
    passwordChangedAt: z.date().meta({
        description: 'When the password of the user was changed',
        example: faker.date.recent(),
    }),
});

/**
 * One account takeover detection with the indicators that raised it.
 * @public
 */
export type AnalyticAccountTakeoverResponseDto = z.infer<
    typeof AnalyticAccountTakeoverResponseSchema
>;
