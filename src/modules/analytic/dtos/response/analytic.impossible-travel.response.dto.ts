import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one impossible travel detection between two sessions of a user.
 * @public
 */
export const AnalyticImpossibleTravelResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the user who moved',
        example: faker.string.uuid(),
    }),
    fromSessionId: z.string().meta({
        description: 'Identifier of the session the travel started from',
        example: faker.string.uuid(),
    }),
    toSessionId: z.string().meta({
        description: 'Identifier of the session the travel ended at',
        example: faker.string.uuid(),
    }),
    distanceKm: z.number().meta({
        description: 'Distance between the two sessions in kilometers',
        example: faker.number.float({ min: 0, max: 20000 }),
    }),
    deltaMs: z.number().meta({
        description: 'Elapsed time between the two sessions in milliseconds',
        example: faker.number.int({ min: 0, max: 3600000 }),
    }),
});

/**
 * One impossible travel detection between two sessions of a user.
 * @public
 */
export type AnalyticImpossibleTravelResponseDto = z.infer<
    typeof AnalyticImpossibleTravelResponseSchema
>;
