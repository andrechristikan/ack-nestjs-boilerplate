import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticActiveUsersResponseSchema = z.object({
    daily: z.number().meta({
        description:
            'Live users who signed in or refreshed within the last day',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    weekly: z.number().meta({
        description:
            'Live users who signed in or refreshed within the last 7 days',
        example: faker.number.int({ min: 0, max: 2000 }),
    }),
    monthly: z.number().meta({
        description:
            'Live users who signed in or refreshed within the last 30 days',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    windowEnd: z.date().meta({
        description: 'End of every window, the moment the counts were read',
        example: faker.date.recent(),
    }),
    computedAt: z.date().nullable().meta({
        description: 'Always null: the counts are read on request',
        example: null,
    }),
});

/** @public */
export type AnalyticActiveUsersResponseDto = z.infer<
    typeof AnalyticActiveUsersResponseSchema
>;
