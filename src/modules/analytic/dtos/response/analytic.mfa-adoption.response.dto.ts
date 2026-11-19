import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticMfaAdoptionResponseSchema = z.object({
    enabled: z.number().meta({
        description: 'Users with mfa authentication enabled',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    total: z.number().meta({
        description: 'Users measured',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    rate: z.number().meta({
        description: 'Enabled divided by total, as a percentage between 0-100',
        example: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    }),
    computedAt: z.date().nullable().meta({
        description:
            'When the stored result was computed, null before the first run',
        example: faker.date.recent(),
    }),
});

/** @public */
export type AnalyticMfaAdoptionResponseDto = z.infer<
    typeof AnalyticMfaAdoptionResponseSchema
>;
