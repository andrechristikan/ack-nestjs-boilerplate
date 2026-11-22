import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const ApiKeyDateRequestSchema = z.strictObject({
    startAt: z.coerce.date().meta({
        description: 'Api Key start date',
        example: faker.date.recent(),
    }),
    endAt: z.coerce.date().meta({
        description: 'Api Key end date',
        example: faker.date.recent(),
    }),
});

/** @public */
export type ApiKeyDateRequestDto = z.infer<typeof ApiKeyDateRequestSchema>;
