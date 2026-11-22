import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticApiKeyLifecycleResponseSchema = z.object({
    created: z.number().meta({
        description: 'API keys created inside the window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    reset: z.number().meta({
        description: 'API keys reset inside the window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    updated: z.number().meta({
        description: 'API keys updated inside the window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    deleted: z.number().meta({
        description: 'API keys deleted inside the window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
});

/** @public */
export type AnalyticApiKeyLifecycleResponseDto = z.infer<
    typeof AnalyticApiKeyLifecycleResponseSchema
>;
