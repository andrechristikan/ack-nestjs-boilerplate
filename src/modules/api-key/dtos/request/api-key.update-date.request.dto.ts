import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const ApiKeyUpdateDateRequestSchema = z
    .strictObject({
        startAt: z.coerce.date().nullable().meta({
            description: 'Api Key start date, null clears both dates',
            example: faker.date.recent(),
        }),
        endAt: z.coerce.date().nullable().meta({
            description: 'Api Key end date, null clears both dates',
            example: faker.date.recent(),
        }),
    })
    .superRefine(({ startAt, endAt }, ctx) => {
        if ((startAt === null) !== (endAt === null)) {
            ctx.addIssue({
                code: 'custom',
                path: ['endAt'],
                message: 'request.error.requiredWithOtherProperty.invalid',
            });
            return;
        }

        if (startAt !== null && endAt !== null && endAt < startAt) {
            ctx.addIssue({
                code: 'custom',
                path: ['endAt'],
                message: 'request.error.greaterThanEqualOtherProperty.invalid',
            });
        }
    });

/** @public */
export type ApiKeyUpdateDateRequestDto = z.infer<
    typeof ApiKeyUpdateDateRequestSchema
>;
