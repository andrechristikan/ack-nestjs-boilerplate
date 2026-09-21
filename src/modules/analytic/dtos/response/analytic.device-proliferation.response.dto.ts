import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one user holding an outlying number of devices.
 * @public
 */
export const AnalyticDeviceProliferationResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the user holding the devices',
        example: faker.database.mongodbObjectId(),
    }),
    deviceCount: z.number().meta({
        description: 'Number of devices owned by the user',
        example: faker.number.int({ min: 0, max: 100 }),
    }),
    zScore: z.number().meta({
        description: 'Standard deviations the device count sits above the mean',
        example: faker.number.float({ min: 0, max: 10 }),
    }),
});

/**
 * One user holding an outlying number of devices.
 * @public
 */
export type AnalyticDeviceProliferationResponseDto = z.infer<
    typeof AnalyticDeviceProliferationResponseSchema
>;
