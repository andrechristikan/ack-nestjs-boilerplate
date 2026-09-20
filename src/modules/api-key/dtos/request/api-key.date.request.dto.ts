import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * The two api-key validity dates without the cross-field rule, so a derived request can relax them.
 * @public
 */
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

/**
 * Api key validity dates without the cross-field rule.
 * @public
 */
export type ApiKeyDateRequestDto = z.infer<typeof ApiKeyDateRequestSchema>;
