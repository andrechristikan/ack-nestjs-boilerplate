import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticSessionDeviceRatioResponseSchema = z.object({
    sessions: z.number().meta({
        description: 'Sessions measured',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    devices: z.number().meta({
        description: 'Devices measured',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    ratio: z.number().meta({
        description: 'Sessions divided by devices',
        example: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
    }),
});

/** @public */
export type AnalyticSessionDeviceRatioResponseDto = z.infer<
    typeof AnalyticSessionDeviceRatioResponseSchema
>;
