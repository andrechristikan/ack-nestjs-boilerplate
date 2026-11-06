import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { ApiKeyCreateBaseRequestSchema } from '@modules/api-key/dtos/request/api-key.create-base.request.dto';

/** @public */
export const ApiKeyCreateRawRequestSchema = ApiKeyCreateBaseRequestSchema.omit({
    startAt: true,
    endAt: true,
}).extend({
    key: z
        .string()
        .min(1)
        .max(50)
        .meta({
            description: 'Public key of the API key',
            example: faker.string.alphanumeric(10),
        }),
    secret: z
        .string()
        .min(1)
        .max(100)
        .meta({
            description: 'Secret of the API key',
            example: faker.string.alphanumeric(20),
        }),
});

/** @public */
export type ApiKeyCreateRawRequestDto = z.infer<
    typeof ApiKeyCreateRawRequestSchema
>;
