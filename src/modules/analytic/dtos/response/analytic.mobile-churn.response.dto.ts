import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes the added, updated and deleted mobile numbers of a window.
 * @public
 */
export const AnalyticMobileChurnResponseSchema = z.object({
    added: z.number().meta({
        description: 'Mobile numbers added inside the window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    updated: z.number().meta({
        description: 'Mobile numbers updated inside the window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    deleted: z.number().meta({
        description: 'Mobile numbers deleted inside the window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
});

/**
 * Added, updated and deleted mobile numbers of a window.
 * @public
 */
export type AnalyticMobileChurnResponseDto = z.infer<
    typeof AnalyticMobileChurnResponseSchema
>;
