import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes the email and mobile verification funnels of a window.
 * @public
 */
export const AnalyticVerificationFunnelResponseSchema = z.object({
    email: z
        .object({
            used: z.number().meta({
                description: 'Verification tokens used',
                example: faker.number.int({ min: 0, max: 500 }),
            }),
            unused: z.number().meta({
                description: 'Verification tokens never used',
                example: faker.number.int({ min: 0, max: 500 }),
            }),
            total: z.number().meta({
                description: 'Verification tokens issued',
                example: faker.number.int({ min: 0, max: 1000 }),
            }),
            rate: z.number().meta({
                description: 'Used divided by total, between 0 and 1',
                example: faker.number.float({
                    min: 0,
                    max: 1,
                    fractionDigits: 2,
                }),
            }),
        })
        .meta({
            description: 'Email verification funnel of the window',
            example: { used: 80, unused: 20, total: 100, rate: 0.8 },
        }),
    mobile: z
        .object({
            used: z.number().meta({
                description: 'Verification tokens used',
                example: faker.number.int({ min: 0, max: 500 }),
            }),
            unused: z.number().meta({
                description: 'Verification tokens never used',
                example: faker.number.int({ min: 0, max: 500 }),
            }),
            total: z.number().meta({
                description: 'Verification tokens issued',
                example: faker.number.int({ min: 0, max: 1000 }),
            }),
            rate: z.number().meta({
                description: 'Used divided by total, between 0 and 1',
                example: faker.number.float({
                    min: 0,
                    max: 1,
                    fractionDigits: 2,
                }),
            }),
        })
        .meta({
            description: 'Mobile verification funnel of the window',
            example: { used: 40, unused: 60, total: 100, rate: 0.4 },
        }),
});

/**
 * Email and mobile verification funnels of a window.
 * @public
 */
export type AnalyticVerificationFunnelResponseDto = z.infer<
    typeof AnalyticVerificationFunnelResponseSchema
>;
