import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * The two api-key validity dates without the cross-field rule, so a derived request can relax them.
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

export const ApiKeyUpdateDateRequestSchema =
    ApiKeyDateRequestSchema.superRefine(({ startAt, endAt }, ctx) => {
        if (endAt < startAt) {
            ctx.addIssue({
                code: 'custom',
                path: ['endAt'],
                message: 'request.error.greaterThanEqualOtherProperty.invalid',
            });
        }
    });

export type ApiKeyUpdateDateRequestDto = z.infer<
    typeof ApiKeyUpdateDateRequestSchema
>;
